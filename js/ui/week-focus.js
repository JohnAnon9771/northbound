// The phase guidance box for a route week: flashcards, ChatGPT, checkpoint, note and phase tweak.
import { esc } from "../core/dom.js";
import { PHASES, phaseOf } from "../data/phases.js";
import { weekMilestone, weekNote } from "../domain/week-tasks.js";

export function focusHTML(n){
  const p = PHASES[phaseOf(n)];
  const ms = weekMilestone(n), note = weekNote(n);
  let h = '<div class="focus" style="--pc:var(' + p.col + ')"><dl>';
  h += '<dt>Flashcards</dt><dd>' + esc(p.cards) + "</dd>";
  h += "<dt>ChatGPT</dt><dd>" + esc(p.gpt) + "</dd>";
  if (ms) h += '<dt>Checkpoint</dt><dd class="ms">' + esc(ms) + "</dd>";
  if (note) h += "<dt>Nota</dt><dd>" + esc(note) + "</dd>";
  if (p.tweak) h += "<dt>Ajuste</dt><dd>" + esc(p.tweak) + "</dd>";
  return h + "</dl></div>";
}
