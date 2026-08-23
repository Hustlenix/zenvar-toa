(() => {
"use strict";

const reduceMQ = matchMedia("(prefers-reduced-motion: reduce)");
const wipes = [...document.querySelectorAll(".wipe")];
const diagrams = [...document.querySelectorAll(".diagram")];
let ticking = false;

function reveal(el) {
  el.classList.add("in");
  setTimeout(() => el.classList.add("done"), 1600);
}

function checkAll() {
  ticking = false;
  const vh = innerHeight;
  for (const el of wipes) {
    if (el.classList.contains("in")) continue;
    const r = el.getBoundingClientRect();
    if (r.top < vh * 0.92 && r.bottom > 0) reveal(el);
  }
  for (const el of diagrams) {
    if (el.classList.contains("in")) continue;
    const r = el.getBoundingClientRect();
    if (r.top < vh * 0.85 && r.bottom > 0) el.classList.add("in");
  }
}

function requestCheck() {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(checkAll);
  }
}

if (reduceMQ.matches) {
  wipes.forEach(el => el.classList.add("in", "done"));
  diagrams.forEach(el => el.classList.add("in"));
} else {
  addEventListener("scroll", requestCheck, { passive: true });
  addEventListener("resize", requestCheck, { passive: true });
  checkAll();
}

reduceMQ.addEventListener("change", e => {
  if (e.matches) {
    removeEventListener("scroll", requestCheck);
    removeEventListener("resize", requestCheck);
    wipes.forEach(el => el.classList.add("in", "done"));
    diagrams.forEach(el => el.classList.add("in"));
  }
});
})();
