(function () {
  'use strict';

  var state = {
    repo: 'sihotangjesse-cloud/nexus-ai-company',
    branch: 'main',
    path: '',
    entries: [],
    selected: null,
    status: '',
    statusError: false,
    remaining: null
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
  }
  function notify() { window.dispatchEvent(new Event('nexus-github-updated')); }
  function validateRepo(value) {
    return /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/.test(value) &&
      !value.split('/').some(function (part) { return part === '.' || part === '..'; });
  }
  function validateBranch(value) {
    return typeof value === 'string' && value.length > 0 && value.length <= 120 &&
      /^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(value) &&
      !value.includes('..') && !value.endsWith('/') && !value.startsWith('/');
  }
  function encodePath(path) {
    return String(path || '').split('/').filter(Boolean).map(encodeURIComponent).join('/');
  }
  function formatRateLimit(response) {
    var remaining = response.headers && response.headers.get('x-ratelimit-remaining');
    if (remaining !== null && remaining !== undefined) state.remaining = remaining;
  }
  async function api(path) {
    var response = await fetch('https://api.github.com/repos/' + state.repo + '/contents/' +
      encodePath(path) + '?ref=' + encodeURIComponent(state.branch), {
        method: 'GET',
        mode: 'cors',
        cache: 'no-store',
        headers: { 'Accept': 'application/vnd.github+json' }
      });
    formatRateLimit(response);
    var payload;
    try { payload = await response.json(); }
    catch (error) { throw new Error('Respons GitHub bukan JSON yang valid.'); }
    if (!response.ok) {
      if ((response.status === 403 || response.status === 429) && state.remaining === '0') {
        throw new Error('Batas permintaan GitHub publik tercapai. Coba lagi setelah jendela batas permintaan berakhir.');
      }
      if (response.status === 404) throw new Error('Repository, branch, folder, atau file tidak ditemukan. Pastikan repo bersifat publik.');
      if (response.status === 403) throw new Error('GitHub menolak permintaan. Periksa batas permintaan atau akses repositori.');
      throw new Error(payload && payload.message ? payload.message : 'GitHub API gagal: HTTP ' + response.status);
    }
    return payload;
  }
  function updateStatus(message, isError) {
    state.status = String(message || '');
    state.statusError = !!isError;
    notify();
  }
  function listView() {
    if (!state.entries.length) return '<p class="mu">Folder ini tidak memiliki file yang dapat ditampilkan.</p>';
    return state.entries.map(function (entry) {
      var icon = entry.type === 'dir' ? '📁 ' : '📄 ';
      var kind = entry.type === 'dir' ? 'Folder' : (entry.size + ' byte');
      return '<button type="button" class="sec" data-a="github-open" data-path="' + escapeHtml(entry.path) +
        '" data-kind="' + escapeHtml(entry.type) + '" style="display:flex;width:100%;justify-content:space-between;gap:10px;text-align:left;margin:5px 0">' +
        '<span>' + icon + escapeHtml(entry.name) + '</span><small class="mu">' + kind + '</small></button>';
    }).join('');
  }
  function fileView() {
    if (!state.selected) return '';
    return '<section class="c" style="margin-top:12px"><div class="row" style="justify-content:space-between"><h2>' +
      escapeHtml(state.selected.path) + '</h2><span class="chip">READ ONLY</span></div>' +
      '<p class="mu">File SHA: ' + escapeHtml(state.selected.sha || 'tidak tersedia') + '</p>' +
      '<textarea rows="14" readonly spellcheck="false" aria-label="Isi file dari GitHub" style="font:13px/1.5 ui-monospace,monospace">' +
      escapeHtml(state.selected.content) + '</textarea><div class="row" style="margin-top:10px">' +
      '<button type="button" data-a="github-copy">Salin isi file</button><button type="button" class="sec" data-a="github-close-file">Tutup file</button></div>' +
      '<p class="mu">NEXUS hanya membaca repositori publik. Perubahan tidak dikirim atau di-commit ke GitHub.</p></section>';
  }
  function view() {
    return '<h1>GitHub Explorer</h1><p class="sub">Buka dan baca file dari repository publik langsung melalui koneksi perangkat. Tidak perlu token atau API key.</p>' +
      '<section class="c"><h2>Repository publik</h2><form data-f="github-connect">' +
      '<label>Repository (owner/repo)</label><input name="repo" maxlength="202" value="' + escapeHtml(state.repo) + '" placeholder="contoh: pemilik/proyek" required>' +
      '<label>Branch</label><input name="branch" maxlength="120" value="' + escapeHtml(state.branch) + '" required>' +
      '<label>Path folder (opsional)</label><input name="path" maxlength="500" value="' + escapeHtml(state.path) + '" placeholder="kosongkan untuk root">' +
      '<div class="row" style="margin-top:10px"><button type="submit">Hubungkan / buka folder</button><button type="button" class="sec" data-a="github-root">Folder utama</button></div></form>' +
      '<p class="mu" style="margin-top:10px">Hanya GET/read-only. Isi chat, file workspace, dan model AI tidak dikirim. Yang dikirim ke GitHub hanya nama repository, branch, dan path yang kamu minta.</p>' +
      '<p class="mu">GitHub membatasi permintaan tanpa autentikasi hingga 60 permintaan REST per jam per alamat IP. Permintaan hanya dilakukan saat kamu membuka repository/file.</p></section>' +
      '<section class="c" style="margin-top:12px"><div class="row" style="justify-content:space-between"><h2>Isi repository</h2><span class="chip">' +
      (state.remaining === null ? 'BELUM TERHUBUNG' : 'SISA KUOTA: ' + escapeHtml(state.remaining)) + '</span></div>' +
      '<p class="mu">Repository: ' + escapeHtml(state.repo) + ' · Branch: ' + escapeHtml(state.branch) +
      ' · Path: ' + escapeHtml(state.path || '/') + '</p>' +
      (state.path ? '<button type="button" class="sec" data-a="github-parent">← Folder sebelumnya</button>' : '') +
      listView() + '</section>' + fileView() +
      '<section class="c" style="margin-top:12px"><h2>Batas kemampuan</h2><p class="mu">Fitur ini belum bisa membuka repository privat, mengubah file di GitHub, membuat branch, commit, atau push. Untuk mengubah file, salin isinya ke File Workspace lalu tinjau dan setujui perubahan lokal.</p></section>' +
      (state.status ? '<p class="' + (state.statusError ? 'err' : 'mu') + '" role="status">' + escapeHtml(state.status) + '</p>' : '');
  }
  async function browse(path) {
    state.selected = null;
    var result = await api(path);
    if (Array.isArray(result)) {
      state.entries = result.filter(function (item) { return item && (item.type === 'dir' || item.type === 'file'); })
        .map(function (item) { return { name: item.name, path: item.path, type: item.type, size: Number(item.size || 0) }; });
      state.path = path || '';
      updateStatus('Folder berhasil dibuka.', false);
      return;
    }
    if (result && result.type === 'file') {
      await readFile(result.path || path, result);
      return;
    }
    throw new Error('GitHub mengembalikan jenis konten yang belum didukung.');
  }
  async function readFile(path, metadata) {
    var file = metadata || await api(path);
    if (!file || file.type !== 'file') throw new Error('Path bukan file.');
    if (Number(file.size || 0) > 512 * 1024) throw new Error('File terlalu besar. Batas baca NEXUS adalah 512 KB.');
    if (file.encoding !== 'base64' || typeof file.content !== 'string') throw new Error('Isi file tidak tersedia dalam format teks yang didukung.');
    var binary = atob(file.content.replace(/\s/g, ''));
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    var content;
    try { content = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
    catch (error) { throw new Error('File bukan teks UTF-8. File binary tidak ditampilkan.'); }
    state.selected = { path: path, content: content, sha: file.sha || '' };
    updateStatus('File publik berhasil dibaca. Mode hanya-baca aktif.', false);
  }
  function parentPath(path) {
    var parts = String(path || '').split('/').filter(Boolean);
    parts.pop();
    return parts.join('/');
  }
  async function handleClick(button) {
    var action = button.getAttribute('data-a');
    if (action === 'github-open') {
      var path = button.getAttribute('data-path') || '';
      var kind = button.getAttribute('data-kind');
      if (kind === 'dir') await browse(path);
      else await readFile(path);
      notify();
    } else if (action === 'github-root') {
      state.path = '';
      await browse('');
      notify();
    } else if (action === 'github-parent') {
      state.path = parentPath(state.path);
      await browse(state.path);
      notify();
    } else if (action === 'github-close-file') {
      state.selected = null;
      notify();
    } else if (action === 'github-copy') {
      if (!state.selected) return;
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard tidak tersedia di browser ini.');
      await navigator.clipboard.writeText(state.selected.content);
      updateStatus('Isi file disalin ke clipboard.', false);
    }
  }
  document.addEventListener('click', function (event) {
    var button = event.target && event.target.closest ? event.target.closest('[data-a^="github-"]') : null;
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    Promise.resolve(handleClick(button)).catch(function (error) {
      updateStatus(error && error.message ? error.message : 'Permintaan GitHub gagal.', true);
    });
  }, true);
  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (!form || !form.dataset || form.dataset.f !== 'github-connect') return;
    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    var data = new FormData(form);
    var repo = String(data.get('repo') || '').trim();
    var branch = String(data.get('branch') || '').trim();
    var path = String(data.get('path') || '').trim();
    if (!validateRepo(repo)) return updateStatus('Isi repository dengan format owner/repo yang valid.', true);
    if (!validateBranch(branch)) return updateStatus('Nama branch tidak valid.', true);
    if (path.startsWith('/') || path.includes('\\') || path.split('/').some(function (part) { return part === '..' || part === '.'; })) {
      return updateStatus('Path harus relatif dan tidak boleh mengandung traversal.', true);
    }
    if (path.length > 500) return updateStatus('Path terlalu panjang.', true);
    state.repo = repo;
    state.branch = branch;
    state.path = path;
    state.selected = null;
    state.entries = [];
    updateStatus('Menghubungkan ke GitHub…', false);
    Promise.resolve(browse(path)).catch(function (error) {
      updateStatus(error && error.message ? error.message : 'Tidak dapat membuka repository.', true);
    });
  }, true);

  window.NexusGithub = { view: view };
})();