// Pure helpers for the delegation, synthesis and revision workflow.
// They contain no network or Express code so they can be unit-tested directly.

export const LIMITS = Object.freeze({
  title: 160,
  brief: 1600,
  note: 2000,
  previousResult: 6000,
  synthesisPerSpecialist: 3500,
  maxRevisionBytes: 24000
});

export function isKnownEmployee(employees, id) {
  return typeof id === 'string' && Object.hasOwn(employees, id);
}

export function clampText(value, maxChars) {
  const text = String(value ?? '').trim();
  if (text.length <= maxChars) return text;
  let cut = text.slice(0, maxChars);
  const last = cut.charCodeAt(cut.length - 1);
  if (last >= 0xd800 && last <= 0xdbff) cut = cut.slice(0, -1); // do not split a surrogate pair
  return cut;
}

// Keeps at most `max` unique, known specialists (never the leader) from Sena's plan.
export function selectAssignments(plan, employees, fallbackMessage = '', max = 3) {
  if (!Array.isArray(plan?.assignments)) return [];
  const seen = new Set();
  const selected = [];
  for (const item of plan.assignments) {
    if (selected.length >= max) break;
    if (!item || !isKnownEmployee(employees, item.employeeId) || item.employeeId === 'sena' || seen.has(item.employeeId)) continue;
    seen.add(item.employeeId);
    selected.push({
      employeeId: item.employeeId,
      taskTitle: clampText(item.taskTitle || 'Tugas lanjutan', LIMITS.title) || 'Tugas lanjutan',
      taskBrief: clampText(item.taskBrief || fallbackMessage, LIMITS.brief)
    });
  }
  return selected;
}

export function buildSynthesisPrompt({ message, summary, assignments, employees }) {
  const sections = assignments.map((assignment) => {
    const employee = employees[assignment.employeeId];
    const header = `### ${employee?.name || assignment.employeeId} — ${employee?.role || 'Spesialis'} — ${assignment.taskTitle}`;
    if (assignment.success) {
      return `${header}\n${clampText(assignment.response, LIMITS.synthesisPerSpecialist)}`;
    }
    return `${header}\n[BELUM SELESAI] ${clampText(assignment.error || 'Tidak ada hasil.', 300)}`;
  });
  return [
    `Instruksi CEO:\n${clampText(message, 3000)}`,
    `Rencana Sena:\n${clampText(summary, 1200)}`,
    `Hasil spesialis:\n${sections.join('\n\n')}`
  ].join('\n\n');
}

export const SYNTHESIS_SYSTEM_PROMPT = 'Kamu Sena, Team Leader NEXUS AI COMPANY. Susun sintesis akhir untuk CEO berdasarkan HANYA hasil spesialis yang diberikan. Format: (1) ringkasan temuan utama, (2) kesamaan dan pertentangan antar hasil, (3) asumsi atau hal yang harus diverifikasi CEO, (4) langkah berikutnya yang disarankan. Jangan menambahkan fakta, angka, riset, atau sumber baru. Jika ada spesialis yang belum selesai, sebutkan dengan jelas. Gunakan Bahasa Indonesia yang ringkas.';

export function validateRevisionInput(body, employees) {
  const fail = (status, message) => ({ error: { status, message } });
  const { employeeId, taskTitle, taskBrief, previousResult, note } = body || {};
  if (!isKnownEmployee(employees, employeeId)) return fail(400, 'ID karyawan tidak dikenal.');
  if (typeof note !== 'string' || note.trim().length < 2 || note.length > LIMITS.note) {
    return fail(400, `Catatan revisi harus berisi 2–${LIMITS.note.toLocaleString('id-ID')} karakter.`);
  }
  if (typeof previousResult !== 'string' || !previousResult.trim()) {
    return fail(400, 'Hasil sebelumnya diperlukan untuk meminta revisi.');
  }
  const value = {
    employeeId,
    taskTitle: clampText(typeof taskTitle === 'string' ? taskTitle : '', LIMITS.title) || 'Tugas tanpa judul',
    taskBrief: clampText(typeof taskBrief === 'string' ? taskBrief : '', LIMITS.brief),
    previousResult: clampText(previousResult, LIMITS.previousResult),
    note: clampText(note, LIMITS.note)
  };
  const bytes = Buffer.byteLength(JSON.stringify(value), 'utf8');
  if (bytes > LIMITS.maxRevisionBytes) {
    return fail(413, 'Permintaan revisi terlalu besar. Persingkat catatan revisi.');
  }
  return { value };
}

export function buildRevisionPrompt({ taskTitle, taskBrief, previousResult, note }) {
  return [
    `Tugas awal: ${taskTitle}`,
    taskBrief ? `Brief awal:\n${taskBrief}` : '',
    `Hasil sebelumnya:\n${previousResult}`,
    `Catatan revisi dari CEO:\n${note}`,
    'Perbaiki hasil sesuai catatan CEO. Tulis versi revisi yang lengkap (bukan hanya daftar perubahan), lalu tambahkan bagian singkat "Perubahan yang dibuat" dan "Asumsi atau hal yang perlu diverifikasi". Jangan mengarang fakta atau angka baru.'
  ].filter(Boolean).join('\n\n');
}
