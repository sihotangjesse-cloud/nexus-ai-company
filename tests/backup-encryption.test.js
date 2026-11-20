import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1]||'';
const start=script.indexOf('function bytesToBase64(');
const end=script.indexOf('\nfunction employeeName(',start);
assert.ok(start>=0&&end>start,'backup encryption helpers must exist');
const source=script.slice(start,end);
const helpers=new Function(
 'ENCRYPTED_BACKUP_FORMAT','ENCRYPTED_BACKUP_VERSION','BACKUP_KDF_ITERATIONS','MAX_BACKUP_BYTES','isRecord',
 source+'\nreturn {encryptBackupPayload,decryptBackupPayload,bytesToBase64,base64ToBytes};'
)('nexus-ai-company-encrypted-backup',1,310000,2*1024*1024,value=>!!value&&typeof value==='object'&&!Array.isArray(value));
const payload={
 format:'nexus-ai-company-backup',version:1,appVersion:'0.9.0',exportedAt:'2026-11-20T00:00:00.000Z',
 data:{ceo:'Founder',tasks:[{id:1,t:'Riset pelanggan',emp:'nara',pri:'Tinggi',due:'2026-11-25',st:'Sedang dikerjakan',pg:40}],chats:{},events:[],reports:[],log:[]}
};
const password='NEXUS-backup-test-2026';

test('encrypted backup uses declared AES-GCM and PBKDF2 parameters and round-trips JSON data',async()=>{
 const envelope=await helpers.encryptBackupPayload(payload,password,webcrypto);
 assert.equal(envelope.format,'nexus-ai-company-encrypted-backup');
 assert.equal(envelope.version,1);
 assert.equal(envelope.cipher,'AES-256-GCM');
 assert.equal(envelope.kdf,'PBKDF2-SHA-256');
 assert.equal(envelope.iterations,310000);
 const restored=await helpers.decryptBackupPayload(envelope,password,webcrypto);
 assert.deepEqual(restored,payload);
});

test('each encrypted backup gets a fresh random salt and IV',async()=>{
 const first=await helpers.encryptBackupPayload(payload,password,webcrypto);
 const second=await helpers.encryptBackupPayload(payload,password,webcrypto);
 assert.notEqual(first.salt,second.salt);
 assert.notEqual(first.iv,second.iv);
 assert.notEqual(first.ciphertext,second.ciphertext);
});

test('wrong passwords are rejected without revealing decryption details',async()=>{
 const envelope=await helpers.encryptBackupPayload(payload,password,webcrypto);
 await assert.rejects(
  helpers.decryptBackupPayload(envelope,'Wrong-password-000',webcrypto),
  /Kata sandi salah atau file backup terenkripsi rusak/
 );
});

test('tampered ciphertext and invalid envelope metadata are rejected',async()=>{
 const envelope=await helpers.encryptBackupPayload(payload,password,webcrypto);
 const bytes=helpers.base64ToBytes(envelope.ciphertext);
 bytes[0]^=1;
 const tampered={...envelope,ciphertext:helpers.bytesToBase64(bytes)};
 await assert.rejects(helpers.decryptBackupPayload(tampered,password,webcrypto),/Kata sandi salah atau file backup terenkripsi rusak/);
 await assert.rejects(helpers.decryptBackupPayload({...envelope,iterations:1},password,webcrypto),/Format backup terenkripsi tidak dikenal/);
 await assert.rejects(helpers.decryptBackupPayload({...envelope,iv:'AA=='},password,webcrypto),/Data backup terenkripsi tidak valid/);
});

test('short passwords and oversized payloads are rejected before encryption',async()=>{
 await assert.rejects(helpers.encryptBackupPayload(payload,'short',webcrypto),/minimal 12 karakter/);
 const oversized={data:'x'.repeat(2*1024*1024)};
 await assert.rejects(helpers.encryptBackupPayload(oversized,password,webcrypto),/melebihi batas 2 MB/);
});

test('backup UI keeps the plain JSON option and exposes encrypted export and restore forms',()=>{
 assert.match(html,/data-a="backup-export"/);
 assert.match(html,/data-f="encrypted-backup-export"/);
 assert.match(html,/data-f="encrypted-backup-import"/);
 assert.match(html,/appVersion:'0.9.0'/);
 assert.match(script,/if\(k==='encrypted-backup-export'\)/);
 assert.match(script,/if\(k==='encrypted-backup-import'\)/);
 assert.match(html,/data aktif di penyimpanan browser \(localStorage\) masih belum dienkripsi/);
});
