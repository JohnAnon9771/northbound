// The bar at the bottom while the study timer runs, with pause and a rest reminder.
import { $, esc } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { toast } from "../core/toast.js";
import * as timer from "../core/study-timer.js";
import { stopTimer } from "../ui/task-actions.js";

let tick = null;
export function paintTimer(){
  const bar = $("#timerbar");
  const t = timer.running();
  clearInterval(tick);
  bar.hidden = !t;
  if (!t) return;
  const p = !!t.paused;
  bar.classList.toggle("paused", p);
  bar.innerHTML = '<span class="pulse" aria-hidden="true"></span><span class="lbl">' + (p ? "Pausa · " : "") + esc(t.label || "Estudo") + '</span><span class="clock" id="clock">' + timer.fmtClock(timer.elapsed(t)) + '</span><button class="timer-pause" type="button" id="timerPause" aria-label="' + (p ? "Continuar" : "Pausar") + '" title="' + (p ? "Continuar" : "Pausar") + '">' + icon(p ? "play" : "pause", 16) + '</button><button class="btn btn-small" type="button" id="timerStop">' + icon("stop", 14) + "Parar</button>";
  $("#timerPause").onclick = p ? timer.resume : timer.pause;
  $("#timerStop").onclick = stopTimer;
  if (p) return;
  tick = setInterval(() => {
    const c = $("#clock");
    if (c) c.textContent = timer.fmtClock(timer.elapsed(t));
    restNudge(t);
  }, 1000);
  restNudge(t);
}
// once per stretch of study, suggest a break after REST_AFTER without one
function restNudge(t){
  if (timer.stretch(t) < timer.REST_AFTER || t.nudged === (t.since || t.start)) return;
  timer.markNudged();
  toast(Math.round(timer.REST_AFTER / 60000) + " min seguidos. Que tal 10 min de descanso? O tempo pausado não conta como estudo.", [{label: "Pausar", fn: timer.pause}], {title: "Hora de uma pausa", ms: 15000});
}
