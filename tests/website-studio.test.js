import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\\s\\S]*?)<\\/script>/)?.[1] || ''; 
const websiteTypes = [
  { id: 'company', label: 'Company profile' },
  { id: 'landing', label: 'Landing page' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'ecommerce', label: 'Toko online' },
  { id: 'blog', label: 'Blog / artikel' },
  { id: 'webapp', label: 'Web app / dashboard' }
];
function extractFunction(name, nextMarker) {
  const start = script.indexOf('function ' + name + '(');
  const end = script.indexOf(nextMarker, start);
  assert.ok(start >= 0 && end > start, name + ' helper must exist');
  return script.slice(start, end);
}
const normalizeSite = new Function('isRecord', 'WEBSITE_TYPES',
  extractFunction('defaultWebsiteContent', 'function normalizeProject(raw){') + ';return normalizeWebsiteContent;'
)((value) => !!value && typeof value === 'object' && !Array.isArray(value), websiteTypes);
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, char => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
})[char]);
const buildStarter = new Function('esc', 'WEBSITE_TYPES', 'normalizeWebsiteContent',
  extractFunction('buildWebsiteStarter', 'function websiteContentFromForm(form,project){') + ';return buildWebsiteStarter;'
)(escapeHtml, websiteTypes, normalizeSite);

test('website editor defaults use project details and validate accent color', () => {
  const defaults = normalizeSite(null, {name:'Portofolio Saya',type:'portfolio',objective:'Menampilkan proyek web.'});
  assert.equal(defaults.brandName, 'Portofolio Saya');
  assert.equal(defaults.eyebrow, 'Portfolio');
  assert.equal(defaults.aboutText, 'Menampilkan proyek web.');
  const safe = normalizeSite({headline:'Judul pilihan',accentColor:'javascript:alert(1)'},{name:'Website',type:'landing'});
  assert.equal(safe.headline, 'Judul pilihan');
  assert.equal(safe.accentColor, '#2563eb');
});

test('website studio exposes sandboxed live preview and local save behavior', () => {
  assert.ok(script.includes('data-f="site-editor"'));
  assert.ok(script.includes('data-site-preview'));
  assert.ok(script.includes('sandbox=""'));
  assert.ok(script.includes('refreshWebsitePreview(studioForm)'));
  assert.ok(script.includes('project.site=websiteContentFromForm(f,project)'));
  assert.ok(script.includes('srcdoc='));
  assert.ok(script.includes('downloadWebsiteStarter(project,site)'));
});

test('generated website reflects saved content and validated theme color', () => {
  const site = normalizeSite({
    brandName:'Kedai Nusa',eyebrow:'Produk lokal',headline:'Temukan pilihan favorit',
    subheadline:'Katalog sederhana untuk mengenal produk.',ctaLabel:'Lihat koleksi',accentColor:'#16a085',
    feature1Title:'Pilihan produk',feature1Text:'Koleksi yang dikurasi.',
    feature2Title:'Informasi jelas',feature2Text:'Deskripsi tanpa klaim berlebihan.',
    feature3Title:'Mudah dijelajahi',feature3Text:'Navigasi sederhana.',
    aboutTitle:'Tentang Kedai Nusa',aboutText:'Usaha lokal dan katalog produk.',
    contactTitle:'Hubungi kami',contactText:'Kontak untuk pertanyaan produk.'
  }, {name:'Toko Contoh',type:'ecommerce',objective:'Menampilkan produk.'});
  const generated = buildStarter({name:'Toko Contoh',type:'ecommerce',objective:'Menampilkan produk.',site});
  assert.ok(generated.startsWith('<!doctype html>'));
  assert.ok(generated.includes('Kedai Nusa'));
  assert.ok(generated.includes('Temukan pilihan favorit'));
  assert.ok(generated.includes('Pilihan produk'));
  assert.ok(generated.includes('#16a085'));
  assert.ok(generated.includes('@media(max-width:760px)'));
  assert.ok(!generated.includes('http://') && !generated.includes('https://'));
});

test('website studio escapes markup supplied in the editor', () => {
  const site = normalizeSite({headline:'<script>alert(1)</script>',feature1Title:'<img src=x onerror=alert(1)>',aboutText:'</p><svg onload=alert(1)>'},
    {name:'Contoh',type:'landing',objective:'Isi'});
  const generated = buildStarter({name:'Contoh',type:'landing',objective:'Isi',site});
  assert.ok(generated.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(generated.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(generated.includes('&lt;/p&gt;&lt;svg onload=alert(1)&gt;'));
  assert.ok(!generated.includes('<script>alert(1)</script>'));
});
