const $ = s => document.querySelector(s);
const store = {
  get: (k, d) => { try { return JSON.parse(localStorage.getItem("ofir_" + k)) ?? d; } catch { return d; } },
  set: (k, v) => localStorage.setItem("ofir_" + k, JSON.stringify(v))
};
let lists = store.get("lists", null) || structuredClone(window.SEED_LISTS);
let cur = store.get("cur", lists[0]?.id), editId = null;
const PRAISE = ["כל הכבוד אופיר!", "מעולה אופיר!", "וואו, אופיר, איזה יופי!", "את אלופה אופיר!", "יופי של עבודה אופיר!"];
const rnd = a => a[Math.floor(Math.random() * a.length)];

// ---- Characters (original drawings) ----
const pup = (main, light, dark, name) => `<svg viewBox="0 0 120 120" aria-hidden="true">
 <path d="M28 40 L22 8 L48 30Z M92 40 L98 8 L72 30Z" fill="${dark}"/>
 <ellipse cx="60" cy="62" rx="40" ry="36" fill="${main}"/>
 <ellipse cx="60" cy="78" rx="24" ry="18" fill="${light}"/>
 <ellipse cx="42" cy="52" rx="12" ry="10" fill="${dark}" opacity=".5"/>
 <circle cx="46" cy="56" r="6" fill="#222"/><circle cx="74" cy="56" r="6" fill="#222"/>
 <circle cx="48" cy="54" r="2" fill="#fff"/><circle cx="76" cy="54" r="2" fill="#fff"/>
 <ellipse cx="60" cy="70" rx="6" ry="4.5" fill="#222"/>
 <path d="M52 80 Q60 88 68 80" stroke="#222" stroke-width="3" fill="none" stroke-linecap="round"/>
 <circle cx="36" cy="72" r="5" fill="#ff9fb2" opacity=".7"/><circle cx="84" cy="72" r="5" fill="#ff9fb2" opacity=".7"/>
</svg><div>${name}</div>`;
$("#pupB").innerHTML = pup("#5aa7e8", "#cfe8ff", "#2f5f9e", "בלואי 👩‍🏫");
$("#pupG").innerHTML = pup("#f6a04d", "#ffe2bf", "#c4662a", "בינגו");

// ---- Speech ----
let heVoice = null;
const loadVoices = () => heVoice = speechSynthesis?.getVoices().find(v => /^he|iw/i.test(v.lang)) || null;
if ("speechSynthesis" in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
function speak(t) {
  if (!("speechSynthesis" in window)) return false;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(t);
  u.lang = "he-IL"; u.rate = 0.8; if (heVoice) u.voice = heVoice;
  speechSynthesis.speak(u); return !!heVoice;
}
function say(t, talk = true) { $("#bubble").textContent = t; if (talk) speak(t); }
function stars(n) {
  store.set("stars", store.get("stars", 0) + n); $("#totStars").textContent = store.get("stars", 0);
}
function party() {
  const c = $("#confetti");
  for (let i = 0; i < 24; i++) {
    const s = document.createElement("span"); s.textContent = rnd(["⭐", "🎉", "🐾", "💙", "🧡"]);
    s.style.left = Math.random() * 100 + "%"; s.style.animationDelay = Math.random() * .5 + "s";
    c.appendChild(s); setTimeout(() => s.remove(), 2200);
  }
}
const btn = (txt, cls, fn) => { const b = document.createElement("button"); b.className = "big " + cls; b.innerHTML = txt; b.onclick = fn; return b; };

// ---- Routing ----
function go(name) { location.hash = name; }
function route() {
  const h = location.hash.slice(1) || "home";
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("on"));
  clearTimeout(flashT);
  if (["full", "flash", "class"].includes(h)) { $("#dict").classList.add("on"); startDict(h); }
  else if (h === "math") { $("#math").classList.add("on"); startMath(); }
  else if (h === "parent") { $("#parent").classList.add("on"); renderParent(); say("שלום! כאן ההורים עורכים את רשימות המילים.", false); }
  else { $("#home").classList.add("on"); renderHome(); }
}
document.addEventListener("click", e => { const g = e.target.closest("[data-go]"); if (g) go(g.dataset.go); });
$("#homeBtn").onclick = () => go("home");
window.addEventListener("hashchange", route);

// ---- Home ----
function renderHome() {
  $("#listSel").innerHTML = lists.map(l => `<option value="${l.id}" ${l.id === cur ? "selected" : ""}>${l.name}</option>`).join("");
  say("שלום אופיר! מה נלמד היום?", false);
}
$("#listSel").onchange = e => { cur = e.target.value; store.set("cur", cur); };

// ---- Dictation ----
let words = [], wi = 0, mode = "", flashT;
function startDict(m) {
  mode = m; wi = 0;
  words = (lists.find(l => l.id === cur) || lists[0] || { words: [] }).words;
  if (!words.length) { $("#dWord").textContent = "אין מילים"; $("#dBtns").innerHTML = ""; return; }
  say({ full: "בואי נעתיק את המילים למחברת!", flash: "תסתכלי טוב, ואז תכתבי מהזיכרון!", class: "תקשיבי טוב ותכתבי במחברת." }[m]);
  setTimeout(showWord, m === "full" ? 0 : 1800);
}
function showWord() {
  clearTimeout(flashT);
  const w = words[wi], el = $("#dWord"), b = $("#dBtns"); b.innerHTML = "";
  $("#dProg").textContent = `מילה ${wi + 1} מתוך ${words.length}`;
  el.textContent = w; el.classList.remove("hidden");
  if (mode === "full") {
    b.append(btn("➡️ הקודמת", "b", () => { if (wi > 0) { wi--; showWord(); } }),
             btn("הבאה ⬅️", "o", next));
  } else if (mode === "flash") {
    const sec = store.get("flashSec", 3);
    flashT = setTimeout(() => { el.classList.add("hidden"); say("עכשיו תכתבי במחברת!", false);
      b.append(btn("👀 להראות שוב", "v", showWord), btn("כתבתי! ⬅️", "o", next)); }, sec * 1000);
  } else {
    el.classList.add("hidden");
    const ok = speak(w);
    if (!ok) { el.classList.remove("hidden"); say("אין קול עברי במכשיר – אפשר לקרוא את המילה ✨", false); }
    b.append(btn("🔊 שוב", "b", () => speak(w)),
      btn("המשך ⬅️", "o", () => { el.classList.remove("hidden"); say("בדקי במחברת: ככה כותבים!", false); b.innerHTML = "";
        b.append(btn("הבאה ⬅️", "g", next)); }));
  }
}
function next() {
  if (mode !== "full" && Math.random() < .4) say(rnd(PRAISE));
  if (wi < words.length - 1) { wi++; showWord(); return; }
  stars(1); party(); say("סיימת את כל הרשימה! כל הכבוד אופיר! ⭐");
  $("#dWord").textContent = "🏆"; $("#dProg").textContent = "";
  $("#dBtns").innerHTML = ""; $("#dBtns").append(btn("🔁 שוב את הרשימה", "o", () => startDict(mode)), btn("🏠 בית", "b", () => go("home")));
}

// ---- Math ----
const LEVELS = [["עד 10", 10, "add"], ["עד 20", 20, "add"], ["עד 29", 29, "add"], ["מה חסר?", 20, "miss"], ["חיסור", 20, "sub"]];
let lv = store.get("lv", 0), q = 0, ex, revealed = false, aid = false, mStars = 0;
$("#lv").innerHTML = LEVELS.map((l, i) => `<button data-lv="${i}">${l[0]}</button>`).join("");
$("#lv").onclick = e => { const b = e.target.closest("[data-lv]"); if (b) { lv = +b.dataset.lv; store.set("lv", lv); startMath(); } };
function startMath() {
  q = 0; mStars = 0; $("#mStars").textContent = "";
  document.querySelectorAll("#lv button").forEach((b, i) => b.classList.toggle("sel", i === lv));
  say("בואי נפתור תרגילים במחברת!", false); newEx();
}
function newEx() {
  const [, max, type] = LEVELS[lv], r = n => Math.floor(Math.random() * (n + 1));
  const s = Math.max(2, r(max)), a = r(s), b = s - a;
  ex = type === "add" ? { t: `${a} + ${b} = `, ans: s, a, b } :
       type === "miss" ? { t: `${a} + ? = ${s}`, ans: b, a, b } :
       { t: `${s} − ${a} = `, ans: b, a: s, b: -a };
  revealed = false; $("#mProg").textContent = `תרגיל ${q + 1} מתוך 10`;
  $("#ex").innerHTML = ex.t.replace("?", "<span>?</span>") + (type !== "miss" ? "<span>?</span>" : "");
  $("#mBtn").textContent = "בדיקה ✔️"; drawAid();
}
function drawAid() {
  const d = $("#dots"); d.innerHTML = ""; if (!aid) return;
  const frames = (n, cls, start = 0) => { let i = 0;
    while (i < Math.abs(n) || i === 0 && n === 0) { if (n === 0) break;
      const f = document.createElement("div"); f.className = "frame";
      for (let k = 0; k < 10; k++) { const c = document.createElement("i"); if (i < Math.abs(n)) { c.className = cls; i++; } f.append(c); }
      d.append(f); } };
  if (ex.b < 0) frames(ex.a, "a"); else { frames(ex.a, "a"); frames(ex.b, "c"); }
}
$("#aidBtn").onclick = () => { aid = !aid; drawAid(); };
$("#mBtn").onclick = () => {
  if (!revealed) {
    revealed = true; $("#ex").querySelector("span").outerHTML = `<span class="ans">${ex.ans}</span>`;
    $("#mBtn").textContent = "המשך ⬅️"; say("זה נכון אצלך? " + rnd(PRAISE)); mStars++; $("#mStars").textContent = "⭐".repeat(mStars);
  } else if (++q < 10) newEx();
  else { stars(mStars); party(); say("סיימת 10 תרגילים! את אלופה אופיר!"); setTimeout(startMath, 2500); }
};

// ---- Parent area ----
function renderParent() {
  $("#lists").innerHTML = lists.map(l => `<div><span>${l.name} (${l.words.length})</span><span>
    <button data-ed="${l.id}">✏️ עריכה</button><button data-del="${l.id}">🗑️</button></span></div>`).join("");
  $("#flashSec").value = store.get("flashSec", 3);
}
$("#lists").onclick = e => {
  const ed = e.target.dataset.ed, del = e.target.dataset.del;
  if (ed) { const l = lists.find(x => x.id === ed); editId = ed; $("#pName").value = l.name; $("#pWords").value = l.words.join("\n"); }
  if (del && confirm("למחוק את הרשימה?")) { lists = lists.filter(x => x.id !== del); store.set("lists", lists); renderParent(); }
};
$("#newList").onclick = () => { editId = null; $("#pName").value = ""; $("#pWords").value = ""; $("#pName").focus(); };
$("#saveList").onclick = () => {
  const name = $("#pName").value.trim() || "רשימה חדשה", w = $("#pWords").value.split("\n").map(s => s.trim()).filter(Boolean);
  if (!w.length) return alert("נא להוסיף מילים");
  if (editId) Object.assign(lists.find(x => x.id === editId), { name, words: w });
  else { editId = "l" + Date.now(); lists.push({ id: editId, name, words: w }); cur = editId; store.set("cur", cur); }
  store.set("lists", lists); renderParent(); say("נשמר! 👍", false);
};
$("#flashSec").onchange = e => store.set("flashSec", Math.max(1, +e.target.value || 3));
$("#img").onchange = e => { const f = e.target.files[0]; if (f) { const p = $("#prev"); p.src = URL.createObjectURL(f); p.hidden = false; } };

$("#totStars").textContent = store.get("stars", 0);
route();
