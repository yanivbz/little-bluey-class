const $ = s => document.querySelector(s), $$ = s => document.querySelectorAll(s);
const S = { get: (k, d) => { try { return JSON.parse(localStorage.getItem("ofir_" + k)) ?? d; } catch { return d; } },
            set: (k, v) => { try { localStorage.setItem("ofir_" + k, JSON.stringify(v)); return true; } catch { alert("אין מספיק מקום לשמירה"); return false; } } };
const _set = S.set; S.set = (k, v) => _set(k, k === "lists" ? v.filter(l => !l.builtin) : v);
let lists = [...structuredClone(window.SEED_LISTS), ...S.get("lists", []).filter(l => !l.builtin && l.id !== "sample" && l.id !== "week")];
let cur = S.get("cur", null); if (!lists.some(l => l.id === cur) || lists.every(l => l.builtin)) cur = "week";
const PRAISE = ["כל הכבוד אופיר!", "מעולה אופיר!", "את אלופה, אופיר!", "יופי של עבודה, אופיר!"];
const rnd = a => a[Math.floor(Math.random() * a.length)];
const pose = (img, p) => img.src = `assets/${p}.webp`;
$$("img[data-pose]").forEach(i => pose(i, i.dataset.pose));

// speech
let voice = null;
const TTS = "speechSynthesis" in window;
const lv_ = () => voice = speechSynthesis.getVoices().find(v => /^(he|iw)([-_]|$)/i.test(v.lang)) || null;
if (TTS) { lv_(); speechSynthesis.addEventListener?.("voiceschanged", lv_); }
function speak(t) { // call synchronously from a tap handler
  if (!TTS) return false; if (!voice) lv_();
  speechSynthesis.cancel(); speechSynthesis.resume(); const u = new SpeechSynthesisUtterance(t);
  u.lang = "he-IL"; u.rate = .8; if (voice) u.voice = voice; speechSynthesis.speak(u); return !!voice;
}
const say = (el, t, talk = true) => { el.textContent = t; el.style.animation = "none"; el.offsetWidth; el.style.animation = ""; if (talk) speak(t); };
if (!S.get("coinMig", false)) { S.set("coins", S.get("coins", 0) + S.get("stars", 0)); S.set("coinMig", true); }
const coins = () => S.get("coins", 0);
const showCoins = () => $$(".coinN").forEach(e => e.textContent = coins());
const addCoin = n => { S.set("coins", coins() + n); showCoins(); };
function party() {
  const c = ["#F8B49A", "#C9B6E8", "#9fd8b2", "#ffd77a"];
  for (let i = 0; i < 30; i++) { const s = document.createElement("span");
    Object.assign(s.style, { left: Math.random() * 100 + "%", background: rnd(c), animationDelay: Math.random() * .6 + "s" });
    $("#fx").append(s); setTimeout(() => s.remove(), 2600); }
}
const dots = (n, i) => $("#dots").innerHTML = n ? Array.from({ length: n }, (_, k) => `<i class="${k < i ? "done" : k === i ? "on" : ""}"></i>`).join("") : "";

// routing
const go = h => location.hash = h;
function route() {
  const h = location.hash.slice(1) || "home"; clearTimeout(ft); dots(0);
  const scr = ["full", "flash", "class", "hard"].includes(h) ? "dict" : h;
  $$(".screen").forEach(s => s.classList.toggle("on", s.id === scr));
  $("#back").hidden = h === "home"; $("#gear").hidden = h !== "home";
  ({ dict: () => startDict(h), math: startMath, parent: renderParent, room: () => window.renderRoom?.(), modes: renderModes })[scr]?.();
}
addEventListener("hashchange", route);
document.addEventListener("click", e => { const g = e.target.closest("[data-go]"); if (g) go(g.dataset.go); });
$("#back").onclick = () => go(["full", "flash", "class", "hard"].includes(location.hash.slice(1)) ? "modes" : "home");

function renderModes() {
  $("#listSel").innerHTML = lists.map(l => `<option value="${l.id}" ${l.id === cur ? "selected" : ""}>${l.name}</option>`).join("");
  const n = Object.keys(hardOf()).length; $("#hardBtn").hidden = !n; $("#hardN").textContent = n;
}
$("#listSel").onchange = e => { S.set("cur", cur = e.target.value); renderModes(); };

// voice recordings (IndexedDB)
const DB = new Promise(ok => { const r = indexedDB.open("pt", 1); r.onupgradeneeded = () => r.result.createObjectStore("rec"); r.onsuccess = () => ok(r.result); r.onerror = () => ok(null); });
const rec = async (mode, key, val) => { const db = await DB; if (!db) return null; return new Promise(ok => {
  const s = db.transaction("rec", mode === "get" ? "readonly" : "readwrite").objectStore("rec");
  const q = mode === "get" ? s.get(key) : mode === "put" ? s.put(val, key) : s.delete(key); q.onsuccess = () => ok(q.result); q.onerror = () => ok(null); }); };
const recKey = (lid, w) => lid + "|" + w;
let audio, recUrls = {};
async function loadRecs() { // cache parent recordings so playback stays synchronous in tap handlers
  const l = curList(); recUrls = {};
  for (const w of l.words) { const b = await rec("get", recKey(l.id, w)); if (b) recUrls[w] = URL.createObjectURL(b); }
}
function playUrl(u) { if (TTS) speechSynthesis.cancel(); audio?.pause(); audio = new Audio(u); audio.play().catch(() => {}); return true; }
function sayWord(w) { // bundled audio -> parent recording -> device TTS
  const l = curList(), i = l.audio ? l.words.indexOf(w) : -1;
  if (i >= 0 && l.audio[i]) return playUrl(`assets/audio/${l.audio[i]}.mp3`);
  if (recUrls[w]) return playUrl(recUrls[w]);
  return speak(w);
}

// hard words
const curList = () => lists.find(l => l.id === cur) || lists[0] || { id: "", words: [] };
const hardOf = () => S.get("hard_" + curList().id, {});
function markWord(w, ok) {
  const h = hardOf();
  if (!ok) h[w] = 0; else if (w in h) { if (++h[w] >= 2) delete h[w]; }
  S.set("hard_" + curList().id, h);
}

// dictation
let words = [], wi = 0, mode, ft, stage;
function startDict(m) {
  const all = curList().words, h = hardOf();
  mode = m === "hard" ? "class" : m;
  words = m === "hard" ? all.filter(w => w in h) : [...all.filter(w => w in h), ...all.filter(w => !(w in h))];
  wi = 0; if (!words.length) return go(m === "hard" ? "modes" : "parent");
  show(); loadRecs();
}
function reveal() {
  stage = 2; const W = $("#word"); W.hidden = false; W.classList.remove("h");
  $("#play").hidden = $("#again").hidden = true; $("#review").hidden = false;
  pose($("#pd"), "think"); say($("#bd"), "בדקי במחברת – כתבת נכון?", false); $("#dMain").textContent = "הבאה";
}
function show() {
  clearTimeout(ft); $("#ttsHint").hidden = true; dots(words.length, wi); stage = 0; $("#review").hidden = true;
  const w = words[wi], W = $("#word"), b = $("#bd");
  W.textContent = w; W.classList.remove("h"); W.hidden = false;
  $("#play").hidden = $("#again").hidden = true; $("#dPrev").hidden = mode !== "full" || wi === 0;
  pose($("#pd"), "pencil"); $("#dMain").textContent = "הבאה";
  if (mode === "full") say(b, wi ? "עכשיו את זו, אופיר" : "העתיקי למחברת, אופיר", !wi);
  if (mode === "flash") {
    say(b, "הסתכלי טוב...", false); $("#dMain").textContent = "כתבתי!"; stage = 1;
    ft = setTimeout(() => { W.classList.add("h"); $("#again").hidden = false; say(b, "עכשיו כתבי מהזיכרון!", false); }, S.get("sec", 3) * 1000);
  }
  if (mode === "class") {
    W.hidden = true; $("#play").hidden = $("#again").hidden = false; $("#dMain").textContent = "המשך";
    say(b, "הקשיבי אופיר...", false); stage = 1;
    if (!sayWord(w)) { W.hidden = false; say(b, "קראי את המילה, אופיר", false);
      $("#ttsHint").hidden = false; }
  }
}
$("#play").onclick = $("#again").onclick = () => mode === "flash" ? show() : sayWord(words[wi]);
$("#dPrev").onclick = () => { wi--; show(); };
$("#review").onclick = e => { const b = e.target.closest("[data-ok]"); if (!b) return;
  const ok = b.dataset.ok === "1"; markWord(words[wi], ok); if (ok) addCoin(1);
  say($("#bd"), ok ? rnd(PRAISE) : "לא נורא, נתרגל אותה שוב, אופיר 💪", ok); if (ok) pose($("#pd"), "cheer");
  $("#review").hidden = true; };
$("#dMain").onclick = () => {
  if (stage === 3) return startDict(location.hash.slice(1));
  if (stage === 1) return reveal();
  if (wi < words.length - 1) { wi++; return show(); }
  addCoin(3 + (mode === "full" || mode === "flash" ? words.length : 0)); party(); pose($("#pd"), "cheer"); dots(words.length, words.length); $("#review").hidden = true;
  say($("#bd"), "סיימת את הרשימה! כל הכבוד אופיר!"); $("#word").hidden = false; $("#word").classList.remove("h");
  $("#word").textContent = "⭐"; $("#play").hidden = $("#again").hidden = $("#dPrev").hidden = true;
  $("#dMain").textContent = "🔁 שוב"; stage = 3;
};

// math (answer on screen by tapping a choice)
const LV = [["עד 10", 10, "+"], ["עד 20", 20, "+"], ["עד 29", 29, "+"], ["מה חסר?", 20, "?"], ["חיסור", 20, "-"]];
let lvl = S.get("lv", 0), q, ex, aid = false, got, miss, lock;
$("#lv").innerHTML = LV.map((l, i) => `<button data-l="${i}">${l[0]}</button>`).join("");
$("#lv").onclick = e => { const b = e.target.closest("[data-l]"); if (b) { S.set("lv", lvl = +b.dataset.l); startMath(); } };
function startMath() { q = 0; got = 0; $$("#lv button").forEach((b, i) => b.classList.toggle("sel", i === lvl)); say($("#bmath"), "בחרי את התשובה, אופיר", false); next(); }
function choices(ans, max) {
  const set = new Set([ans]), c = [1, -1, 2, -2, 3, -3, 10, -10].sort(() => Math.random() - .5);
  for (const d of c) { const v = ans + d; if (set.size < 4 && v >= 0 && v <= max) set.add(v); }
  return [...set].sort(() => Math.random() - .5);
}
function next() {
  const [, max, t] = LV[lvl], r = n => Math.floor(Math.random() * (n + 1));
  const s = Math.max(2, r(max)), a = r(s), b = s - a;
  ex = t === "+" ? { h: `${a} + ${b} = _`, ans: s, x: a, y: b } : t === "?" ? { h: `${a} + _ = ${s}`, ans: b, x: a, y: 0 } : { h: `${s} − ${a} = _`, ans: b, x: s, y: 0 };
  miss = 0; lock = false; dots(10, q); pose($("#pm"), "pencil");
  $("#ex").innerHTML = ex.h.replace("_", '<span class="q">?</span>'); drawAid();
  $("#ch").innerHTML = choices(ex.ans, max).map(v => `<button data-v="${v}">${v}</button>`).join("");
}
function drawAid() {
  const el = $("#aid"); el.innerHTML = ""; if (!aid) return;
  const fr = (n, c) => { for (let i = 0; i < n; i += 10) el.insertAdjacentHTML("beforeend", `<div class="f">${Array.from({ length: 10 }, (_, k) => `<i class="${i + k < n ? c : ""}"></i>`).join("")}</div>`); };
  fr(ex.x, "x"); fr(ex.y, "y");
}
$("#aidBtn").onclick = () => { aid = !aid; drawAid(); };
$("#ch").onclick = e => {
  const b = e.target.closest("[data-v]"); if (!b || lock || b.disabled) return;
  if (+b.dataset.v === ex.ans) {
    lock = true; b.classList.add("ok"); $("#ex .q").outerHTML = `<span class="a">${ex.ans}</span>`;
    pose($("#pm"), "cheer"); if (!miss) got++; addCoin(1); say($("#bmath"), rnd(PRAISE), Math.random() < .5);
    setTimeout(() => { if (++q < 10) return next();
      addCoin(3); party(); dots(10, 10);
      say($("#bmath"), "סיימת 10 תרגילים! את אלופה אופיר!"); setTimeout(startMath, 3200); }, 1300);
  } else {
    miss++; b.classList.add("no"); b.disabled = true; pose($("#pm"), "think");
    say($("#bmath"), miss > 1 ? "הנה התשובה הנכונה – לחצי עליה" : "כמעט! נסי שוב, אופיר", false);
    if (miss > 1) $(`#ch [data-v="${ex.ans}"]`).classList.add("hint");
  }
};

// parent area
let editId = null;
// ---- nikud helpers (pure) ----
const isMark = c => /[\u0591-\u05C7]/.test(c);
const VOW = c => /[\u05B0-\u05BB\u05C7]/.test(c), DAG = c => c === "\u05BC", SHD = c => c === "\u05C1" || c === "\u05C2";
function setMark(cl, m) {
  if (m === "") return cl[0];
  const cls = VOW(m) ? VOW : DAG(m) ? DAG : SHD, ms = [...cl.slice(1)], had = ms.includes(m);
  const rest = ms.filter(c => !cls(c)); if (!had) rest.push(m);
  return (cl[0] + rest.join("")).normalize("NFC");
}
const clusters = w => w.match(/[^\u0591-\u05C7][\u0591-\u05C7]*/g) || [];
// ---- toolbar ----
const NIK = [["ַ", "פתח"], ["ָ", "קמץ"], ["ֵ", "צירה"], ["ֶ", "סגול"], ["ִ", "חיריק"], ["ֹ", "חולם"], ["ֻ", "קובוץ"], ["ְ", "שווא"], ["ֲ", "חטף פתח"], ["ֱ", "חטף סגול"], ["ֳ", "חטף קמץ"], ["ּ", "דגש / שורוק"], ["ׁ", "שׁ"], ["ׂ", "שׂ"], ["", "ניקוי"]];
const TA = $("#pWords"); let sel = { s: 0, e: 0 }, chip = null; // chip = {line, idx}
const keepSel = () => { sel = { s: TA.selectionStart, e: TA.selectionEnd }; chip = null; $$("#letters button").forEach(b => b.classList.remove("sel")); preview(); };
["keyup", "click", "input", "select", "focus"].forEach(ev => TA.addEventListener(ev, keepSel));
document.addEventListener("selectionchange", () => { if (document.activeElement === TA) keepSel(); });
function taCluster() { // letter cluster ending at/just before caret
  const v = TA.value; let i = sel.s; if (!i) return null;
  let j = i; while (j > 0 && isMark(v[j - 1])) j--; const st = j - 1; if (st < 0 || /\s/.test(v[st])) return null;
  let en = st + 1; while (en < v.length && isMark(v[en])) en++;
  return { st, en, cl: v.slice(st, en) };
}
function target() {
  if (chip) { const w = lines()[chip.line], c = clusters(w); return c[chip.idx] ? { cl: c[chip.idx] } : null; }
  return taCluster();
}
function preview() {
  const t = target(), L = t ? t.cl[0] : "א";
  $("#nik").innerHTML = NIK.map(([m, n]) => `<button title="${n}" data-m="${m}">${m === "" ? "✖" : (t ? setMark(t.cl, m) : L + m)}</button>`).join("");
}
$("#nik").addEventListener("pointerdown", e => e.preventDefault()); // keep keyboard/selection
$("#nik").onclick = e => {
  const b = e.target.closest("[data-m]"); if (!b) return; const m = b.dataset.m, t = target(); if (!t) return;
  if (chip) { const ls = lines(), c = clusters(ls[chip.line]); c[chip.idx] = setMark(c[chip.idx], m); ls[chip.line] = c.join(""); TA.value = ls.join("\n"); showLetters(chip.line, chip.idx); }
  else { const nw = setMark(t.cl, m); TA.setRangeText(nw, t.st, t.en, "end"); sel = { s: t.st + nw.length, e: t.st + nw.length }; TA.setSelectionRange(sel.s, sel.s); preview(); }
  renderWords();
};
// ---- word editor ----
const lines = () => TA.value.split("\n");
function renderWords() { $("#wlist").innerHTML = lines().map((w, i) => w.trim() ? `<button data-w="${i}">${w}</button>` : "").join(""); }
function showLetters(li, sIdx = null) {
  $("#letters").innerHTML = clusters(lines()[li]).map((c, i) => `<button data-c="${i}" class="${i === sIdx ? "sel" : ""}">${c}</button>`).join("");
  $("#letters").dataset.line = li;
}
TA.addEventListener("input", renderWords);
$("#wlist").onclick = e => { const b = e.target.closest("[data-w]"); if (b) { TA.blur(); chip = null; showLetters(+b.dataset.w); preview(); } };
$("#letters").onclick = e => { const b = e.target.closest("[data-c]"); if (!b) return;
  chip = { line: +$("#letters").dataset.line, idx: +b.dataset.c }; showLetters(chip.line, chip.idx); preview(); };
window.__nik = { setMark, clusters };
const clean = s => s.normalize("NFC").split("\n").map(x => x.trim()).filter(Boolean);
function renderParent() {
  $("#plist").innerHTML = lists.map(l => `<div><span>${l.name} · ${l.words.length}${l.img ? " 📷" : ""}</span><span>
   ${l.img ? `<button data-v="${l.id}">🖼️</button>` : ""}<button data-e="${l.id}">✏️</button>${l.builtin ? "" : `<button data-d="${l.id}">🗑️</button>`}</span></div>`).join("");
  $("#sec").value = S.get("sec", 3); renderWords(); preview();
}
$("#plist").onclick = e => { const d = e.target.dataset, l = lists.find(x => x.id === (d.e || d.d || d.v)); if (!l) return;
  if (d.v) { const p = $("#prev"); p.src = l.img; p.hidden = false; p.scrollIntoView({ behavior: "smooth" }); }
  if (d.e) { editId = l.id; $("#pName").value = l.name; $("#pWords").value = l.words.join("\n"); renderWords(); $("#letters").innerHTML = ""; renderRecs(); $("#prev").hidden = !l.img; if (l.img) $("#prev").src = l.img; }
  if (d.d && confirm("למחוק?")) { lists = lists.filter(x => x !== l); S.set("lists", lists); renderParent(); } };
$("#newL").onclick = () => { editId = null; $("#pName").value = $("#pWords").value = ""; $("#prev").hidden = true; $("#sugg").hidden = true; renderRecs(); };
$("#save").onclick = () => {
  const w = clean($("#pWords").value); if (!w.length) return alert("נא להוסיף מילים");
  const name = $("#pName").value.trim() || "רשימה חדשה", img = $("#prev").hidden ? null : $("#prev").src;
  if (lists.find(x => x.id === editId)?.builtin) editId = null;
  if (editId) Object.assign(lists.find(x => x.id === editId), { name, words: w, img });
  else { editId = "l" + Date.now(); lists.push({ id: editId, name, words: w, img }); S.set("cur", cur = editId); }
  if (S.set("lists", lists)) { renderParent(); renderRecs(); $("#status").textContent = "נשמר ✔"; }
};
$("#sec").onchange = e => S.set("sec", Math.max(1, +e.target.value || 3));
const st = t => $("#status").textContent = t;
function suggest(words) { $("#sWords").value = words.join("\n"); $("#sugg").hidden = false; }
$("#okS").onclick = () => { $("#pWords").value = clean($("#sWords").value).join("\n"); $("#sugg").hidden = true; renderWords(); };

// Dicta Nakdan (CORS open; text/plain avoids preflight)
$("#auto").onclick = async () => {
  const src = clean($("#pWords").value).map(w => w.replace(/[\u0591-\u05C7]/g, "")); if (!src.length) return st("כתבו קודם מילים");
  st("⏳ מנקד...");
  try {
    const r = await fetch("https://nakdan-2-0.loadbalancer.dicta.org.il/api", { method: "POST", headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify({ task: "nakdan", data: src.join("\n"), genre: "modern" }) });
    const j = await r.json();
    const out = j.map(t => t.sep ? t.word : (t.options?.[0] || t.word).replace(/\|/g, "")).join("");
    suggest(clean(out)); st("בדקו את הניקוד ואשרו");
  } catch { st("השירות לא זמין. אפשר לנקד ב-nakdan.dicta.org.il ולהדביק כאן."); open("https://nakdan.dicta.org.il", "_blank"); }
};

// photo: compress + OCR
$("#photoBtn").onclick = () => $("#img").click();
$("#img").onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  const bmp = await createImageBitmap(f), k = Math.min(1, 1000 / Math.max(bmp.width, bmp.height));
  const c = Object.assign(document.createElement("canvas"), { width: bmp.width * k, height: bmp.height * k });
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  const p = $("#prev"); p.src = c.toDataURL("image/jpeg", .6); p.hidden = false;
  st("⏳ מזהה מילים מהתמונה... (בפעם הראשונה זה לוקח קצת זמן)");
  try {
    if (!window.Tesseract) await new Promise((ok, no) => { const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"; s.onload = ok; s.onerror = no; document.head.append(s); });
    const { data } = await Tesseract.recognize(c, "heb", { logger: m => m.progress && st(`⏳ ${m.status} ${Math.round(m.progress * 100)}%`) });
    const w = data.text.normalize("NFC").split(/[\s,.;:]+/).map(x => x.replace(/[^\u0590-\u05FF]/g, "")).filter(x => x.length > 1);
    w.length ? (suggest([...new Set(w)]), st("זה מה שזוהה – ערכו ואשרו")) : st("לא זוהו מילים. התמונה נשמרה, אפשר להקליד ידנית.");
  } catch { st("הזיהוי נכשל. התמונה נשמרה, אפשר להקליד ידנית."); }
};

showCoins(); loadRecs();
route();

// parent voice recordings per word (optional)
async function renderRecs() {
  const l = lists.find(x => x.id === editId); $("#recs").hidden = !l || !window.MediaRecorder; if ($("#recs").hidden) return;
  const rows = await Promise.all(l.words.map(async (w, i) => `<div class="rec" data-i="${i}"><span>${w}</span>
    <button data-a="r">🎙️</button>${await rec("get", recKey(l.id, w)) ? '<button data-a="p">▶️</button><button data-a="d">🗑️</button>' : ""}</div>`));
  $("#recList").innerHTML = rows.join("");
}
$("#recList").onclick = async e => {
  const b = e.target.closest("[data-a]"); if (!b) return; const l = lists.find(x => x.id === editId), w = l.words[+b.closest(".rec").dataset.i], k = recKey(l.id, w);
  if (b.dataset.a === "p") { const bl = await rec("get", k); if (bl) new Audio(URL.createObjectURL(bl)).play(); }
  if (b.dataset.a === "d") { await rec("del", k); renderRecs(); }
  if (b.dataset.a === "r") {
    try {
      const st = await navigator.mediaDevices.getUserMedia({ audio: true }), mr = new MediaRecorder(st), ch = [];
      b.textContent = "⏺️"; b.classList.add("live");
      mr.ondataavailable = ev => ch.push(ev.data);
      mr.onstop = async () => { st.getTracks().forEach(t => t.stop()); await rec("put", k, new Blob(ch, { type: mr.mimeType })); renderRecs(); loadRecs(); };
      mr.start(); b.onclick = () => mr.state === "recording" && mr.stop(); setTimeout(() => mr.state === "recording" && mr.stop(), 3000);
    } catch { st("אין גישה למיקרופון"); }
  }
};

// PWA install
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").then(reg => {
  const ask = w => { const t = $("#toast"); t.hidden = false; $("#upd").onclick = () => w.postMessage("skip"); };
  if (reg.waiting && navigator.serviceWorker.controller) ask(reg.waiting);
  reg.onupdatefound = () => { const w = reg.installing; w.onstatechange = () => w.state === "installed" && navigator.serviceWorker.controller && ask(w); };
  let done; navigator.serviceWorker.oncontrollerchange = () => { if (!done) { done = 1; location.reload(); } };
}).catch(() => {});
const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
let deferred = null; const ib = $("#install");
if (!standalone && isIOS) ib.hidden = false;
addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferred = e; if (!standalone) ib.hidden = false; });
addEventListener("appinstalled", () => ib.hidden = true);
ib.onclick = async () => {
  if (deferred) { deferred.prompt(); const { outcome } = await deferred.userChoice; deferred = null; if (outcome === "accepted") ib.hidden = true; }
  else $("#iosSheet").hidden = false;
};
$("#sheetOk").onclick = () => $("#iosSheet").hidden = true;
