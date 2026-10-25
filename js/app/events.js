// Event delegation on <main>: data-act (click), data-change, data-input and data-submit call the current
// screen's action of that name, or a shared one.
import { taskActions } from "../ui/task-actions.js";
import { trackDetails } from "../ui/task-item.js";
import { logActions } from "../ui/log-list.js";
import { speechActions } from "../ui/speech.js";
import { dailyWordsActions } from "../ui/daily-words-card.js";
import { root, currentView } from "./router.js";

const SHARED = Object.assign({}, taskActions, logActions, speechActions, dailyWordsActions);

function delegate(type, attr){
  root.addEventListener(type, e => {
    const el = e.target.closest ? e.target.closest("[" + attr + "]") : null;
    if (!el) return;
    const name = el.getAttribute(attr);
    const view = currentView();
    const fn = (view.actions && view.actions[name]) || SHARED[name];
    if (!fn) return;
    if (type === "submit") e.preventDefault();
    fn(el, e);
  });
}

export function bindEvents(){
  delegate("click", "data-act");
  delegate("change", "data-change");
  delegate("input", "data-input");
  delegate("submit", "data-submit");
  root.addEventListener("toggle", trackDetails, true);
  document.addEventListener("keydown", e => { const view = currentView(); if (view && view.onKey) view.onKey(e); });
}
