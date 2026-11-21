import json
import sys
import tempfile
import threading
import unittest
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts.local_workspace_server import make_server


class LocalWorkspaceServerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.base = Path(self.temp.name)
        self.workspace = self.base / "workspace"
        self.workspace.mkdir()
        self.public = ROOT / "public"
        self.server = make_server("127.0.0.1", 0, self.public, self.workspace)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.origin = "http://127.0.0.1:" + str(self.server.server_port)
        self.base_url = self.origin

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)
        self.temp.cleanup()

    def get_json(self, route):
        with urlopen(self.base_url + route, timeout=3) as response:
            return json.loads(response.read().decode("utf-8"))

    def post_json(self, route, payload, origin=None):
        raw = json.dumps(payload).encode("utf-8")
        request = Request(
            self.base_url + route,
            data=raw,
            headers={
                "Content-Type": "application/json",
                "Origin": origin or self.origin,
            },
            method="POST",
        )
        with urlopen(request, timeout=3) as response:
            return json.loads(response.read().decode("utf-8"))

    def post_error(self, route, payload, expected_status, origin=None):
        raw = json.dumps(payload).encode("utf-8")
        request = Request(
            self.base_url + route,
            data=raw,
            headers={
                "Content-Type": "application/json",
                "Origin": origin or self.origin,
            },
            method="POST",
        )
        with self.assertRaises(HTTPError) as caught:
            urlopen(request, timeout=3)
        self.assertEqual(caught.exception.code, expected_status)
        return json.loads(caught.exception.read().decode("utf-8"))

    def test_health_and_file_listing_only_expose_workspace(self):
        (self.workspace / "readme.md").write_text("hello", encoding="utf-8")
        (self.workspace / ".env").write_text("SECRET=hidden", encoding="utf-8")
        (self.workspace / "node_modules").mkdir()
        health = self.get_json("/__nexus/health")
        listing = self.get_json("/__nexus/files?path=.")
        self.assertTrue(health["ok"])
        self.assertEqual(health["code_execution"], False)
        self.assertEqual([item["name"] for item in listing["entries"]], ["readme.md"])

    def test_file_read_and_path_traversal_rejection(self):
        (self.workspace / "hello.txt").write_text("NEXUS", encoding="utf-8")
        content = self.get_json("/__nexus/file?path=hello.txt")
        self.assertEqual(content["content"], "NEXUS")
        with self.assertRaises(HTTPError) as caught:
            urlopen(self.base_url + "/__nexus/files?path=.." , timeout=3)
        self.assertEqual(caught.exception.code, 400)

    def test_create_requires_proposal_then_explicit_apply(self):
        proposal = self.post_json("/__nexus/propose", {
            "action": "create", "path": "src/app.js", "content": "const app = true;\n"
        })
        target = self.workspace / "src" / "app.js"
        self.assertFalse(target.exists(), "proposal must not write a file")
        result = self.post_json("/__nexus/apply", {"proposal_id": proposal["proposal_id"]})
        self.assertTrue(result["saved"])
        self.assertEqual(target.read_text(encoding="utf-8"), "const app = true;\n")

    def test_edit_rejects_stale_file_after_proposal(self):
        target = self.workspace / "notes.md"
        target.write_text("before", encoding="utf-8")
        proposal = self.post_json("/__nexus/propose", {
            "action": "update", "path": "notes.md", "content": "after"
        })
        target.write_text("changed elsewhere", encoding="utf-8")
        response = self.post_error("/__nexus/apply", {"proposal_id": proposal["proposal_id"]}, 409)
        self.assertIn("berubah", response["error"])
        self.assertEqual(target.read_text(encoding="utf-8"), "changed elsewhere")

    def test_foreign_origin_is_rejected(self):
        response = self.post_error("/__nexus/propose", {
            "action": "create", "path": "new.txt", "content": "no"
        }, 403, origin="https://example.com")
        self.assertIn("Origin", response["error"])
        self.assertFalse((self.workspace / "new.txt").exists())

    def test_sensitive_paths_and_unsupported_extensions_are_blocked(self):
        self.post_error("/__nexus/propose", {
            "action": "create", "path": ".env", "content": "SECRET=x"
        }, 400)
        self.post_error("/__nexus/propose", {
            "action": "create", "path": "app.exe", "content": "binary"
        }, 400)

    def test_python_syntax_check_parses_without_running_source(self):
        marker = self.workspace / "should-not-exist.txt"
        script = self.workspace / "safe.py"
        script.write_text(
            "from pathlib import Path\nPath(" + repr(str(marker)) + ").write_text('executed')\n",
            encoding="utf-8",
        )
        result = self.post_json("/__nexus/check", {"path": "safe.py"})
        self.assertIn("tidak dijalankan", result["result"])
        self.assertFalse(marker.exists())

    def test_invalid_python_syntax_returns_validation_error(self):
        (self.workspace / "broken.py").write_text("def broken(:\n", encoding="utf-8")
        response = self.post_error("/__nexus/check", {"path": "broken.py"}, 422)
        self.assertIn("SyntaxError", response["error"])


if __name__ == "__main__":
    unittest.main()
