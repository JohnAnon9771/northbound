// Word helpers shared by Hoje, Palavras and the study screen: highlighting and pronunciation.
import { S } from "../state/store.js";
import { esc } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { pickAudio } from "../flashcards/providers/free.js";

const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/* Marks the term inside a sentence. Matches inflections loosely ("get over" → "got over", "getting over"). */
export function highlight(sentence, term){
  const safe = esc(sentence);
  const words = String(term || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return safe;
  const stem = w => { const x = reEsc(esc(w)); return x.length > 4 ? x.slice(0, -2) + "\\w*" : x + "\\w*"; };
  const loose = words.map((w, i) => i === 0 && /^[a-z]{3,}$/i.test(w) ? "(?:" + stem(w) + "|" + irregular(w) + ")" : stem(w)).join("\\s+(?:\\w+\\s+)?");
  try {
    const re = new RegExp("\\b(" + loose + ")", "i");
    return re.test(safe) ? safe.replace(re, "<mark>$1</mark>") : safe;
  } catch (e){ return safe; }
}
const IRR = {get: "got|gotten", go: "went|gone", take: "took|taken", give: "gave|given", come: "came", make: "made", put: "put", run: "ran", bring: "brought", think: "thought", catch: "caught", find: "found", keep: "kept", hold: "held", break: "broke|broken", fall: "fell|fallen", turn: "turned", look: "looked", set: "set", carry: "carried"};
const irregular = w => IRR[w.toLowerCase()] || reEsc(w);

export function cloze(sentence, term){
  const h = highlight(sentence, term);
  return h.replace(/<mark>(.*?)<\/mark>/, (m, inner) => "<mark>" + inner.replace(/\S/g, "_").replace(/_+/g, "____") + "</mark>");
}

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

export const wordActions = {
  speak(el){ speak(el.dataset.text, el.dataset.audio); }
};
