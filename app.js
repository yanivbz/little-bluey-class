const $ = s => document.querySelector(s), $$ = s => document.querySelectorAll(s);
const S = { get: (k, d) => { try { return JSON.parse(localStorage.getItem("ofir_" + k)) ?? d; } catch { return d; } },
            set: (k, v) => { try { localStorage.setItem("ofir_" + k, JSON.stringify(v)); return true; } catch { alert("אין מספיק מקום לשמירה"); return false; } } };
let lists = S.get("lists", null) || structuredClone(window.SEED_LISTS), cur = S.get("cur", lists[0]?.id);
const PRAISE = ["כל הכבוד אופיר!", "מעולה אופיר!", "את אלופה, אופיר!", "יופי של עבודה, אופיר!"];
const rnd = a => a[Math.floor(Math.random() * a.length)];
const pose = (img, p) => img.src = `assets/${p}.webp`;
$$("img[data-pose]").forEach(i => pose(i, i.dataset.pose));

// speech
let voice = null;
const lv_ = () => voice = speechSynthesis.getVoices().find(v => /^(he|iw)/i.test(v.lang)) || null;
if ("speechSynthesis" in window) { lv_(); speechSynthesis.onvoiceschanged = lv_; }
function speak(t) {
  if (!("speechSynthesis" in window)) return false;
  speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t);
  u.lang = "he-IL"; u.rate = .8; if (voice) u.voice = voice; speechSynthesis.speak(u); return !!voice;
}
const say = (el, t, talk = true) => { el.textContent = t; el.style.animation = "none"; el.offsetWidth; el.style.animation = ""; if (talk) speak(t); };
const addStar = n => { S.set("stars", S.get("stars", 0) + n); $("#tot").textContent = S.get("stars", 0); };
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
  const scr = ["full", "flash", "class"].includes(h) ? "dict" : h;
  $$(".screen").forEach(s => s.classList.toggle("on", s.id === scr));
  $("#back").style.visibility = h === "home" ? "hidden" : "visible";
  ({ dict: () => startDict(h), math: startMath, parent: renderParent, modes: renderModes })[scr]?.();
}
addEventListener("hashchange", route);
document.addEventListener("click", e => { const g = e.target.closest("[data-go]"); if (g) go(g.dataset.go); });
$("#back").onclick = () => go(["full", "flash", "class"].includes(location.hash.slice(1)) ? "modes" : "home");

function renderModes() {
  $("#listSel").innerHTML = lists.map(l => `<option value="${l.id}" ${l.id === cur ? "selected" : ""}>${l.name}</option>`).join("");
}
$("#listSel").onchange = e => S.set("cur", cur = e.target.value);

// dictation
let words = [], wi = 0, mode, ft, stage;
function startDict(m) {
  mode = m; wi = 0; words = (lists.find(l => l.id === cur) || lists[0] || { words: [] }).words;
  if (!words.length) return go("parent");
  show();
}
function show() {
  clearTimeout(ft); dots(words.length, wi); stage = 0;
  const w = words[wi], W = $("#word"), b = $("#bd");
  W.textContent = w; W.classList.remove("h"); W.hidden = false;
  $("#play").hidden = $("#again").hidden = true; $("#dPrev").hidden = mode !== "full" || wi === 0;
  pose($("#pd"), "pencil"); $("#dMain").textContent = "הבאה";
  if (mode === "full") say(b, wi ? "עכשיו את זו, אופיר" : "העתיקי למחברת, אופיר", !wi);
  if (mode === "flash") {
    say(b, "הסתכלי טוב...", false); $("#dMain").textContent = "כתבתי!";
    ft = setTimeout(() => { W.classList.add("h"); $("#again").hidden = false; say(b, "עכשיו כתבי מהזיכרון!", false); }, S.get("sec", 3) * 1000);
  }
  if (mode === "class") {
    W.hidden = true; $("#play").hidden = $("#again").hidden = false; $("#dMain").textContent = "המשך";
    say(b, "הקשיבי אופיר...", false); stage = 1;
    if (!speak(w)) { W.hidden = false; $("#play").hidden = true; say(b, "אין קול עברי במכשיר – קראי את המילה", false); }
  }
}
$("#play").onclick = $("#again").onclick = () => mode === "flash" ? show() : speak(words[wi]);
$("#dPrev").onclick = () => { wi--; show(); };
$("#dMain").onclick = () => {
  if (stage === 1) { stage = 2; $("#word").hidden = false; $("#play").hidden = $("#again").hidden = true;
    pose($("#pd"), "think"); say($("#bd"), "בדקי במחברת: ככה כותבים!", false); $("#dMain").textContent = "הבאה"; return; }
  if (wi < words.length - 1) { if (mode !== "full" && Math.random() < .35) { pose($("#pd"), "cheer"); speak(rnd(PRAISE)); } wi++; return show(); }
  addStar(1); party(); pose($("#pd"), "cheer"); dots(words.length, words.length);
  say($("#bd"), "סיימת את הרשימה! כל הכבוד אופיר!"); $("#word").hidden = false; $("#word").classList.remove("h");
  $("#word").textContent = "⭐"; $("#play").hidden = $("#again").hidden = $("#dPrev").hidden = true;
  $("#dMain").textContent = "🔁 שוב"; stage = 3;
};
// repeat handler (stage 3 -> restart)
const _dm = $("#dMain").onclick; $("#dMain").onclick = () => stage === 3 ? startDict(mode) : _dm();

// math
const LV = [["עד 10", 10, "+"], ["עד 20", 20, "+"], ["עד 29", 29, "+"], ["מה חסר?", 20, "?"], ["חיסור", 20, "-"]];
let lvl = S.get("lv", 0), q, ex, rev, aid = false, got;
$("#lv").innerHTML = LV.map((l, i) => `<button data-l="${i}">${l[0]}</button>`).join("");
$("#lv").onclick = e => { const b = e.target.closest("[data-l]"); if (b) { S.set("lv", lvl = +b.dataset.l); startMath(); } };
function startMath() { q = 0; got = 0; $$("#lv button").forEach((b, i) => b.classList.toggle("sel", i === lvl)); say($("#bmath"), "פתרי במחברת, אופיר", false); next(); }
function next() {
  const [, max, t] = LV[lvl], r = n => Math.floor(Math.random() * (n + 1));
  const s = Math.max(2, r(max)), a = r(s), b = s - a;
  ex = t === "+" ? { h: `${a} + ${b} = _`, ans: s, x: a, y: b } : t === "?" ? { h: `${a} + _ = ${s}`, ans: b, x: a, y: 0 } : { h: `${s} − ${a} = _`, ans: b, x: s, y: 0 };
  rev = false; dots(10, q); pose($("#pm"), "pencil"); $("#mMain").textContent = "בדיקה";
  $("#ex").innerHTML = ex.h.replace("_", '<span class="q">?</span>'); drawAid();
}
function drawAid() {
  const el = $("#aid"); el.innerHTML = ""; if (!aid) return;
  const fr = (n, c) => { for (let i = 0; i < n; i += 10) el.insertAdjacentHTML("beforeend", `<div class="f">${Array.from({ length: 10 }, (_, k) => `<i class="${i + k < n ? c : ""}"></i>`).join("")}</div>`); };
  fr(ex.x, "x"); fr(ex.y, "y");
}
$("#aidBtn").onclick = () => { aid = !aid; drawAid(); };
$("#mMain").onclick = () => {
  if (!rev) { rev = true; $("#ex .q").outerHTML = `<span class="a">${ex.ans}</span>`; pose($("#pm"), "think");
    say($("#bmath"), "יצא לך " + ex.ans + "?", false); $("#mMain").textContent = "המשך"; got++; return; }
  if (++q < 10) { if (Math.random() < .3) speak(rnd(PRAISE)); return next(); }
  addStar(Math.ceil(got / 3)); party(); pose($("#pm"), "cheer"); dots(10, 10);
  say($("#bmath"), "סיימת 10 תרגילים! את אלופה אופיר!"); setTimeout(startMath, 3000);
};

// parent area
let editId = null, lastTA = $("#pWords");
const NIK = [["ָ", "קמץ"], ["ַ", "פתח"], ["ֵ", "צירה"], ["ֶ", "סגול"], ["ִ", "חיריק"], ["ֹ", "חולם"], ["ֻ", "קובוץ"], ["ּ", "דגש/שורוק"], ["ְ", "שווא"], ["ֱ", "חטף סגול"], ["ֲ", "חטף פתח"], ["ֳ", "חטף קמץ"], ["ׁ", "שׁ ימנית"], ["ׂ", "שׂ שמאלית"]];
$("#nik").innerHTML = NIK.map(([m, n]) => `<button title="${n}" data-m="${m}">ב${m}</button>`).join("");
["#pWords", "#sWords"].forEach(s => $(s).addEventListener("focus", e => lastTA = e.target));
$("#nik").addEventListener("pointerdown", e => e.preventDefault());
$("#nik").onclick = e => { const m = e.target.dataset.m; if (!m) return; const t = lastTA, a = t.selectionStart;
  t.setRangeText(m, a, t.selectionEnd, "end"); t.focus(); };
const clean = s => s.normalize("NFC").split("\n").map(x => x.trim()).filter(Boolean);
function renderParent() {
  $("#plist").innerHTML = lists.map(l => `<div><span>${l.name} · ${l.words.length}${l.img ? " 📷" : ""}</span><span>
   ${l.img ? `<button data-v="${l.id}">🖼️</button>` : ""}<button data-e="${l.id}">✏️</button><button data-d="${l.id}">🗑️</button></span></div>`).join("");
  $("#sec").value = S.get("sec", 3);
}
$("#plist").onclick = e => { const d = e.target.dataset, l = lists.find(x => x.id === (d.e || d.d || d.v)); if (!l) return;
  if (d.v) { const p = $("#prev"); p.src = l.img; p.hidden = false; p.scrollIntoView({ behavior: "smooth" }); }
  if (d.e) { editId = l.id; $("#pName").value = l.name; $("#pWords").value = l.words.join("\n"); $("#prev").hidden = !l.img; if (l.img) $("#prev").src = l.img; }
  if (d.d && confirm("למחוק?")) { lists = lists.filter(x => x !== l); S.set("lists", lists); renderParent(); } };
$("#newL").onclick = () => { editId = null; $("#pName").value = $("#pWords").value = ""; $("#prev").hidden = true; $("#sugg").hidden = true; };
$("#save").onclick = () => {
  const w = clean($("#pWords").value); if (!w.length) return alert("נא להוסיף מילים");
  const name = $("#pName").value.trim() || "רשימה חדשה", img = $("#prev").hidden ? null : $("#prev").src;
  if (editId) Object.assign(lists.find(x => x.id === editId), { name, words: w, img });
  else { editId = "l" + Date.now(); lists.push({ id: editId, name, words: w, img }); S.set("cur", cur = editId); }
  if (S.set("lists", lists)) { renderParent(); $("#status").textContent = "נשמר ✔"; }
};
$("#sec").onchange = e => S.set("sec", Math.max(1, +e.target.value || 3));
const st = t => $("#status").textContent = t;
function suggest(words) { $("#sWords").value = words.join("\n"); $("#sugg").hidden = false; }
$("#okS").onclick = () => { $("#pWords").value = clean($("#sWords").value).join("\n"); $("#sugg").hidden = true; };

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

$("#tot").textContent = S.get("stars", 0);
route();

// PWA install
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
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
