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

const normalizeSite = new Function(
  'isRecord', 'WEBSITE_TYPES',
  extractFunction('normalizeWebsiteContent', 'function normalizeProject(raw){') + ';return normalizeWebsiteContent;'
)((value) => !!value && typeof value === 'object' && !Array.isArray(value), websiteTypes);

const buildStarter = new Function(
  'esc', 'WEBSITE_TYPES', 'normalizeWebsiteContent',
  extractFunction('buildWebsiteStarter', 'function websiteContentFromForm(form,project){') + ';return buildWebsiteStarter;'
)(value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])), websiteTypes, normalizeSite);

test('website editor defaults are created from the project and validate the accent color', () => {
  const defaults = normalizeSite(null, { name: 'Portofolio Jesse', type: 'portfolio', objective: 'Menampilkan proyek web.' });
  assert.equal(defaults.brandName, 'Portofolio Jesse');
  assert.equal(defaults.eyebrow, 'Portfolio');
  assert.equal(defaults.aboutText, 'Menampilkan proyek web.');
  const normalized = normalizeSite({ headline: 'Judul pilihan', accentColor: 'javascript:alert(1)' }, { name: 'A', type: 'landing' });
  assert.equal(normalized.headline, 'Judul pilihan');
  assert.equal(normalized.accentColor, '#2563eb');
});

test('website studio saves project-specific content and exposes a sandboxed live preview', () => {
  assert.match(script, /data-f="site-editor"/);
  assert.match(script, /data-site-preview/);
  assert.match(script, /sandbox=""/);
  assert.match(script, /refreshWebsitePreview\\(studioForm\\)/);
  assert.match(script, /project\\.site=websiteContentFromForm\\(f,project\\)/);
  assert.ok(script.includes('srcdoc'));
});

test('generated website uses saved copy, feature cards, theme color and responsive layout', () => {
  const site = normalizeSite({ brandName:'Kedai Nusa', eyebrow:'Produk lokal', headline:'Temukan pilihan favorit',
    subheadline:'Katalog sederhana untuk mengenal produk.', ctaLabel:'Lihat koleksi', accentColor:'#16a085',
    feature1Title:'Pilihan produk', feature1Text:'Koleksi yang dikurasi.', feature2Title:'Informasi jelas',
    feature2Text:'Deskripsi tanpa klaim berlebihan.', feature3Title:'Mudah dijelajahi',
    feature3Text:'Navigasi sederhana.', aboutTitle:'Tentang Kedai Nusa', aboutText:'Usaha lokal dan katalog produk.',
    contactTitle:'Hubungi kami', contactText:'Kontak untuk pertanyaan produk.'
  }, { name:'Toko Contoh', type:'ecommerce', objective:'Menampilkan produk.' });
  const source = buildStarter({ name:'Toko Contoh', type:'ecommerce', objective:'Menampilkan produk.', site });
  assert.ok(source.includes('Kedai Nusa'));
  assert.ok(source.includes('Temukan pilihan favorit'));
  assert.ok(source.includes('Pilihan produk'));
  assert.ok(source.includes('#16a085'));
  assert.ok(source.includes('@media(max-width:760px)'));
  assert.doesNotMatch(source, /https?:\\/\\//);
});

test('website studio escapes untrusted text and does not allow markup injection', () => {
  const site = normalizeSite({ headline:'<script>alert(1)</script>', feature1Title:'<img src=x onerror=alert(1)>',
    aboutText:'</p><svg onload=alert(1)>' }, { name:'Contoh', type:'landing', objective:'Isi' });
  const source = buildStarter({ name:'Contoh', type:'landing', objective:'Isi', site });
  assert.ok(source.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(source.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(source.includes('&lt;/p&gt;&lt;svg onload=alert(1)&gt;'));
  assert.ok(!source.includes('<script>alert(1)</script>'));
});
