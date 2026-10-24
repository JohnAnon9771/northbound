import { $, esc } from "./dom.js";

let timer = null, raf = 0;
// toast("Salvo.") or toast("Registrado.", [{label: "Desfazer", fn}], {tone: "warm"})
export function toast(msg, actions, opts){
  const el = $("#toast");
  if (!el) return;
  const acts = actions || [];
  const o = opts || {};
  el.className = "toast" + (o.tone ? " toast-" + o.tone : "");
  el.innerHTML = (o.title ? '<b class="toast-title">' + esc(o.title) + "</b>" : "") + '<span class="toast-msg">' + esc(msg) + "</span>" +
    acts.map((a, i) => '<button class="btn btn-small toast-act" type="button" data-i="' + i + '">' + esc(a.label) + "</button>").join("") +
    '<button class="toast-x" type="button" aria-label="Fechar aviso">×</button>';
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => el.classList.add("show"));
  clearTimeout(timer);
  timer = setTimeout(hide, o.ms || (acts.length ? 9000 : 3800));
  el.querySelectorAll(".toast-act").forEach(b => { b.onclick = () => { hide(); acts[Number(b.dataset.i)].fn(); }; });
  el.querySelector(".toast-x").onclick = hide;
}
// a toast raised while the tab is hidden shows on the next frame, so hiding must cancel that frame too
export function hide(){ cancelAnimationFrame(raf); clearTimeout(timer); const el = $("#toast"); if (el) el.classList.remove("show"); }
