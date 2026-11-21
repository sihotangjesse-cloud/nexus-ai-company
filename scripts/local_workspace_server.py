#!/usr/bin/env python3
"""Loopback-only NEXUS local workspace bridge.

The bridge provides bounded text-file listing/reading, approval-gated writes,
and syntax-only checks. It never executes project files or shell commands.
"""
from __future__ import annotations

import argparse
import ast
import hashlib
import json
import os
import shutil
import subprocess
import tempfile
import threading
import time
import uuid
from html.parser import HTMLParser
from urllib.parse import urlencode, parse_qs, urlparse
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path, PurePosixPath
from urllib.parse import parse_qs, urlsplit

MAX_FILE_BYTES = 512 * 1024
MAX_WRITE_BYTES = 256 * 1024
MAX_LIST_ENTRIES = 200
PROPOSAL_TTL_SECONDS = 15 * 60
ALLOWED_EXTENSIONS = {
    ".html", ".htm", ".css", ".js", ".mjs", ".cjs", ".json", ".md",
    ".txt", ".py", ".sh", ".yml", ".yaml", ".toml", ".xml", ".svg", ".csv",
}
CHECKABLE_EXTENSIONS = {".py", ".js", ".mjs", ".cjs", ".json"}
BLOCKED_NAMES = {
    ".git", "node_modules", ".env", ".venv", "venv", "__pycache__",
    ".ssh", ".gnupg", ".aws", ".config", ".npm", ".cache",
}
JSON_CONTENT_TYPE = "application/json; charset=utf-8"

class SearchResultParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.results = []
        self.current = None
        self.capture = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = set((attrs.get("class") or "").split())
        if tag == "a" and "result__a" in classes:
            self.current = {"title": "", "url": attrs.get("href", ""), "snippet": ""}
            self.capture = "title"
        elif self.current and "result__snippet" in classes:
            self.capture = "snippet"

    def handle_data(self, data):
        if self.current and self.capture:
            key = self.capture
            self.current[key] = (self.current.get(key, "") + data).strip()[:700]

    def handle_endtag(self, tag):
        if self.current and self.capture == "title" and tag == "a":
            self.capture = None
        elif self.current and self.capture == "snippet" and tag in ("div", "td"):
            self.capture = None
        if self.current and self.current.get("title") and self.current.get("url"):
            self.results.append(self.current)
            self.current = None
            self.capture = None


def search_web(query: str) -> list[dict]:
    query = " ".join(query.split()) if isinstance(query, str) else ""
    if len(query) < 2 or len(query) > 200:
        raise WorkspaceError("Kata kunci harus berisi 2–200 karakter.")
    url = "https://html.duckduckgo.com/html/?" + urlencode({"q": query})
    request = Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; NEXUS-Personal/1.10)", "Accept": "text/html"})
    try:
        with urlopen(request, timeout=10) as response:
            raw = response.read(1024 * 1024 + 1)
    except (URLError, HTTPError, TimeoutError, OSError) as exc:
        raise WorkspaceError("Pencarian web gagal. Periksa koneksi internet atau coba lagi.", 502) from exc
    if len(raw) > 1024 * 1024:
        raise WorkspaceError("Respons mesin pencari terlalu besar.", 502)
    parser = SearchResultParser()
    parser.feed(raw.decode("utf-8", errors="replace"))
    results = []
    for item in parser.results:
        target = item["url"]
        parsed = urlparse(target)
        if parsed.netloc.endswith("duckduckgo.com") and parsed.path.startswith("/l/"):
            target = parse_qs(parsed.query).get("uddg", [""])[0]
            parsed = urlparse(target)
        if parsed.scheme != "https" or not parsed.netloc or parsed.netloc.endswith("duckduckgo.com"):
            continue
        results.append({"title": item["title"][:180], "url": target[:1000], "snippet": item["snippet"][:500]})
        if len(results) == 5:
            break
    return results



class WorkspaceError(Exception):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def choose_workspace(explicit: str | None = None) -> Path:
    if explicit:
        root = Path(explicit).expanduser()
    else:
        shared = Path.home() / "storage" / "shared"
        root = (shared / "NEXUS-Workspace") if shared.is_dir() else (Path.home() / "NEXUS-Workspace")
    root.mkdir(parents=True, exist_ok=True)
    return root.resolve()


class LocalWorkspaceHandler(SimpleHTTPRequestHandler):
    server_version = "NEXUSLocalWorkspace/1.7"
    protocol_version = "HTTP/1.1"

    def __init__(self, *args, directory: str | None = None, **kwargs):
        super().__init__(*args, directory=directory, **kwargs)

    @property
    def workspace_root(self) -> Path:
        return self.server.workspace_root

    def log_message(self, fmt: str, *args) -> None:
        # Keep local filenames and request parameters out of the terminal log.
        if self.path.startswith("/__nexus/"):
            print("NEXUS local workspace API request")

    def end_headers(self) -> None:
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "same-origin")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def _host_allowed(self) -> bool:
        port = self.server.server_port
        return self.headers.get("Host", "").lower() in {
            "127.0.0.1:" + str(port),
            "localhost:" + str(port),
        }

    def _send_json(self, status: int, payload: dict) -> None:
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", JSON_CONTENT_TYPE)
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def _read_json(self) -> dict:
        if self.headers.get("Content-Type", "").split(";")[0].strip().lower() != "application/json":
            raise WorkspaceError("Content-Type harus application/json.")
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError as exc:
            raise WorkspaceError("Content-Length tidak valid.") from exc
        if length < 2 or length > MAX_WRITE_BYTES + 4096:
            raise WorkspaceError("Ukuran permintaan tidak valid atau terlalu besar.")
        try:
            body = self.rfile.read(length)
            data = json.loads(body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise WorkspaceError("JSON permintaan tidak valid.") from exc
        if not isinstance(data, dict):
            raise WorkspaceError("Isi permintaan harus berupa objek JSON.")
        return data

    def _safe_path(self, raw: str, *, must_exist: bool, directory: bool = False) -> Path:
        if not isinstance(raw, str) or len(raw) > 240 or "\\" in raw or raw.startswith("/"):
            raise WorkspaceError("Path harus relatif terhadap folder workspace.")
        if raw in ("", "."):
            candidate = self.workspace_root
        else:
            relative = PurePosixPath(raw)
            parts = relative.parts
            if not parts or any(part in ("", ".", "..") for part in parts):
                raise WorkspaceError("Path tidak valid.")
            for part in parts:
                if part.startswith(".") or part.lower() in BLOCKED_NAMES:
                    raise WorkspaceError("Folder atau file tersembunyi/sensitif tidak dapat diakses.")
            candidate = self.workspace_root.joinpath(*parts)

        root = self.workspace_root.resolve()
        current = root
        try:
            for part in candidate.relative_to(root).parts:
                current = current / part
                if current.is_symlink():
                    raise WorkspaceError("Symbolic link tidak diizinkan di workspace.")
            resolved = candidate.resolve(strict=must_exist)
        except (ValueError, FileNotFoundError) as exc:
            raise WorkspaceError("Path tidak ditemukan di dalam workspace.", 404 if must_exist else 400) from exc
        if not resolved.is_relative_to(root):
            raise WorkspaceError("Path berada di luar workspace.")
        if must_exist and not resolved.exists():
            raise WorkspaceError("File atau folder tidak ditemukan.", 404)
        if directory:
            if must_exist and not resolved.is_dir():
                raise WorkspaceError("Path bukan folder.", 400)
        else:
            if resolved == root:
                raise WorkspaceError("Pilih file di dalam workspace.")
            if resolved.suffix.lower() not in ALLOWED_EXTENSIONS:
                raise WorkspaceError("Ekstensi file belum diizinkan.")
            if must_exist and not resolved.is_file():
                raise WorkspaceError("Path bukan file.", 400)
        return resolved

    def _list_directory(self, raw: str) -> dict:
        folder = self._safe_path(raw, must_exist=True, directory=True)
        entries = []
        try:
            children = sorted(folder.iterdir(), key=lambda item: (not item.is_dir(), item.name.lower()))
        except OSError as exc:
            raise WorkspaceError("Folder tidak dapat dibaca.", 403) from exc
        for item in children:
            if item.name.startswith(".") or item.name.lower() in BLOCKED_NAMES or item.is_symlink():
                continue
            if item.is_dir():
                entries.append({"name": item.name, "path": item.relative_to(self.workspace_root).as_posix(), "kind": "folder"})
            elif item.is_file() and item.suffix.lower() in ALLOWED_EXTENSIONS:
                try:
                    size = item.stat().st_size
                except OSError:
                    continue
                entries.append({"name": item.name, "path": item.relative_to(self.workspace_root).as_posix(), "kind": "file", "size": size})
            if len(entries) >= MAX_LIST_ENTRIES:
                break
        return {"ok": True, "path": "." if folder == self.workspace_root else folder.relative_to(self.workspace_root).as_posix(), "entries": entries}

    def do_GET(self) -> None:
        parsed = urlsplit(self.path)
        if not parsed.path.startswith("/__nexus/"):
            return super().do_GET()
        if not self._host_allowed():
            return self._send_json(403, {"ok": False, "error": "Host lokal tidak diizinkan."})
        try:
            query = parse_qs(parsed.query)
            if parsed.path == "/__nexus/health":
                self._send_json(200, {
                    "ok": True,
                    "service": "NEXUS Local Workspace",
                    "version": "1.7.0",
                    "workspace": self.workspace_root.name,
                    "write_mode": "approval-required",
                    "code_execution": False,
                })
            elif parsed.path == "/__nexus/files":
                raw = query.get("path", ["."])[0]
                self._send_json(200, self._list_directory(raw))
            elif parsed.path == "/__nexus/file":
                raw = query.get("path", [""])[0]
                path = self._safe_path(raw, must_exist=True)
                if path.stat().st_size > MAX_FILE_BYTES:
                    raise WorkspaceError("File terlalu besar untuk dibaca melalui browser (maksimal 512 KB).", 413)
                try:
                    content = path.read_text(encoding="utf-8")
                except UnicodeDecodeError as exc:
                    raise WorkspaceError("Hanya file teks UTF-8 yang dapat dibaca.", 415) from exc
                self._send_json(200, {"ok": True, "path": raw, "content": content})
            elif parsed.path == "/__nexus/search":
                raw = query.get("q", [""])[0]
                now = time.monotonic()
                if now - getattr(self.server, "last_search_at", 0) < 2:
                    raise WorkspaceError("Tunggu sebentar sebelum pencarian berikutnya.", 429)
                self.server.last_search_at = now
                self._send_json(200, {"ok": True, "provider": "DuckDuckGo", "query": " ".join(raw.split()), "results": search_web(raw)})
            else:
                self._send_json(404, {"ok": False, "error": "Endpoint tidak ditemukan."})
        except WorkspaceError as exc:
            self._send_json(exc.status, {"ok": False, "error": str(exc)})

    def do_POST(self) -> None:
        parsed = urlsplit(self.path)
        if not parsed.path.startswith("/__nexus/"):
            return self._send_json(404, {"ok": False, "error": "Endpoint tidak ditemukan."})
        if not self._host_allowed():
            return self._send_json(403, {"ok": False, "error": "Host lokal tidak diizinkan."})
        expected_origins = {
            "http://127.0.0.1:" + str(self.server.server_port),
            "http://localhost:" + str(self.server.server_port),
        }
        if self.headers.get("Origin") not in expected_origins:
            return self._send_json(403, {"ok": False, "error": "Origin tidak diizinkan."})
        try:
            data = self._read_json()
            if parsed.path == "/__nexus/propose":
                self._propose(data)
            elif parsed.path == "/__nexus/apply":
                self._apply(data)
            elif parsed.path == "/__nexus/check":
                self._check(data)
            else:
                self._send_json(404, {"ok": False, "error": "Endpoint tidak ditemukan."})
        except WorkspaceError as exc:
            self._send_json(exc.status, {"ok": False, "error": str(exc)})

    def _propose(self, data: dict) -> None:
        raw = data.get("path")
        content = data.get("content")
        action = data.get("action", "update")
        if action not in ("create", "update"):
            raise WorkspaceError("Jenis perubahan tidak valid.")
        if not isinstance(content, str):
            raise WorkspaceError("Konten file harus berupa teks.")
        if len(content.encode("utf-8")) > MAX_WRITE_BYTES:
            raise WorkspaceError("Konten terlalu besar (maksimal 256 KB).", 413)
        path = self._safe_path(raw, must_exist=(action == "update"))
        exists = path.exists()
        if action == "create" and exists:
            raise WorkspaceError("File sudah ada. Baca file lalu ajukan perubahan.", 409)
        if action == "update" and not exists:
            raise WorkspaceError("File tidak ditemukan untuk diperbarui.", 404)
        before = ""
        base_hash = None
        if exists:
            if path.stat().st_size > MAX_FILE_BYTES:
                raise WorkspaceError("File terlalu besar untuk diedit melalui browser.", 413)
            try:
                before = path.read_text(encoding="utf-8")
            except UnicodeDecodeError as exc:
                raise WorkspaceError("Hanya file teks UTF-8 yang dapat diedit.", 415) from exc
            base_hash = sha256_text(before)
        pending = self.server.pending_proposals
        now = time.time()
        for key in list(pending):
            if pending[key]["expires"] <= now:
                pending.pop(key, None)
        if len(pending) >= 5:
            raise WorkspaceError("Maksimal lima usulan perubahan dapat menunggu persetujuan.")
        proposal_id = uuid.uuid4().hex
        pending[proposal_id] = {
            "path": path,
            "relative_path": raw,
            "action": action,
            "before": before,
            "after": content,
            "base_hash": base_hash,
            "expires": now + PROPOSAL_TTL_SECONDS,
        }
        self._send_json(200, {
            "ok": True,
            "proposal_id": proposal_id,
            "path": raw,
            "action": action,
            "before": before,
            "after": content,
            "expires_in_seconds": PROPOSAL_TTL_SECONDS,
        })

    def _apply(self, data: dict) -> None:
        proposal_id = data.get("proposal_id")
        if not isinstance(proposal_id, str):
            raise WorkspaceError("ID usulan tidak valid.")
        proposal = self.server.pending_proposals.get(proposal_id)
        if not proposal:
            raise WorkspaceError("Usulan tidak ditemukan atau sudah kedaluwarsa.", 404)
        if proposal["expires"] <= time.time():
            self.server.pending_proposals.pop(proposal_id, None)
            raise WorkspaceError("Usulan sudah kedaluwarsa. Buat usulan baru.", 409)
        path = self._safe_path(proposal["relative_path"], must_exist=False)
        if proposal["action"] == "create":
            if path.exists():
                raise WorkspaceError("File sudah dibuat atau berubah sejak usulan dibuat.", 409)
        else:
            if not path.is_file() or path.is_symlink():
                raise WorkspaceError("File berubah sejak usulan dibuat.", 409)
            try:
                current = path.read_text(encoding="utf-8")
            except (OSError, UnicodeDecodeError) as exc:
                raise WorkspaceError("File tidak dapat diverifikasi.", 409) from exc
            if sha256_text(current) != proposal["base_hash"]:
                raise WorkspaceError("File berubah sejak usulan dibuat. Baca ulang sebelum menyimpan.", 409)
        path.parent.mkdir(parents=True, exist_ok=True)
        # Re-check after directory creation to reject symlinked parents.
        path = self._safe_path(proposal["relative_path"], must_exist=False)
        if proposal["action"] == "create":
            try:
                with path.open("x", encoding="utf-8", newline="") as handle:
                    handle.write(proposal["after"])
            except FileExistsError as exc:
                raise WorkspaceError("File sudah ada; perubahan dibatalkan.", 409) from exc
        else:
            temp_path = path.with_name(path.name + ".nexus-" + uuid.uuid4().hex + ".tmp")
            try:
                with temp_path.open("x", encoding="utf-8", newline="") as handle:
                    handle.write(proposal["after"])
                os.replace(temp_path, path)
            finally:
                try:
                    temp_path.unlink(missing_ok=True)
                except OSError:
                    pass
        self.server.pending_proposals.pop(proposal_id, None)
        self._send_json(200, {"ok": True, "path": proposal["relative_path"], "action": proposal["action"], "saved": True})

    def _check(self, data: dict) -> None:
        raw = data.get("path")
        path = self._safe_path(raw, must_exist=True)
        extension = path.suffix.lower()
        if extension not in CHECKABLE_EXTENSIONS:
            raise WorkspaceError("Pemeriksaan sintaks saat ini mendukung Python, JavaScript, dan JSON.")
        if path.stat().st_size > MAX_FILE_BYTES:
            raise WorkspaceError("File terlalu besar untuk diperiksa.", 413)
        try:
            source = path.read_text(encoding="utf-8")
        except UnicodeDecodeError as exc:
            raise WorkspaceError("File bukan teks UTF-8.", 415) from exc

        if extension == ".py":
            try:
                ast.parse(source, filename=path.name)
            except SyntaxError as exc:
                raise WorkspaceError("SyntaxError baris " + str(exc.lineno or "?") + ": " + str(exc.msg), 422) from exc
            self._send_json(200, {"ok": True, "path": raw, "result": "Lolos parse AST Python. Kode tidak dijalankan."})
            return
        if extension == ".json":
            try:
                json.loads(source)
            except json.JSONDecodeError as exc:
                raise WorkspaceError("JSON error baris " + str(exc.lineno) + ", kolom " + str(exc.colno) + ".", 422) from exc
            self._send_json(200, {"ok": True, "path": raw, "result": "JSON valid. Tidak ada kode yang dijalankan."})
            return

        node = shutil.which("node")
        if not node:
            raise WorkspaceError("Node.js belum terpasang. JavaScript syntax check tersedia setelah Node.js dipasang.", 501)
        temp_name = None
        try:
            with tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=extension, delete=False) as handle:
                handle.write(source)
                temp_name = handle.name
            completed = subprocess.run(
                [node, "--check", temp_name],
                check=False,
                capture_output=True,
                text=True,
                timeout=8,
                shell=False,
                env={"PATH": os.environ.get("PATH", "")},
            )
        except subprocess.TimeoutExpired as exc:
            raise WorkspaceError("Pemeriksaan JavaScript melewati batas 8 detik.", 408) from exc
        finally:
            if temp_name:
                try:
                    Path(temp_name).unlink(missing_ok=True)
                except OSError:
                    pass
        if completed.returncode != 0:
            message = (completed.stderr or completed.stdout or "Sintaks JavaScript tidak valid.")[-1200:]
            raise WorkspaceError(message.strip(), 422)
        self._send_json(200, {"ok": True, "path": raw, "result": "Lolos node --check. JavaScript tidak dijalankan."})


def make_server(host: str, port: int, public_dir: Path, workspace_root: Path) -> ThreadingHTTPServer:
    handler = lambda *args, **kwargs: LocalWorkspaceHandler(*args, directory=str(public_dir), **kwargs)
    server = ThreadingHTTPServer((host, port), handler)
    server.daemon_threads = True
    server.workspace_root = workspace_root.resolve()
    server.pending_proposals = {}
    return server


def main() -> int:
    parser = argparse.ArgumentParser(description="Jalankan NEXUS PERSONAL + workspace lokal.")
    parser.add_argument("--port", type=int, default=4173)
    parser.add_argument("--workspace", default=None, help="Folder workspace; default menggunakan NEXUS-Workspace.")
    args = parser.parse_args()
    if not 1024 <= args.port <= 65535:
        parser.error("Port harus antara 1024 dan 65535.")
    root = choose_workspace(args.workspace)
    public_dir = Path(__file__).resolve().parents[1] / "public"
    if not (public_dir / "index.html").is_file():
        raise SystemExit("Folder public/index.html tidak ditemukan.")
    server = make_server("127.0.0.1", args.port, public_dir, root)
    print("NEXUS PERSONAL: http://127.0.0.1:" + str(args.port) + "/")
    print("Workspace lokal: " + str(root))
    print("Akses dibatasi ke 127.0.0.1. Tidak ada remote network listener.")
    print("File hanya disimpan setelah usulan disetujui. Pemeriksaan kode tidak menjalankan file.")
    print("Tekan Ctrl+C untuk berhenti.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nNEXUS local workspace dihentikan.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
