(function () {
  'use strict';

  var state = {
    connected: false,
    health: null,
    path: '.',
    entries: [],
    selectedPath: '',
    content: '',
    proposal: null,
    showCreate: false,
    status: '',
    checkResult: ''
  };

  function byId(id) { return document.getElementById(id); }
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
  }
  function notify() {
    window.dispatchEvent(new Event('nexus-workspace-updated'));
  }
  async function request(route, options) {
    var response = await fetch(route, Object.assign({
      credentials: 'same-origin',
      headers: { 'Accept': 'application/json' }
    }, options || {}));
    var payload;
    try { payload = await response.json(); }
    catch (error) { throw new Error('Respons layanan lokal tidak valid.'); }
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || ('Permintaan gagal: HTTP ' + response.status));
    }
    return payload;
  }
  function post(route, payload) {
    return request(route, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }
  function setStatus(message, isError) {
    state.status = String(message || '');
    state.statusIsError = !!isError;
  }
  function parentPath(path) {
    var parts = String(path || '.').split('/').filter(Boolean);
    parts.pop();
    return parts.length ? parts.join('/') : '.';
  }
  function fileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
  function entriesView() {
    if (!state.entries.length) return '<p class="mu">Folder ini masih kosong. Buat file pertama melalui tombol Tambah file.</p>';
    return state.entries.map(function (entry) {
      var label = entry.kind === 'folder' ? '📁 ' : '📄 ';
      var detail = entry.kind === 'folder' ? 'Folder' : fileSize(entry.size);
      return '<button type="button" class="sec" style="display:flex;width:100%;justify-content:space-between;gap:10px;text-align:left;margin:5px 0" data-a="workspace-open" data-path="' +
        escapeHtml(entry.path) + '"><span>' + label + escapeHtml(entry.name) + '</span><small class="mu">' + detail + '</small></button>';
    }).join('');
  }
  function proposalView() {
    if (!state.proposal) return '';
    return '<section class="c" style="margin-top:12px;border-color:var(--wn)"><div class="row" style="justify-content:space-between"><h2>Usulan menunggu persetujuan</h2><span class="chip">' +
      (state.proposal.action === 'create' ? 'FILE BARU' : 'PERUBAHAN') + '</span></div><p class="mu">' +
      escapeHtml(state.proposal.path) + ' · Tinjau isi sebelum menyimpan.</p><details><summary>Isi sebelum perubahan</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere;margin-top:8px">' +
      escapeHtml(state.proposal.before || '(File belum ada)') + '</pre></details><details open><summary>Isi yang akan disimpan</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere;margin-top:8px">' +
      escapeHtml(state.proposal.after) + '</pre></details><div class="row" style="margin-top:12px"><button type="button" data-a="workspace-apply">Setujui & simpan file</button><button type="button" class="sec" data-a="workspace-cancel">Batalkan usulan</button></div><p class="mu">File belum diubah sampai tombol persetujuan ditekan.</p></section>';
  }
  function editorView() {
    if (!state.selectedPath) return '';
    return '<section class="c" style="margin-top:12px"><div class="row" style="justify-content:space-between"><h2>' +
      escapeHtml(state.selectedPath) + '</h2><span class="chip">EDITOR TEKS</span></div><form data-f="workspace-edit"><label for="workspace-content">Isi file</label><textarea id="workspace-content" name="content" rows="15" maxlength="262144" spellcheck="false" style="font:13px/1.5 ui-monospace,monospace">' +
      escapeHtml(state.content) + '</textarea><div class="row" style="margin-top:10px"><button type="submit">Ajukan perubahan</button><button type="button" class="sec" data-a="workspace-check">Periksa sintaks</button></div></form>' +
      (state.checkResult ? '<p class="mu" role="status">' + escapeHtml(state.checkResult) + '</p>' : '') +
      '<p class="mu">Batas editor 256 KB. File hanya disimpan setelah usulan ditinjau dan disetujui.</p></section>';
  }
  function createView() {
    if (!state.showCreate) return '';
    return '<section class="c" style="margin-top:12px"><h2>File baru</h2><form data-f="workspace-create"><label>Path relatif, termasuk nama file</label><input name="path" maxlength="240" placeholder="contoh: src/index.html" required><label>Konten awal</label><textarea name="content" rows="10" maxlength="262144" spellcheck="false" placeholder="Tulis kode atau konten file..." required style="font:13px/1.5 ui-monospace,monospace"></textarea><div class="row" style="margin-top:10px"><button type="submit">Buat usulan file</button><button type="button" class="sec" data-a="workspace-new">Tutup</button></div></form></section>';
  }
  function view() {
    if (!state.connected) {
      return '<h1>Project Workspace Lokal</h1><p class="sub">Hubungkan NEXUS ke folder proyek di perangkat ini. File tidak dikirim ke layanan cloud.</p><section class="c"><h2>Jembatan lokal</h2><p class="mu">Layanan lokal harus dijalankan dari Termux/komputer menggunakan peluncur NEXUS v1.7.0. Jika halaman sedang dibuka dari hosting atau GitHub Pages, fitur ini tidak tersedia.</p><button type="button" data-a="workspace-connect">Hubungkan workspace lokal</button><p class="mu" style="margin-top:12px">Akses dibatasi ke perangkat sendiri (127.0.0.1). Tidak membutuhkan API key, langganan, kredit, atau deployment.</p></section>' +
        (state.status ? '<p class="err" role="status">' + escapeHtml(state.status) + '</p>' : '');
    }
    return '<h1>Project Workspace Lokal</h1><p class="sub">Baca file, buat file baru, ajukan perubahan, dan periksa sintaks dari browser HP.</p>' +
      '<section class="c"><div class="row" style="justify-content:space-between"><div><h2>Folder proyek</h2><p class="mu">Workspace: ' +
      escapeHtml(state.health && state.health.workspace || 'NEXUS-Workspace') + '</p></div><span class="chip">LOOPBACK ONLY</span></div>' +
      '<div class="row"><button type="button" class="sec" data-a="workspace-refresh">Segarkan daftar</button><button type="button" data-a="workspace-new">+ Tambah file</button><button type="button" class="sec" data-a="workspace-disconnect">Putuskan</button></div>' +
      '<p class="mu">Lokasi: <b>' + escapeHtml(state.path) + '</b></p>' +
      (state.path !== '.' ? '<button type="button" class="sec" data-a="workspace-parent">← Folder sebelumnya</button>' : '') +
      '<div style="margin-top:10px">' + entriesView() + '</div></section>' +
      createView() + editorView() + proposalView() +
      '<section class="c" style="margin-top:12px"><h2>Batas keamanan</h2><p class="mu">Tidak ada tombol hapus. Path di luar workspace, file tersembunyi/sensitif, binary, dan file besar diblokir. Pemeriksaan sintaks tidak menjalankan kode; fitur ini belum menjalankan aplikasi atau perintah bebas.</p></section>' +
      (state.status ? '<p class="' + (state.statusIsError ? 'err' : 'mu') + '" role="status">' + escapeHtml(state.status) + '</p>' : '');
  }
  async function refreshList() {
    var result = await request('/__nexus/files?path=' + encodeURIComponent(state.path));
    state.entries = result.entries || [];
    state.path = result.path || '.';
    notify();
  }
  async function connect() {
    setStatus('Menghubungkan ke layanan lokal...', false);
    notify();
    var health = await request('/__nexus/health');
    state.health = health;
    state.connected = true;
    state.path = '.';
    state.selectedPath = '';
    state.content = '';
    state.proposal = null;
    await refreshList();
    setStatus('Workspace lokal berhasil dihubungkan.', false);
    notify();
  }
  async function openEntry(path) {
    var entry = state.entries.find(function (item) { return item.path === path; });
    if (entry && entry.kind === 'folder') {
      state.path = path;
      state.selectedPath = '';
      state.content = '';
      state.proposal = null;
      await refreshList();
      return;
    }
    var result = await request('/__nexus/file?path=' + encodeURIComponent(path));
    state.selectedPath = result.path;
    state.content = result.content;
    state.checkResult = '';
    state.proposal = null;
    notify();
  }
  async function propose(action, path, content) {
    var result = await post('/__nexus/propose', { action: action, path: path, content: content });
    state.proposal = {
      id: result.proposal_id,
      action: result.action,
      path: result.path,
      before: result.before,
      after: result.after
    };
    setStatus('Usulan siap ditinjau. File belum diubah.', false);
    notify();
  }
  async function applyProposal() {
    if (!state.proposal) return;
    var proposal = state.proposal;
    if (!window.confirm('Setujui penyimpanan file ' + proposal.path + '?')) return;
    await post('/__nexus/apply', { proposal_id: proposal.id });
    state.proposal = null;
    setStatus('Perubahan disimpan: ' + proposal.path, false);
    if (state.selectedPath === proposal.path) {
      var result = await request('/__nexus/file?path=' + encodeURIComponent(proposal.path));
      state.content = result.content;
    }
    await refreshList();
    notify();
  }
  async function checkSelected() {
    if (!state.selectedPath) return;
    var result = await post('/__nexus/check', { path: state.selectedPath });
    state.checkResult = result.result || 'Pemeriksaan selesai.';
    setStatus('Pemeriksaan kode selesai.', false);
    notify();
  }
  async function handleAction(action, button) {
    if (action === 'workspace-connect') return connect();
    if (action === 'workspace-refresh') return refreshList();
    if (action === 'workspace-parent') {
      state.path = parentPath(state.path);
      state.selectedPath = '';
      state.proposal = null;
      return refreshList();
    }
    if (action === 'workspace-open') return openEntry(button.getAttribute('data-path'));
    if (action === 'workspace-new') {
      state.showCreate = !state.showCreate;
      return notify();
    }
    if (action === 'workspace-check') return checkSelected();
    if (action === 'workspace-apply') return applyProposal();
    if (action === 'workspace-cancel') {
      state.proposal = null;
      setStatus('Usulan dibatalkan. File tidak berubah.', false);
      return notify();
    }
    if (action === 'workspace-disconnect') {
      state.connected = false;
      state.health = null;
      state.entries = [];
      state.selectedPath = '';
      state.proposal = null;
      state.content = '';
      setStatus('Koneksi lokal diputuskan.', false);
      return notify();
    }
  }

  document.addEventListener('click', function (event) {
    var button = event.target && event.target.closest ? event.target.closest('[data-a^="workspace-"]') : null;
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    Promise.resolve(handleAction(button.getAttribute('data-a'), button)).catch(function (error) {
      setStatus(error && error.message ? error.message : 'Operasi workspace gagal.', true);
      notify();
    });
  }, true);

  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (!form || !form.dataset || !/^workspace-/.test(form.dataset.f || '')) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    var data = new FormData(form);
    Promise.resolve().then(async function () {
      if (form.dataset.f === 'workspace-create') {
        var path = String(data.get('path') || '').trim();
        var content = String(data.get('content') || '');
        if (!path || !content.trim()) throw new Error('Isi path dan konten file terlebih dahulu.');
        await propose('create', path, content);
        state.showCreate = false;
      } else if (form.dataset.f === 'workspace-edit') {
        if (!state.selectedPath) throw new Error('Pilih file yang akan diperbarui.');
        await propose('update', state.selectedPath, String(data.get('content') || ''));
      }
      notify();
    }).catch(function (error) {
      setStatus(error && error.message ? error.message : 'Usulan file gagal dibuat.', true);
      notify();
    });
  }, true);

  window.NexusWorkspace = { view: view };
})();