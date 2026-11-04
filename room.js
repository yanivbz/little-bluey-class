// "החדר שלי" – decorate the room with coins
const ITEMS = { // id: [name, price, width% , x%, y%, layer]
  rug: ["שטיח", 10, 62, 19, 62, 1], bed: ["מיטה", 25, 40, 0, 40, 3], lamp: ["מנורה", 15, 16, 4, 30, 3], plant: ["עציץ", 10, 20, 78, 46, 3],
  ball: ["כדור", 5, 15, 80, 66, 6], bow: ["פפיון", 8, 13, 44, 53, 8], star: ["תמונה של כוכב", 12, 22, 74, 16, 2], books: ["מדף ספרים", 20, 30, 4, 12, 2],
  toybox: ["ארגז צעצועים", 18, 26, 70, 74, 6], bowl: ["קערה", 6, 15, 10, 80, 6], teddy: ["דובי", 14, 18, 6, 66, 6], window: ["חלון", 22, 32, 34, 4, 2],
  rainbow: ["קשת", 12, 24, 70, 28, 2], cushion: ["כרית", 9, 22, 30, 80, 6], hat: ["כובע מסיבה", 7, 13, 46, 34, 8], lights: ["שרשרת אורות", 16, 60, 20, 1, 2]
};
const R = () => S.get("room", { own: [], pos: {} });
let rsel = null;
function renderRoom() {
  const r = R(), box = $("#roombox"); $("#opt").hidden = true; showCoins();
  box.querySelectorAll(".it").forEach(e => e.remove());
  Object.entries(r.pos).forEach(([id, [x, y]]) => {
    const [, , w, , , z] = ITEMS[id], im = document.createElement("img");
    Object.assign(im, { src: `assets/room/${id}.webp`, className: "it", alt: "" }); im.dataset.id = id;
    Object.assign(im.style, { width: w + "%", left: x + "%", top: y + "%", zIndex: z }); box.append(im);
  });
  $("#tray").innerHTML = Object.entries(ITEMS).filter(([id]) => !(id in r.pos)).map(([id, [n, p]]) => {
    const own = r.own.includes(id);
    return `<button data-id="${id}" class="${own ? "own" : coins() < p ? "poor" : ""}"><img src="assets/room/${id}.webp" alt="${n}"><span>${own ? "✨" : `<i class="cn"></i>${p}`}</span></button>`;
  }).join("");
}
$("#tray").onclick = e => {
  const b = e.target.closest("[data-id]"); if (!b) return; const id = b.dataset.id, [n, p, , x, y] = ITEMS[id], r = R();
  if (!r.own.includes(id)) {
    if (coins() < p) { speak("עוד קצת מטבעות ואפשר לקנות!"); return toast("עוד קצת מטבעות ואפשר לקנות! 💪"); }
    addCoin(-p); r.own.push(id); party(); speak("יש! קנית " + n);
    $(".rpup").src = "assets/cheer.webp"; setTimeout(() => $(".rpup").src = "assets/wave.webp", 1500);
  } else speak(n);
  r.pos[id] = [x, y]; S.set("room", r); renderRoom();
};
function toast(t) { const el = $("#opt"); el.hidden = false; el.innerHTML = `<span>${t}</span>`; setTimeout(() => renderRoom(), 2200); }
// drag & tap on placed items
let drag = null;
$("#roombox").addEventListener("pointerdown", e => {
  const it = e.target.closest(".it"); if (!it) { $("#opt").hidden = true; return; }
  e.preventDefault(); it.setPointerCapture(e.pointerId);
  const bx = $("#roombox").getBoundingClientRect();
  drag = { it, bx, sx: e.clientX, sy: e.clientY, ox: parseFloat(it.style.left), oy: parseFloat(it.style.top), moved: false };
});
$("#roombox").addEventListener("pointermove", e => {
  if (!drag) return; const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
  if (Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true; if (!drag.moved) return;
  drag.it.style.left = Math.min(95, Math.max(-5, drag.ox + dx / drag.bx.width * 100)) + "%";
  drag.it.style.top = Math.min(92, Math.max(-5, drag.oy + dy / drag.bx.height * 100)) + "%";
});
$("#roombox").addEventListener("pointerup", () => {
  if (!drag) return; const { it, moved } = drag, id = it.dataset.id, r = R(); drag = null;
  if (moved) { r.pos[id] = [parseFloat(it.style.left), parseFloat(it.style.top)]; S.set("room", r); return; }
  speak(ITEMS[id][0]); rsel = id;
  const o = $("#opt"); o.innerHTML = `<b>${ITEMS[id][0]}</b><button id="optBack">↩️ החזרה למגש</button>`; o.hidden = false;
  $("#optBack").onclick = () => { const r = R(); delete r.pos[rsel]; S.set("room", r); renderRoom(); };
});
if (location.hash === "#room") renderRoom();
