// Pronunciation: the card's recording in your accent, or the browser's synthesized voice.
import { S } from "../state/store.js";
import { esc } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { pickAudio } from "../flashcards/audio.js";

let voices = [];
function loadVoices(){ try { voices = speechSynthesis.getVoices(); } catch (e){ voices = []; } }
if (typeof speechSynthesis !== "undefined"){ loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }

// plays the card's recording only when it's in your accent; otherwise the synthesized voice speaks
export function speak(text, audio){
  const lang = S.state.settings.accent || "en-GB";
  const url = pickAudio(audio, lang);
  if (url){ const a = new Audio(url); a.play().catch(() => speak(text)); return; }
  if (typeof speechSynthesis === "undefined") return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang; u.rate = 0.92;
  const v = voices.find(x => x.lang === lang && /natural|premium|enhanced|google/i.test(x.name)) || voices.find(x => x.lang === lang) || voices.find(x => x.lang && x.lang.indexOf("en") === 0);
  if (v) u.voice = v;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

export function speakBtn(text, label, audio){
  return '<button class="btn-icon btn" type="button" data-act="speak" data-text="' + esc(text) + '"' + (audio ? ' data-audio="' + esc(audio) + '"' : "") + ' aria-label="' + esc(label || "Ouvir") + '" title="' + esc(label || "Ouvir") + '">' + icon("speak", 20) + "</button>";
}

export const speechActions = {
  speak(el){ speak(el.dataset.text, el.dataset.audio); }
};
