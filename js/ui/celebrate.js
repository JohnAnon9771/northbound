// Small confetti burst. Respects prefers-reduced-motion.
const COLORS = ["--accent", "--sage", "--honey", "--sky", "--plum"];
const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export function confetti(origin, big){
  if (reduced()) return;
  const box = document.createElement("div");
  box.className = "confetti";
  const r = origin && origin.getBoundingClientRect ? origin.getBoundingClientRect() : null;
  const x = r ? r.left + r.width / 2 : innerWidth / 2;
  const y = r ? r.top + r.height / 2 : innerHeight * 0.35;
  const n = big ? 70 : 22;
  for (let i = 0; i < n; i++){
    const p = document.createElement("i");
    const a = Math.random() * Math.PI * 2, d = (big ? 160 : 70) + Math.random() * (big ? 260 : 90);
    p.style.left = x + "px"; p.style.top = y + "px";
    p.style.background = "var(" + COLORS[i % COLORS.length] + ")";
    p.style.setProperty("--dx", Math.cos(a) * d + "px");
    p.style.setProperty("--dy", Math.sin(a) * d + (big ? 180 : 60) + "px");
    p.style.setProperty("--rot", (Math.random() * 720 - 360) + "deg");
    p.style.animationDelay = Math.random() * 0.12 + "s";
    if (Math.random() > 0.5) p.style.borderRadius = "50%";
    box.appendChild(p);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 1600);
}
