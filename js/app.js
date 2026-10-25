// Boot, hash router, event delegation and the global timer bar.
// To add a section: create js/views/<name>.js exporting {id, title, render(), actions?} and add it to VIEWS.
import { S, load, subscribe, onError, persistent, updateQuiet } from "./state/store.js";
import { $, esc } from "./core/dom.js";
import { icon } from "./core/icons.js";
import { today } from "./core/date.js";
import { toast } from "./core/toast.js";
import { setRenderer } from "./core/rerender.js";
import * as timer from "./core/study-timer.js";
import { taskActions, resetTasks, trackDetails, stopTimer } from "./ui/tasks.js";
import { wordActions } from "./ui/words.js";
import { dailyWordsActions } from "./ui/daily-words.js";
import { checkAchievements } from "./ui/achieve.js";
import { downloadBackup, daysSinceBackup } from "./ui/backup.js";
import { currentRoadmapWeek } from "./domain/route.js";
import { hasContent } from "./state/selectors.js";
import { deckToday } from "./flashcards/deck.js";

import hoje from "./views/hoje.js";
import palavras from "./views/palavras.js";
import estudo from "./views/estudo.js";
import rota from "./views/rota.js";
import progresso from "./views/progresso.js";
import mais from "./views/mais.js";
import niveis from "./views/niveis.js";
import rotinas from "./views/rotinas.js";
import ajustes from "./views/ajustes.js";

const VIEWS = [hoje, palavras, estudo, rota, progresso, mais, niveis, rotinas, ajustes];
const NAV = [["hoje", "Hoje", "home"], ["palavras", "Palavras", "cards"], ["rota", "Rota", "route"], ["progresso", "Progresso", "chart"], ["mais", "Mais", "more"]];
// old links from the single-page version and task links
const ALIAS = {"": "hoje", semana: "rota", roteiro: "rota", flashcards: "palavras"};
const PARENT = {niveis: "mais", rotinas: "mais", ajustes: "mais", estudo: "palavras"};
const SHARED = Object.assign({}, taskActions, wordActions, dailyWordsActions);

const root = $("#app");
let view = null;

function resolve(){
  const h = decodeURIComponent(location.hash.slice(1)).split("?")[0];
  const id = h in ALIAS ? ALIAS[h] : h;
  return VIEWS.find(v => v.id === id) || hoje;
}
function go(){
  const next = resolve();
  const changed = next !== view, first = !view;
  if (changed && view && view.leave) view.leave();
  view = next;
  if (changed && view.enter) view.enter();
  render();
  // move focus to the new screen for screen readers, but not on page load (nothing to announce yet)
  if (changed && !first){ window.scrollTo(0, 0); root.focus({preventScroll: true}); }
}

function render(){
  if (!view) return;
  // keep focus (and caret) on the same control across re-renders
  const a = document.activeElement;
  const fk = a && a.dataset ? a.dataset.fk : null;
  let sel = null;
  if (fk) try { sel = [a.selectionStart, a.selectionEnd]; } catch (e){}
  resetTasks();
  root.innerHTML = view.render();
  document.title = view.title + " · Northbound";
  document.body.classList.toggle("focus-mode", !!view.focus);
  if (view.mounted) view.mounted(root);
  if (fk){
    const el = root.querySelector('[data-fk="' + CSS.escape(fk) + '"]');
    if (el){ el.focus({preventScroll: true}); if (sel && sel[0] != null && el.setSelectionRange) try { el.setSelectionRange(sel[0], sel[1]); } catch (e){} }
  }
  renderNav();
}

setRenderer(render);

function renderNav(){
  const cur = PARENT[view.id] || view.id;
  const due = deckToday().due;
  const item = ([id, label, ic]) => '<a href="#' + id + '"' + (cur === id ? ' aria-current="page"' : "") + ">" + icon(ic, 22) + "<span>" + label + "</span>" + (id === "palavras" && due ? '<span class="badge-dot" aria-label="' + due + ' revisões">' + (due > 99 ? "99+" : due) + "</span>" : "") + "</a>";
  $("#nav").innerHTML = NAV.map(item).join("");
  $("#tabbar").innerHTML = NAV.map(item).join("");
}

/* ---------- event delegation: data-act (click), data-change, data-input, data-submit ---------- */
function delegate(type, attr){
  root.addEventListener(type, e => {
    const el = e.target.closest ? e.target.closest("[" + attr + "]") : null;
    if (!el) return;
    const name = el.getAttribute(attr);
    const fn = (view.actions && view.actions[name]) || SHARED[name];
    if (!fn) return;
    if (type === "submit") e.preventDefault();
    fn(el, e);
  });
}
delegate("click", "data-act");
delegate("change", "data-change");
delegate("input", "data-input");
delegate("submit", "data-submit");
root.addEventListener("toggle", trackDetails, true);
document.addEventListener("keydown", e => { if (view && view.onKey) view.onKey(e); });
addEventListener("hashchange", go);

/* ---------- timer bar ---------- */
const bar = $("#timerbar");
let tick = null;
function paintTimer(){
  const t = timer.running();
  clearInterval(tick);
  bar.hidden = !t;
  if (!t) return;
  bar.innerHTML = '<span class="pulse" aria-hidden="true"></span><span class="lbl">' + esc(t.label || "Estudo") + '</span><span class="clock" id="clock">' + timer.fmtClock(Date.now() - t.start) + '</span><button class="btn btn-small" type="button" id="timerStop">' + icon("stop", 14) + "Parar</button>";
  $("#timerStop").onclick = stopTimer;
  tick = setInterval(() => { const c = $("#clock"); if (c) c.textContent = timer.fmtClock(Date.now() - t.start); }, 1000);
}
timer.onTimer(() => { paintTimer(); render(); });

/* ---------- boot ---------- */
let achTimer = null;
async function boot(){
  await load();
  if (!persistent) toast("Não consegui abrir o armazenamento do navegador (modo privado?). Nada será salvo.");
  // the week you were on when this version arrived; earlier weeks keep their old task list
  if (S.state.revFrom == null) updateQuiet(s => { s.revFrom = hasContent() ? Math.min(currentRoadmapWeek(), 999) : 1; });
  checkAchievements(true);
  subscribe(() => {
    render();
    clearTimeout(achTimer);
    achTimer = setTimeout(() => checkAchievements(false), 700);
  });
  onError(() => toast("Não consegui salvar no navegador. Baixe um backup em Ajustes."));
  go();
  paintTimer();
  backupReminder();
  if ("serviceWorker" in navigator && location.protocol === "https:") registerSW();
}

// offline: the service worker caches every file this page loaded
function registerSW(){
  navigator.serviceWorker.register("sw.js").then(() => navigator.serviceWorker.ready).then(reg => {
    const urls = [location.href.split("#")[0]].concat(performance.getEntriesByType("resource").map(r => r.name));
    if (reg.active) reg.active.postMessage({type: "cache", urls});
  }).catch(() => {});
}

function backupReminder(){
  const d = daysSinceBackup();
  if (!hasContent() || (d != null && d < 14)) return;
  let last = null;
  try { last = localStorage.getItem("nb:backupNag"); localStorage.setItem("nb:backupNag", today()); } catch (e){}
  if (last === today()) return;
  setTimeout(() => toast(d == null ? "Seus dados ficam só neste navegador. Que tal baixar um backup?" : "Seu último backup foi há " + d + " dias.", [{label: "Baixar backup", fn: downloadBackup}]), 1500);
}

boot();
