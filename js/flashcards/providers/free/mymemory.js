// MyMemory: translation of the term and of examples that have no translation.
import { stripHtml } from "./html.js";
import { getJSON } from "./http.js";

const mymemoryUrl = (q, email) => "https://api.mymemory.translated.net/get?q=" + encodeURIComponent(q) + "&langpair=en|pt-BR" + (email ? "&de=" + encodeURIComponent(email) : "");

// MyMemory's top answer can be a fuzzy memory match for a *different* sentence ("…the ball" for "…the trip"),
// so prefer entries whose source is exactly the query, then its machine translation.
const fold = s => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const normQ = s => String(s || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
export function parseMyMemory(json, term){
  if (!json || json.quotaFinished) throw new Error("quota");
  const q = normQ(term);
  const same = (json.matches || []).filter(m => normQ(m.segment) === q)
    .sort((a, b) => (Number(b.match) || 0) - (Number(a.match) || 0) || (Number(b.quality) || 0) - (Number(a.quality) || 0));
  const top = json.responseData || {};
  const exactTop = Number(top.match) >= 1 || !(json.matches || []).length;
  const main = stripHtml(exactTop ? top.translatedText : same.length ? same[0].translation : top.translatedText).replace(/^["“]|[.!\s]+$/g, "");
  const alts = [];
  const add = s => {
    let t = stripHtml(s).replace(/^["“]|[.!\s]+$/g, "");
    // short glosses read better in lower case ("Supere Isso" → "supere isso"); keep acronyms
    if (t.split(/\s+/).length <= 4 && !/\b[A-ZÀ-Ý]{2,}\b/.test(t)) t = t.toLowerCase();
    // translation memories carry junk: broken encodings ("prﾃｳximo"), questions, the English word itself
    if (!t || t.length > 60 || t.toLowerCase() === term.toLowerCase() || /[\uFF61-\uFF9F\uFFFD?]|Ã[\u00A0-\u00BF]/.test(t)) return;
    if (!alts.some(a => fold(a) === fold(t))) alts.push(t);
  };
  add(main);
  same.forEach(m => add(m.translation));
  return {text: main, alts: alts.slice(0, 3)};
}

export async function translate(text, email){ return parseMyMemory(await getJSON(mymemoryUrl(text, email)), text); }
