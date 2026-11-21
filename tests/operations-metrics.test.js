import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1]||'';
const start=script.indexOf('function getOperationalMetrics(');
const end=script.indexOf('\nfunction updateTaskStatus(',start);
assert.ok(start>=0&&end>start,'getOperationalMetrics helper must exist');
const source=script.slice(start,end);
const ST=['Belum dikerjakan','Sedang dikerjakan','Dalam pemeriksaan','Selesai'];
const E=[{id:'nara',n:'Nara'},{id:'juno',n:'Juno'},{id:'sena',n:'Sena'}];
const metrics=new Function('ST','E',source+'\nreturn getOperationalMetrics;')(ST,E);
const fixedNow=new Date(2026,10,20,12,0,0);
const tasks=[
 {id:1,t:'Overdue queued',emp:'nara',pri:'Tinggi',due:'2026-11-19',st:ST[0],pg:0},
 {id:2,t:'Due today',emp:'nara',pri:'Sedang',due:'2026-11-20',st:ST[1],pg:30},
 {id:3,t:'Due in seven days',emp:'juno',pri:'Rendah',due:'2026-11-27',st:ST[2],pg:90},
 {id:4,t:'Due in eight days',emp:'juno',pri:'Tinggi',due:'2026-11-28',st:ST[3],pg:100},
 {id:5,t:'Completed overdue',emp:'juno',pri:'Rendah',due:'2026-11-18',st:ST[3],pg:100},
 {id:6,t:'No due date',emp:'unknown',pri:'Rendah',due:'',st:ST[0],pg:0}
];

test('operational metrics count task states and overall progress accurately',()=>{
 const result=metrics(tasks,E,fixedNow);
 assert.equal(result.total,6);
 assert.equal(result.completed,2);
 assert.equal(result.active,2);
 assert.equal(result.inProgress,1);
 assert.equal(result.inReview,1);
 assert.equal(result.queued,2);
 assert.equal(result.completionRate,33);
 assert.equal(result.averageProgress,53);
});

test('overdue and upcoming deadline metrics exclude completed tasks and use an inclusive seven-day window',()=>{
 const result=metrics(tasks,E,fixedNow);
 assert.equal(result.today,'2026-11-20');
 assert.equal(result.weekEnd,'2026-11-27');
 assert.equal(result.overdue,1);
 assert.deepEqual(result.overdueTasks.map(task=>task.id),[1]);
 assert.equal(result.dueSoon,2);
 assert.deepEqual(result.dueSoonTasks.map(task=>task.id),[2,3]);
});

test('employee metrics include assigned totals, completed tasks and individual progress',()=>{
 const result=metrics(tasks,E,fixedNow);
 const nara=result.employeeStats.find(employee=>employee.id==='nara');
 const juno=result.employeeStats.find(employee=>employee.id==='juno');
 assert.deepEqual(
  {total:nara.total,completed:nara.completed,inProgress:nara.inProgress,queued:nara.queued,completionRate:nara.completionRate,averageProgress:nara.averageProgress},
  {total:2,completed:0,inProgress:1,queued:1,completionRate:0,averageProgress:15}
 );
 assert.deepEqual(
  {total:juno.total,completed:juno.completed,inReview:juno.inReview,completionRate:juno.completionRate,averageProgress:juno.averageProgress},
  {total:3,completed:2,inReview:1,completionRate:67,averageProgress:97}
 );
});

test('empty datasets and unassigned employees remain safe and return zero metrics',()=>{
 const result=metrics([],E,fixedNow);
 assert.equal(result.total,0);
 assert.equal(result.completionRate,0);
 assert.equal(result.averageProgress,0);
 assert.equal(result.overdue,0);
 assert.equal(result.dueSoon,0);
 assert.equal(result.employeeStats.length,3);
 assert.ok(result.employeeStats.every(employee=>employee.total===0));
});

test('metrics ignore malformed rows and do not mutate input task arrays',()=>{
 const rows=[...tasks,null,undefined,'not-a-task'];
 const before=JSON.stringify(rows);
 const result=metrics(rows,E,fixedNow);
 assert.equal(result.total,6);
 assert.equal(JSON.stringify(rows),before);
});

test('dashboard and reports expose operational summaries and explicit metric limitations',()=>{
 assert.match(script,/function getOperationalMetrics\(/);
 assert.match(script,/Kinerja penugasan karyawan/);
 assert.match(script,/BATASAN DATA/);
 assert.match(html,/Tugas terlambat/);
 assert.match(html,/data-a="srep"/);
 assert.match(html,/data-a="crep"/);
 assert.ok(html.includes('PERSONAL WORKSPACE · v1.9.0'));
});
