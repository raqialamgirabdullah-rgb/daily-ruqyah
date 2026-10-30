// ব্যবহার: node tools/merge-shards.js <book_id> <শার্ড-ফোল্ডার> [আউটপুট-ফোল্ডার=data-src/muslimbangla]
// scrape-muslimbangla.js-এর SHARD=i/N দিয়ে বানানো অংশগুলো জোড়া লাগিয়ে একটি কিতাব-ফাইল বানায়।
const fs = require('fs');
const path = require('path');
const bookId = process.argv[2];
const inDir = process.argv[3];
const outDir = process.argv[4] || 'data-src/muslimbangla';
if (!bookId || !inDir) { console.error('Usage: node tools/merge-shards.js <book_id> <shard_dir> [out_dir]'); process.exit(1); }
const files = fs.readdirSync(inDir).filter(f => new RegExp('^' + bookId + '-.*\\.part\\d+of\\d+\\.json$').test(f)).sort();
if (!files.length) { console.error('No shard files found'); process.exit(1); }
const total = Number(/of(\d+)\.json$/.exec(files[0])[1]);
if (files.length !== total) { console.error(`Expected ${total} shards, found ${files.length}: ${files.join(', ')}`); process.exit(2); }
let head = null; const map = new Map();
for (const f of files) {
  const d = JSON.parse(fs.readFileSync(path.join(inDir, f), 'utf8'));
  if (!head) head = d;
  console.log(f, d.hadiths.length);
  for (const h of d.hadiths) if (!map.has(h.site_id)) map.set(h.site_id, h);
}
const hadiths = Array.from(map.values()).sort((a, b) => (typeof a.n === 'number' && typeof b.n === 'number') ? a.n - b.n : 0);
const nums = new Set(hadiths.map(h => h.n).filter(n => typeof n === 'number'));
const maxN = nums.size ? Math.max(...nums) : 0;
const missing = []; for (let i = 1; i <= maxN; i++) if (!nums.has(i)) missing.push(i);
const emptyBn = hadiths.filter(h => !h.bn || !h.bn.trim()).length;
const emptyAr = hadiths.filter(h => !h.ar || !h.ar.trim()).length;
console.log(`মোট ${hadiths.length} | সর্বোচ্চ নং ${maxN} | অনুপস্থিত নং ${missing.length} | খালি bn ${emptyBn} | খালি ar ${emptyAr}`);
const out = Object.assign({}, head, { scraped_at: new Date().toISOString().slice(0, 10), hadiths });
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `${head.id}-${head.k}.json`);
fs.writeFileSync(outFile, JSON.stringify(out, null, 2), 'utf8');
console.log('Saved', outFile);
