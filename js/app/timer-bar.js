// The bar at the bottom while the study timer runs.
import { $, esc } from "../core/dom.js";
import { icon } from "../core/icons.js";
import * as timer from "../core/study-timer.js";
import { stopTimer } from "../ui/task-actions.js";

let tick = null;
export function paintTimer(){
  const bar = $("#timerbar");
  const t = timer.running();
  clearInterval(tick);
  bar.hidden = !t;
  if (!t) return;
  bar.innerHTML = '<span class="pulse" aria-hidden="true"></span><span class="lbl">' + esc(t.label || "Estudo") + '</span><span class="clock" id="clock">' + timer.fmtClock(Date.now() - t.start) + '</span><button class="btn btn-small" type="button" id="timerStop">' + icon("stop", 14) + "Parar</button>";
  $("#timerStop").onclick = stopTimer;
  tick = setInterval(() => { const c = $("#clock"); if (c) c.textContent = timer.fmtClock(Date.now() - t.start); }, 1000);
}
