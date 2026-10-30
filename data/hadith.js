/* Daily Ruqyah — হাদিস পর্দা (#hadith): আরবি + বাংলা হাদীস সার্চ।
   ডেটা: data/hadith-chunks/ (বুখারী, মুসলিম, আবূ দাউদ, তিরমিযী, নাসাঈ, ইবনু মাজাহ, মালিক, নাবাবী ৪০, কুদসী ৪০ — ৩৬,১৪৬ হাদীস)।
   শব্দের রূপ: data/hadith-norm.js (ডেটা বানানোর সময়ের সাথে হুবহু এক থাকতে হবে)। প্রথমবার পর্দাটি খুললে তৈরি হয়। */
(function () {
  "use strict";
  var DV = "1";
  var D = new URL("data/hadith-chunks/", document.baseURI).href;
  var PAGE = 10;
  var $ = function (i) { return document.getElementById(i); };
  var SHORT = ["বুখারী", "মুসলিম", "আবূ দাউদ", "তিরমিযী", "নাসাঈ", "ইবনু মাজাহ", "মালিক", "নাবাবী ৪০", "কুদসী ৪০"];
  var ALIAS = [
    ["বুখারী", "বুখারি", "bukhari", "بخاري", "বোখারী"],
    ["মুসলিম", "muslim", "مسلم"],
    ["আবূদাউদ", "আবুদাউদ", "abudawud", "abudawood", "ابوداود", "আবুদাঊদ"],
    ["তিরমিযী", "তিরমিজি", "তিরমিযি", "tirmidhi", "tirmizi", "ترمذي"],
    ["নাসাঈ", "নাসায়ী", "নাসাই", "nasai", "nasa'i", "نسائي"],
    ["ইবনুমাজাহ", "ইবনেমাজাহ", "ইবনমাজাহ", "ibnmajah", "ابنماجه"],
    ["মালিক", "মুয়াত্তা", "মোয়াত্তা", "malik", "موطأ"],
    ["নাবাবী", "নববী", "নাওয়াবী", "নওয়াবী", "nawawi", "نووي"],
    ["কুদসী", "কুদসি", "qudsi", "قدسي"]
  ];


  var built = false;

  function build(host, N) {
    var META = null, memo = {}, st = null, gen = 0;
    host.innerHTML =
      '<div class="dr-hello"><b>হাদিস খুঁজুন</b><span>বাংলা বা আরবি শব্দ লিখুন, অথবা সংকলনের নাম ও নম্বর দিন (যেমন: বুখারী ১)</span></div>' +
      '<div class="rs-bar"><input id="hdQ" type="text" dir="auto" enterkeyhint="search" placeholder="হাদীসের শব্দ লিখুন (বাংলা/আরবি)" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false">' +
      '<button class="rs-ib" id="hdX" type="button" title="মুছুন">✕</button><button class="rs-ib" id="hdGo" type="button" title="সার্চ">🔍</button></div>' +
      '<div class="hd-chips" id="hdChips"></div><div class="hd-info" id="hdInfo"></div><div id="hdOut"></div>' +
      '<button type="button" class="hd-more" id="hdMore" style="display:none"></button>';
    var q = $("hdQ"), chipsEl = $("hdChips"), infoEl = $("hdInfo"), outEl = $("hdOut"), moreEl = $("hdMore");

    /* ───── ডেটা আনা (ক্যাশসহ) ───── */
    async function getJson(path) {
      var url = D + path + "?v=" + DV;
      var c = null, r = null;
      try { c = window.caches && await caches.open("hd-" + DV); r = c && await c.match(url); } catch (e) { c = null; }
      if (!r) {
        r = await fetch(url);
        if (!r.ok) throw new Error(r.status);
        try { c && await c.put(url, r.clone()); } catch (e) {}
      }
      var buf = new Uint8Array(await r.arrayBuffer());
      if (buf[0] === 0x1f && buf[1] === 0x8b) {
        if (typeof DecompressionStream === "undefined") throw new Error("এই ব্রাউজারে হাদিস সার্চ চলবে না — Chrome আপডেট করুন");
        var ds = new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip")));
        return JSON.parse(await ds.text());
      }
      return JSON.parse(new TextDecoder().decode(buf));
    }
    var active = 0, waitQ = [];
    function lim(fn) {
      return new Promise(function (ok, no) {
        var run = function () { active++; fn().then(ok, no).then(function () { active--; var n = waitQ.shift(); if (n) n(); }); };
        if (active < 5) run(); else waitQ.push(run);
      });
    }
    function load(path) {
      if (memo[path]) return memo[path];
      var p = lim(async function () {
        for (var i = 0; ; i++) {
          try { return await getJson(path); } catch (e) { if (i >= 2) throw e; await new Promise(function (z) { setTimeout(z, 400 * (i + 1)); }); }
        }
      });
      memo[path] = p;
      p.catch(function () { delete memo[path]; });
      return p;
    }
    function ensureMeta() {
      if (META) return Promise.resolve(META);
      return load("meta.json").then(function (m) { META = m; return m; });
    }
    function chunkOf(id) { return load("t/" + Math.floor(id / META.chunk) + ".json.gz"); }
    async function recOf(id) { var c = await chunkOf(id); return c[id % META.chunk]; }
    async function postings(w) {
      var sh = await load("i/" + N.shard(w) + ".json.gz");
      var d = sh[w];
      if (!d) return [];
      var out = new Array(d.length), p = 0;
      for (var i = 0; i < d.length; i++) { p += d[i]; out[i] = p; }
      return out;
    }

    /* ───── ছোট সহায়ক ───── */
    function bnum(n) { return String(n).replace(/\d/g, function (d) { return "০১২৩৪৫৬৭৮৯".charAt(d); }); }
    function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
    function norm(s) { return String(s).toLowerCase().replace(/[\s‌‍.'’‘\-]/g, ""); }
    async function copyTxt(x) {
      try { await navigator.clipboard.writeText(x); return true; } catch (e) {
        try { var t = document.createElement("textarea"); t.value = x; t.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(t); t.select(); var ok = document.execCommand("copy"); t.remove(); return ok; } catch (e2) { return false; }
      }
    }
    var HL = new RegExp(N.AR_TOKEN.source + "|" + N.BN_TOKEN.source, "g");
    function mark(text, set) {
      text = text.normalize("NFC");
      if (!set || !set.size) return esc(text);
      var out = "", last = 0;
      text.replace(HL, function (m, off) {
        out += esc(text.slice(last, off));
        var w = m.charCodeAt(0) < 0x0900 ? N.arWord(m) : N.bnWord(m);
        out += set.has(w) ? "<mark>" + esc(m) + "</mark>" : esc(m);
        last = off + m.length;
        return m;
      });
      return out + esc(text.slice(last));
    }
    function colOf(id) {
      for (var i = META.cols.length - 1; i >= 0; i--) if (id >= META.cols[i].start) return i;
      return 0;
    }

    /* ───── কার্ড ───── */
    function card(r, set) {
      var col = META.cols[r[0]];
      var el = document.createElement("div");
      el.className = "hd-card";
      var h = '<div class="hd-hd"><b>' + esc(col.bn) + "</b><span>হাদীস নং " + bnum(r[1]) + "</span>" + (r[5] ? "<span>· কিতাব " + bnum(r[5]) + "</span>" : "") + (r[4] ? '<span class="hd-gr">' + esc(r[4]) + "</span>" : "") + "</div>";
      if (r[2]) h += '<div class="hd-ar">' + mark(r[2], set) + "</div>";
      if (r[3]) h += '<div class="hd-bn">' + mark(r[3], set) + "</div>";
      else if (col.hasBn === false) h += '<div class="hd-no">(এই সংকলনের বাংলা অনুবাদ ডেটায় নেই)</div>';
      else h += '<div class="hd-no">(এই হাদীসের বাংলা অনুবাদ ডেটায় নেই)</div>';
      el.innerHTML = h;
      var ar = el.querySelector(".hd-ar"), bn = el.querySelector(".hd-bn");
      var long = (r[2] && r[2].length > 650) || (r[3] && r[3].length > 900);
      var tg = null;
      if (long) {
        if (ar) ar.classList.add("hd-clamp");
        if (bn) bn.classList.add("hd-clamp");
        tg = document.createElement("button");
        tg.type = "button"; tg.className = "hd-ex hd-tg"; tg.textContent = "▼ পুরোটা দেখুন";
        tg.onclick = function () {
          var open = !(ar || bn).classList.contains("hd-clamp");
          [ar, bn].forEach(function (x) { if (x) x.classList.toggle("hd-clamp", open); });
          tg.textContent = open ? "▼ পুরোটা দেখুন" : "▲ ছোট করুন";
        };
      }
      var cp = document.createElement("button");
      cp.type = "button"; cp.className = "hd-ex hd-tg"; cp.textContent = "📋 কপি";
      cp.onclick = async function () {
        cp.disabled = true;
        var t = col.bn + " — হাদীস নং " + r[1] + (r[5] ? " (কিতাব " + r[5] + ")" : "") + "\n" + (r[2] || "") + "\n" + (r[3] || "") + (r[4] ? "\n[" + r[4] + "]" : "");
        var ok = await copyTxt(t);
        cp.textContent = ok ? "✅ কপি হয়েছে" : "কপি করা যায়নি";
        setTimeout(function () { cp.textContent = "📋 কপি"; cp.disabled = false; }, 1500);
      };
      var row = document.createElement("div");
      if (tg) row.appendChild(tg);
      row.appendChild(cp);
      el.appendChild(row);
      return el;
    }

    /* ───── সার্চ ───── */
    function chipsDraw() {
      chipsEl.innerHTML = "";
      if (!st || !st.counts) return;
      var tot = st.counts.reduce(function (a, b) { return a + b; }, 0);
      function chip(label, n, val) {
        var b = document.createElement("button");
        b.type = "button";
        b.textContent = label + " (" + bnum(n) + ")";
        b.className = st.col === val ? "on" : "";
        b.disabled = !n && st.col !== val;
        b.onclick = function () { if (st.col !== val) { st.col = val; apply(); } };
        chipsEl.appendChild(b);
      }
      chip("সব", tot, -1);
      st.counts.forEach(function (n, i) { chip(SHORT[i], n, i); });
    }
    function inCol(ids, c) {
      if (c < 0) return ids;
      var a = META.cols[c].start, b = a + META.cols[c].count;
      return ids.filter(function (x) { return x >= a && x < b; });
    }
    function countsOf(ids) {
      var cs = META.cols.map(function () { return 0; });
      for (var i = 0; i < ids.length; i++) cs[colOf(ids[i])]++;
      return cs;
    }
    function intersect(a, b) {
      var o = [], i = 0, j = 0;
      while (i < a.length && j < b.length) { if (a[i] === b[j]) { o.push(a[i]); i++; j++; } else if (a[i] < b[j]) i++; else j++; }
      return o;
    }

    function intro() {
      outEl.innerHTML = "";
      chipsEl.innerHTML = "";
      moreEl.style.display = "none";
      infoEl.innerHTML = "";
      var t = document.createElement("div");
      t.textContent = "বুখারী, মুসলিম, আবূ দাউদ, তিরমিযী, নাসাঈ, ইবনু মাজাহ, মালিক, নাবাবী ৪০ ও কুদসী ৪০ — আরবি ও বাংলা অনুবাদসহ। বাংলা বা আরবি শব্দ লিখে সার্চ করুন, অথবা সংকলনের নাম ও নম্বর দিন।";
      infoEl.appendChild(t);
      var l = document.createElement("div");
      ["ঝাড়ফুঁক", "নজর", "الرقية", "সূরা ফাতিহা", "বুখারী ১", "নিয়্যত"].forEach(function (w) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "hd-ex"; b.textContent = w;
        b.onclick = function () { q.value = w; search(); };
        l.appendChild(b);
      });
      infoEl.appendChild(l);
    }

    function message(t) { infoEl.textContent = t; }

    async function byNumber(raw) {
      var s = raw.replace(/[০-৯]/g, function (d) { return "০১২৩৪৫৬৭৮৯".indexOf(d); }).trim();
      var m = s.match(/^(.*?)[\s:#]*(?:হাদীস|হাদিস|নং|নম্বর|no\.?)?[\s:#]*(\d{1,5})$/i) || s.match(/^(\d{1,5})[\s:#]*(.+)$/);
      if (!m) return null;
      var name = isNaN(m[1]) ? m[1] : m[2], num = isNaN(m[1]) ? +m[2] : +m[1];
      name = norm(name.replace(/(?:হাদীস|হাদিস|নং|নম্বর|no)\.?$/i, ""));
      if (!name) return null;
      var ci = -1;
      ALIAS.forEach(function (al, i) { al.forEach(function (a) { if (ci < 0 && name === norm(a)) ci = i; }); });
      if (ci < 0) return null;
      return { ci: ci, num: num };
    }
    async function findNum(ci, num) {
      var col = META.cols[ci], g = col.start + num - 1;
      g = Math.max(col.start, Math.min(col.start + col.count - 1, g));
      for (var k = 0; k < 12; k++) {
        var rec = await recOf(g);
        if (!rec) return -1;
        if (rec[0] === ci && +rec[1] === num) return g;
        var pos = rec[0] === ci ? +rec[1] : (g < col.start ? 0 : 1e9);
        var step = Math.round(num - pos);
        if (step === 0) step = pos < num ? 1 : -1;
        var ng = Math.max(col.start, Math.min(col.start + col.count - 1, g + step));
        if (ng === g) return -1;
        g = ng;
      }
      return -1;
    }

    async function search() {
      var raw = q.value.trim();
      var my = ++gen;
      moreEl.style.display = "none";
      if (!raw) { st = null; return intro(); }
      outEl.innerHTML = ""; chipsEl.innerHTML = "";
      message("⏳ খোঁজা হচ্ছে… (প্রথমবার একটু সময় লাগতে পারে)");
      try {
        await ensureMeta();
        var nm = await byNumber(raw);
        if (nm) {
          var id = await findNum(nm.ci, nm.num);
          if (my !== gen) return;
          if (id < 0) return message(SHORT[nm.ci] + "-এ " + bnum(nm.num) + " নম্বর হাদীস পাওয়া যায়নি।");
          st = { ids: [id], all: [id], toks: [], set: new Set(), page: 0, col: -1, counts: null, raw: raw };
          infoEl.textContent = "";
          return show();
        }
        var toks = Array.from(new Set(N.tokens(raw)));
        if (!toks.length) return message("বাংলা বা আরবি অক্ষরে শব্দ লিখুন (ইংরেজি অক্ষরে সার্চ চলে না)। সংকলনের নাম ও নম্বর দিয়েও খোঁজা যায়, যেমন: বুখারী ১");
        var lists = await Promise.all(toks.map(postings));
        if (my !== gen) return;
        var order = lists.map(function (l, i) { return i; }).sort(function (a, b) { return lists[a].length - lists[b].length; });
        var ids = lists[order[0]];
        for (var i = 1; i < order.length && ids.length; i++) ids = intersect(ids, lists[order[i]]);
        var note = "";
        if (!ids.length && toks.length > 1) {
          /* সব শব্দ একসাথে নেই — যেগুলোয় বেশি শব্দ মেলে সেগুলো আগে */
          var cnt = new Map();
          lists.forEach(function (l) { l.forEach(function (x) { cnt.set(x, (cnt.get(x) || 0) + 1); }); });
          ids = Array.from(cnt.keys()).sort(function (a, b) { return cnt.get(b) - cnt.get(a) || a - b; });
          if (ids.length) note = "সব শব্দ একসাথে কোনো হাদীসে নেই; যেসব হাদীসে বেশি শব্দ মেলে সেগুলো আগে দেখানো হচ্ছে।";
        }
        if (!ids.length) {
          var miss = toks.filter(function (w, i) { return !lists[i].length; });
          return message("কিছু পাওয়া যায়নি" + (miss.length ? " (“" + miss.join("”, “") + "” শব্দটি কোনো হাদীসে নেই)" : "") + "। অন্য বানানে বা অন্য শব্দে চেষ্টা করুন।");
        }
        st = { all: ids, ids: ids, toks: toks, set: new Set(toks), page: 0, col: -1, counts: countsOf(ids), raw: raw, note: note, ranked: !!note };
        apply();
      } catch (e) {
        if (my === gen) message("⚠ হাদীসের ডেটা আনা যায়নি: " + (e && e.message ? e.message : "ইন্টারনেট দেখুন") + "।");
      }
    }

    function apply() {
      st.ids = st.ranked ? (st.col < 0 ? st.all : inCol(st.all, st.col)) : inCol(st.all, st.col);
      st.page = 0;
      outEl.innerHTML = "";
      show();
    }

    async function show() {
      var my = gen;
      chipsDraw();
      var from = st.page * PAGE, part = st.ids.slice(from, from + PAGE);
      var total = st.ids.length;
      infoEl.textContent = (st.note ? st.note + " " : "") + (st.toks.length ? bnum(total) + "টি হাদীস পাওয়া গেছে" : "");
      moreEl.style.display = "none";
      try {
        var recs = await Promise.all(part.map(recOf));
        if (my !== gen) return;
        recs.forEach(function (r) { if (r) outEl.appendChild(card(r, st.set)); });
        st.page++;
        var left = total - st.page * PAGE;
        if (left > 0) { moreEl.textContent = "আরও দেখুন (বাকি " + bnum(left) + "টি)"; moreEl.style.display = "block"; }
      } catch (e) {
        if (my === gen) message("⚠ হাদীসের ডেটা আনা যায়নি: " + (e && e.message ? e.message : "ইন্টারনেট দেখুন") + "।");
      }
    }
    moreEl.onclick = function () { if (st) show(); };

    
    $("hdGo").onclick = function () { q.blur(); search(); };
    $("hdX").onclick = function () { q.value = ""; gen++; st = null; intro(); q.focus(); };
    q.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); q.blur(); search(); } });
    $("hdX").onpointerdown = $("hdGo").onpointerdown = function (e) { e.preventDefault(); };
    intro();
    ensureMeta().catch(function () {});
  }

  window.DRHadith = {
    open: function () {
      var host = $("drHadith"), N = window.HDNORM;
      if (!host || !N) return;
      if (!built) { built = true; build(host, N); }
    }
  };
})();
