import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1] || '';
const start = script.indexOf('function applyTaskDetails(');
const end = script.indexOf('\nfunction taskEditEmployeeOptions(', start);
assert.ok(start >= 0 && end > start, 'applyTaskDetails helper must exist');
const source = script.slice(start, end);
const ST = ['Belum dikerjakan', 'Sedang dikerjakan', 'Dalam pemeriksaan', 'Selesai'];
const PR = ['Rendah', 'Sedang', 'Tinggi'];
const employees = new Set(['sena', 'nara', 'juno', 'kata', 'arka', 'jejak', 'garis', 'rupa']);
function harness(){
  const em=(id)=>employees.has(id)?{id}:null;
  const isRecord=(v)=>!!v&&typeof v==='object'&&!Array.isArray(v);
  const updateTaskStatus=(task,value)=>{task.st=value;task.pg=value===ST[2]?90:value===ST[3]?100:task.pg;};
  const apply=new Function('isRecord','em','PR','ST','updateTaskStatus',source+'\nreturn applyTaskDetails;')(isRecord,em,PR,ST,updateTaskStatus);
  return {apply};
}
function makeTask(overrides={}){
 return {id:1,t:'Tugas lama',emp:'nara',pri:'Sedang',due:'2026-12-01',st:ST[3],pg:100,result:'Hasil AI lama',brief:'Brief lama',reviewed:true,h:[],...overrides};
}

test('task detail edit updates title, owner, priority and due date',()=>{
 const {apply}=harness(), task=makeTask();
 const result=apply(task,{t:'Riset pelanggan',e:'juno',p:'Tinggi',d:'2026-12-20'});
 assert.equal(result.ok,true);assert.equal(result.changed,true);
 assert.equal(task.t,'Riset pelanggan');assert.equal(task.emp,'juno');
 assert.equal(task.pri,'Tinggi');assert.equal(task.due,'2026-12-20');
 assert.equal(task.result,'Hasil AI lama');assert.equal(task.brief,'Brief lama');
 assert.ok(task.h.some(x=>/judul, penanggung jawab, prioritas, tenggat/.test(x.t)));
});

test('changing title or owner with an existing AI result returns task to CEO review',()=>{
 const {apply}=harness(), task=makeTask();
 const result=apply(task,{t:'Judul baru',e:'nara',p:'Sedang',d:'2026-12-01'});
 assert.equal(result.reviewRequired,true);
 assert.equal(task.st,ST[2]);assert.equal(task.pg,90);assert.equal(task.reviewed,false);
 assert.equal(task.result,'Hasil AI lama');
});

test('changing only priority or due date does not reset an already approved AI result',()=>{
 const {apply}=harness(), task=makeTask();
 const result=apply(task,{t:task.t,e:task.emp,p:'Tinggi',d:'2026-12-21'});
 assert.equal(result.reviewRequired,false);
 assert.equal(task.st,ST[3]);assert.equal(task.reviewed,true);
});

test('task detail validation rejects short titles, unknown employees, invalid priorities and invalid dates without mutation',()=>{
 const {apply}=harness();
 for(const fields of [
  {t:'ab',e:'nara',p:'Sedang',d:'2026-12-01'},
  {t:'Judul valid',e:'unknown',p:'Sedang',d:'2026-12-01'},
  {t:'Judul valid',e:'nara',p:'Penting',d:'2026-12-01'},
  {t:'Judul valid',e:'nara',p:'Sedang',d:'2026-02-30'}
 ]){
  const task=makeTask(), before=JSON.stringify(task), result=apply(task,fields);
  assert.equal(result.ok,false);assert.equal(JSON.stringify(task),before);
 }
});

test('an empty due date is allowed and an unchanged edit is a no-op',()=>{
 const {apply}=harness();
 const task=makeTask({due:''});
 const result=apply(task,{t:task.t,e:task.emp,p:task.pri,d:''});
 assert.equal(result.ok,true);assert.equal(result.changed,false);
 const changed=apply(task,{t:task.t,e:task.emp,p:task.pri,d:'2026-12-22'});
 assert.equal(changed.ok,true);assert.equal(changed.changed,true);assert.equal(task.due,'2026-12-22');
});

test('task cards render an edit form per task and submit it through the local handler',()=>{
 assert.match(script,/function taskCardView\(k\)/);\n assert.match(script,/form data-f="edit-task" data-key="\'\+esc\(k\.id\)\+\'"/);
 assert.match(html,/Mengubah judul atau penanggung jawab tidak membuat ulang hasil AI/);
 assert.match(script,/if\(k==='edit-task'\)\{/);
 assert.match(script,/applyTaskDetails\(task,\{t:d\.get\('t'\),e:d\.get\('e'\),p:d\.get\('p'\),d:d\.get\('d'\)\}\)/);
});
