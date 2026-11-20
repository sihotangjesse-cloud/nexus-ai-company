import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1]||'';
const metricStart=script.indexOf('function getOperationalMetrics(');
const metricEnd=script.indexOf('\nfunction updateTaskStatus(',metricStart);
const csvStart=script.indexOf('function csvCell(');
const csvEnd=script.indexOf('\nfunction copy(t)',csvStart);
assert.ok(metricStart>=0&&metricEnd>metricStart,'operational metrics helper must exist');
assert.ok(csvStart>=0&&csvEnd>csvStart,'CSV export helpers must exist');
const metricSource=script.slice(metricStart,metricEnd);
const csvSource=script.slice(csvStart,csvEnd);
const statuses=['Belum dikerjakan','Sedang dikerjakan','Dalam pemeriksaan','Selesai'];
const employees=[{id:'nara',n:'Nara'},{id:'kata',n:'Kata'}];
const employeeName=id=>employees.find(employee=>employee.id===id)?.n||'Karyawan tidak dikenal';
const helpers=new Function('ST','employeeName',metricSource+'\n'+csvSource+'\nreturn {getOperationalMetrics,serializeCsv,makeOperationalCsv,makeTaskCsv,csvCell};')(statuses,employeeName);
const now=new Date(2026,10,20,12,0,0);
const tasks=[
 {id:1,t:'Riset pasar',emp:'nara',pri:'Tinggi',st:statuses[1],due:'2026-11-19',pg:40,reviewed:false},
 {id:2,t:'Tulis slogan',emp:'kata',pri:'Sedang',st:statuses[3],due:'2026-11-22',pg:100,reviewed:true},
 {id:3,t:'Analisis pelanggan',emp:'nara',pri:'Rendah',st:statuses[0],due:'2026-11-25',pg:0,reviewed:false}
];
const logs=[
 {at:now.getTime()-60*60*1000,t:'Tugas ditambahkan'},
 {at:now.getTime()-8*24*60*60*1000,t:'Aktivitas lama'}
];

test('CSV serializer adds UTF-8 BOM, CRLF rows, quotes fields, and escapes embedded quotes',()=>{
 const csv=helpers.serializeCsv(['Nama','Catatan'],[['Nara','Dia berkata "siap", lalu mulai']]);
 assert.ok(csv.startsWith('\uFEFF'));
 assert.match(csv,/"Nara","Dia berkata ""siap"", lalu mulai"/);
 assert.ok(csv.endsWith('\r\n'));
});

test('CSV serializer neutralizes spreadsheet formula prefixes in exported text',()=>{
 const csv=helpers.serializeCsv(['Judul','Catatan'],[['=1+1','  @SUM(A1:A2)']]);
 assert.ok(csv.includes('"\\'=1+1"'));
 assert.ok(csv.includes('"\\'  @SUM(A1:A2)"'));
});

test('operational CSV includes summary metrics, status breakdown, employees, deadlines, and period activity',()=>{
 const csv=helpers.makeOperationalCsv('harian',tasks,employees,logs,now);
 assert.ok(csv.startsWith('\uFEFF'));
 for(const value of ['Total tugas','Tugas selesai','Tugas terlambat','Rata-rata progres','Belum dikerjakan','Nara','Mendekati tenggat','Terlambat','Tugas ditambahkan']){
  assert.ok(csv.includes(value),'expected exported CSV to include '+value);
 }
 assert.ok(!csv.includes('Aktivitas lama'),'activity outside the selected 24-hour period must be excluded');
 assert.ok(!/pendapatan|biaya|laba|penjualan/i.test(csv),'report must not invent financial metrics');
});

test('weekly operational CSV includes activity from the last seven days but excludes older entries',()=>{
 const csv=helpers.makeOperationalCsv('mingguan',tasks,employees,logs,now);
 assert.ok(csv.includes('Tugas ditambahkan'));
 assert.ok(!csv.includes('Aktivitas lama'));
 assert.ok(csv.includes('7 hari terakhir'));
});

test('task CSV includes task details and due attention without exposing AI/chat content',()=>{
 const taskRows=tasks.map(task=>({...task,result:'PRIVATE AI OUTPUT',brief:'PRIVATE BRIEF'}));
 const csv=helpers.makeTaskCsv(taskRows,employees,now);
 assert.ok(csv.includes('"Riset pasar"'));
 assert.ok(csv.includes('"Nara"'));
 assert.ok(csv.includes('"Terlambat"'));
 assert.ok(csv.includes('"Tenggat 7 hari"'));
 assert.ok(!csv.includes('PRIVATE AI OUTPUT'));
 assert.ok(!csv.includes('PRIVATE BRIEF'));
});

test('empty exports still produce valid header-only CSV files',()=>{
 const report=helpers.makeOperationalCsv('harian',[],employees,[],now);
 const task=helpers.makeTaskCsv([],employees,now);
 assert.ok(report.includes('"Bagian","Metrik atau Item"'));
 assert.ok(task.includes('"ID Tugas","Judul Tugas"'));
 assert.ok(task.endsWith('\r\n'));
});

test('report page exposes both CSV downloads and export stays client-side',()=>{
 assert.match(html,/data-a="csv-report"/);
 assert.match(html,/data-a="csv-tasks"/);
 assert.match(script,/function downloadCsv\(content,filename,message\)/);
 assert.match(script,/makeOperationalCsv\(rep,S\.tasks,E,S\.log,new Date\(\)\)/);
 assert.match(script,/makeTaskCsv\(S\.tasks,E,new Date\(\)\)/);
});
