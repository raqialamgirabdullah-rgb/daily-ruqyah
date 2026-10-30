#!/usr/bin/env node
/* হাদিস ডেটা বানায় (রিসার্চ পেজের "হাদিস" মোডের জন্য)।
   উৎস: fawazahmed0/hadith-api (editions/ara-*.json ও ben-*.json; The Unlicense — https://github.com/fawazahmed0/hadith-api)।
   ব্যবহার: node tools/build-hadith.js <editions-ফোল্ডার> [আউটপুট-ফোল্ডার=hadith-chunks]
   আউটপুট:
     meta.json            সংকলনের তালিকা ও আইডি-পরিসর
     t/<n>.json.gz        n-তম খণ্ড: CHUNK টি হাদিসের লেখা — [সংকলন, নম্বর, আরবি, বাংলা, মান, কিতাব]
     i/<s>.json.gz        শব্দ-সূচি (২৫৬ ভাগ): { শব্দ: [আইডি (ডেল্টা)…] }
   শব্দের রূপ hadith-norm.js থেকে — সেটি বদলালে সব নতুন করে বানাতে হবে। */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const N = require('../hadith-norm.js');

const SRC = process.argv[2];
const OUT = process.argv[3] || path.join(__dirname, '..', 'hadith-chunks');
if (!SRC) { console.error('ব্যবহার: node tools/build-hadith.js <editions>'); process.exit(1); }

const CHUNK = 20;
const COLS = [
  { k: 'bukhari', bn: 'সহীহ বুখারী' },
  { k: 'muslim', bn: 'সহীহ মুসলিম' },
  { k: 'abudawud', bn: 'সুনান আবূ দাউদ' },
  { k: 'tirmidhi', bn: 'জামে’ আত-তিরমিযী' },
  { k: 'nasai', bn: 'সুনান আন-নাসাঈ' },
  { k: 'ibnmajah', bn: 'সুনান ইবনু মাজাহ' },
  { k: 'malik', bn: 'মুয়াত্তা মালিক' },
  { k: 'nawawi', bn: 'আরবাঈন নাবাবী (৪০ হাদীস)' },
  { k: 'qudsi', bn: 'হাদীসে কুদসী (৪০ হাদীস)' }
];

/* মানের (গ্রেড) বাংলা: শব্দ ধরে ধরে */
const GW = {
  Sahih: 'সহীহ', Daif: 'যঈফ', Hasan: 'হাসান', Isnaad: 'সনদ', Sanad: 'সনদ', Very: 'অত্যন্ত', Mauquf: 'মাওকূফ', Muquf: 'মাওকূফ', Maqtu: 'মাকতূ’',
  Munkar: 'মুনকার', Shadh: 'শায', Mawdu: 'মাওযূ’ (জাল)', Lighairihi: 'লিগাইরিহী', Agreed: 'মুত্তাফাকুন', Upon: 'আলাইহি', Bukhari: 'বুখারী',
  Muslim: 'মুসলিম', And: 'ও', Hadith: 'হাদীস', Mutawatir: 'মুতাওয়াতির', Mursal: 'মুরসাল', Gharib: 'গরীব'
};
const GN = { 'Al-Albani': 'আলবানী', 'Zubair Ali Zai': 'যুবায়ের আলী যাঈ' };
function gradeText(gs) {
  if (!gs || !gs.length) return '';
  const pick = gs.filter(g => GN[g.name] && g.grade && g.grade !== '-');
  const use = pick.length ? pick : gs.filter(g => g.grade && g.grade !== '-').slice(0, 1);
  return use.map(g => {
    const w = g.grade.replace(/\s*-\s*/g, ' ').split(/\s+/).map(x => GW[x] || x).join(' ');
    return (GN[g.name] || g.name) + ': ' + w.replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
  }).join(' · ');
}

const clean = s => String(s || '').normalize('NFC').replace(/[­​]/g, '').replace(/^[\s।]+/, '').replace(/\s+/g, ' ').trim();
const numOf = n => (Number.isInteger(n) ? n : String(n));

const recs = [];
const meta = { v: 1, chunk: CHUNK, shards: 256, cols: [] };
for (const c of COLS) {
  const A = JSON.parse(fs.readFileSync(path.join(SRC, 'ara-' + c.k + '.json'), 'utf8')).hadiths;
  let B = [];
  const bf = path.join(SRC, 'ben-' + c.k + '.json');
  if (fs.existsSync(bf)) B = JSON.parse(fs.readFileSync(bf, 'utf8')).hadiths;
  const bmap = new Map(B.map(h => [h.hadithnumber, h]));
  const start = recs.length;
  for (const a of A) {
    const b = bmap.get(a.hadithnumber);
    const ar = clean(a.text), bn = clean(b && b.text);
    if (!ar && !bn) continue;
    recs.push([meta.cols.length, numOf(a.hadithnumber), ar, bn, gradeText((a.grades && a.grades.length) ? a.grades : (b && b.grades)), (a.reference && a.reference.book) || 0]);
  }
  meta.cols.push({ k: c.k, bn: c.bn, start, count: recs.length - start, hasBn: B.length > 0 });
  console.log(c.k, 'আরবি', A.length, 'বাংলা', B.length, 'রাখা হলো', recs.length - start);
}
meta.total = recs.length;

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 't'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'i'), { recursive: true });
const gz = o => zlib.gzipSync(Buffer.from(JSON.stringify(o)), { level: 9, mtime: 0 });

let tb = 0, tn = 0;
for (let i = 0; i < recs.length; i += CHUNK) {
  const b = gz(recs.slice(i, i + CHUNK));
  fs.writeFileSync(path.join(OUT, 't', (i / CHUNK) + '.json.gz'), b);
  tb += b.length; tn++;
}

/* শব্দ-সূচি */
const idx = new Map();
recs.forEach((r, id) => {
  const seen = new Set(N.tokens(r[2] + ' \n ' + r[3]));
  for (const w of seen) {
    let l = idx.get(w);
    if (!l) idx.set(w, l = []);
    l.push(id);
  }
});
const sh = Array.from({ length: 256 }, () => ({}));
for (const [w, l] of idx) {
  const d = new Array(l.length);
  let p = 0;
  for (let i = 0; i < l.length; i++) { d[i] = l[i] - p; p = l[i]; }
  sh[N.shard(w)][w] = d;
}
let ib = 0, imax = 0;
sh.forEach((o, s) => {
  const b = gz(o);
  fs.writeFileSync(path.join(OUT, 'i', s + '.json.gz'), b);
  ib += b.length; imax = Math.max(imax, b.length);
});
fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta));
console.log('মোট হাদীস', recs.length, '| খণ্ড', tn, (tb / 1048576).toFixed(1) + 'MB | শব্দ', idx.size, '| সূচি', (ib / 1048576).toFixed(1) + 'MB (বড়টি ' + (imax / 1024).toFixed(0) + 'KB)');
