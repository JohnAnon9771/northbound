// Hash router: which screen is on, rendering it (keeping focus across re-renders) and the navigation bars.
// To add a screen: create js/views/<name>.js exporting {id, title, render(), actions?} and add it to VIEWS.
import { $ } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { resetTasks } from "../ui/task-item.js";
import { deckToday } from "../flashcards/deck.js";

import today from "../views/today.js";
import words from "../views/words.js";
import study from "../views/study.js";
import route from "../views/route.js";
import progress from "../views/progress.js";
import more from "../views/more.js";
import levels from "../views/levels.js";
import routines from "../views/routines.js";
import settings from "../views/settings.js";

const VIEWS = [today, words, study, route, progress, more, levels, routines, settings];
const NAV = [["hoje", "Hoje", "home"], ["palavras", "Palavras", "cards"], ["rota", "Rota", "route"], ["progresso", "Progresso", "chart"], ["mais", "Mais", "more"]];
// old links from the single-page version and task links
const ALIAS = {"": "hoje", semana: "rota", roteiro: "rota", flashcards: "palavras"};
const PARENT = {niveis: "mais", rotinas: "mais", ajustes: "mais", estudo: "palavras"};

export const root = $("#app");
let view = null;
export const currentView = () => view;

function resolve(){
  const h = decodeURIComponent(location.hash.slice(1)).split("?")[0];
  const id = h in ALIAS ? ALIAS[h] : h;
  return VIEWS.find(v => v.id === id) || today;
}
export function go(){
  const next = resolve();
  const changed = next !== view, first = !view;
  if (changed && view && view.leave) view.leave();
  view = next;
  if (changed && view.enter) view.enter();
  render();
  // move focus to the new screen for screen readers, but not on page load (nothing to announce yet)
  if (changed && !first){ window.scrollTo(0, 0); root.focus({preventScroll: true}); }
}

export function render(){
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

function renderNav(){
  const cur = PARENT[view.id] || view.id;
  const due = deckToday().due;
  const item = ([id, label, ic]) => '<a href="#' + id + '"' + (cur === id ? ' aria-current="page"' : "") + ">" + icon(ic, 22) + "<span>" + label + "</span>" + (id === "palavras" && due ? '<span class="badge-dot" aria-label="' + due + ' revisões">' + (due > 99 ? "99+" : due) + "</span>" : "") + "</a>";
  $("#nav").innerHTML = NAV.map(item).join("");
  $("#tabbar").innerHTML = NAV.map(item).join("");
}
