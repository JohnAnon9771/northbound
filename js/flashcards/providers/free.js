/* Free sources, no key needed (all allow CORS):
   - Wiktionary REST: part of speech, definitions and usage examples (works for phrasal verbs and idioms)
   - Tatoeba: real sentences with human pt-BR translations
   - MyMemory: translation of the term and of examples that have no translation
   - Free Dictionary API: IPA and pronunciation audio, when it's up */
const enc = encodeURIComponent;
const WIKT = t => "https://en.wiktionary.org/api/rest_v1/page/definition/" + enc(t.replace(/ /g, "_"));
const DICT = t => "https://api.dictionaryapi.dev/api/v2/entries/en/" + enc(t);
const TATO = t => "https://api.tatoeba.org/unstable/sentences?lang=eng&q=" + enc('"' + t + '"') + "&trans:lang=por&sort=relevance&limit=20&showtrans=matching";
const MM = (q, email) => "https://api.mymemory.translated.net/get?q=" + enc(q) + "&langpair=en|pt-BR" + (email ? "&de=" + enc(email) : "");

const POS_PT = {verb: "verbo", noun: "substantivo", adjective: "adjetivo", adverb: "advérbio", phrase: "expressão", idiom: "expressão idiomática",
  preposition: "preposição", conjunction: "conjunção", interjection: "interjeição", pronoun: "pronome", determiner: "determinante", "prepositional phrase": "locução prepositiva", proverb: "provérbio",
  "modal auxiliary": "verbo modal", "be-verb": "verbo", "do-verb": "verbo", "have-verb": "verbo", number: "numeral", "infinitive-to": "partícula"};
export const posPt = p => POS_PT[String(p || "").toLowerCase()] || String(p || "").toLowerCase();

export function stripHtml(s){
  return String(s || "").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
}

export function parseWiktionary(json){
  const senses = [];
  ((json && json.en) || []).forEach(block => {
    (block.definitions || []).forEach(d => {
      const text = stripHtml(d.definition);
      if (!text || /^(plural|alternative|obsolete|archaic) (of|form|spelling)/i.test(text)) return;
      senses.push({pos: block.partOfSpeech || "", text, examples: (d.examples || []).map(stripHtml).filter(e => e.length > 8 && e.length < 160 && e.indexOf(";") < 0)});
    });
  });
  return senses;
}

export function parseTatoeba(json, term){
  const words = term.toLowerCase().split(/\s+/).map(w => w.replace(/[^a-z']/g, "").slice(0, Math.max(3, w.length - 2)));
  const out = [];
  ((json && json.data) || []).forEach(s => {
    const en = String(s.text || "").trim();
    if (en.length < 14 || en.length > 110) return;
    const low = en.toLowerCase();
    if (!words.every(w => low.indexOf(w) > -1)) return;
    const trs = [].concat(...(s.translations || []).map(t => Array.isArray(t) ? t : [t])).filter(t => t && t.lang === "por" && !t.is_unapproved);
    if (!trs.length) return;
    const pt = (trs.find(t => t.is_direct) || trs[0]).text;
    out.push({en, pt});
  });
  return out;
}

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

// recordings are named by accent: hello-uk.mp3, hello-us.mp3, hello-au.mp3
const ACCENT_TAG = {"en-GB": /[-_](uk|gb)[._\d]/i, "en-US": /[-_]us[._\d]/i};
const tagged = url => Object.keys(ACCENT_TAG).some(k => ACCENT_TAG[k].test(url));

// keeps every British and American recording (space-separated), so changing the accent later still finds one
export function parseDictionary(json){
  const e = Array.isArray(json) ? json[0] : null;
  if (!e) return {};
  const phs = e.phonetics || [];
  const ph = phs.find(p => p.text) || {};
  const audio = phs.map(p => p.audio || "").filter(a => /^https:\/\//.test(a) && tagged(a));
  return {ipa: e.phonetic || ph.text || "", audio: Array.from(new Set(audio)).join(" ")};
}

/* The recording in your accent, or "" so the synthesized voice (which follows the accent) speaks instead. */
export function pickAudio(audio, accent){
  const re = ACCENT_TAG[accent] || ACCENT_TAG["en-GB"];
  return String(audio || "").split(/\s+/).find(a => re.test(a)) || "";
}

async function getJSON(url, ms){
  const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const t = ctl ? setTimeout(() => ctl.abort(), ms || 9000) : null;
  try {
    const r = await fetch(url, ctl ? {signal: ctl.signal} : {});
    if (!r.ok) throw new Error("http " + r.status);
    return await r.json();
  } finally { if (t) clearTimeout(t); }
}
export async function translate(text, email){ return parseMyMemory(await getJSON(MM(text, email)), text); }

export async function enrichFree(term, context, opts){
  const o = opts || {};
  const t = term.trim(), lower = t.toLowerCase();
  const [wk, tt, tr, dc] = await Promise.allSettled([
    getJSON(WIKT(lower)).catch(() => getJSON(WIKT(t))).then(parseWiktionary),
    getJSON(TATO(lower)).then(j => parseTatoeba(j, lower)),
    translate(t, o.email),
    getJSON(DICT(lower), 5000).then(parseDictionary)
  ]);
  let senses = wk.status === "fulfilled" ? wk.value : [];
  // a part-of-speech hint ("verb/noun", from the word list) puts the matching senses first
  if (o.pos){
    // the list says "modal auxiliary", "be-verb"…; Wiktionary calls all of those verbs
    const want = String(o.pos).toLowerCase().split("/").map(w => /verb|auxiliary/.test(w) && w !== "adverb" ? "verb" : w);
    const match = s => want.some(w => String(s.pos).toLowerCase().indexOf(w) === 0);
    senses = senses.filter(match).concat(senses.filter(s => !match(s)));
  }
  const tato = tt.status === "fulfilled" ? tt.value : [];
  const trans = tr.status === "fulfilled" ? tr.value : null;
  const dict = dc.status === "fulfilled" ? dc.value : {};
  if (!senses.length && !tato.length && !trans) throw new Error(tr.reason && tr.reason.message === "quota" ? "quota" : "offline");

  // examples: your own sentence first, then real sentences with human translations, then dictionary examples
  const examples = [];
  const seen = new Set();
  const push = (en, pt) => { const k = en.toLowerCase(); if (!seen.has(k) && examples.length < 3){ seen.add(k); examples.push({en, pt: pt || ""}); } };
  if (context) push(context.trim(), "");
  tato.slice(0, 2).forEach(x => push(x.en, x.pt));
  senses.forEach(s => s.examples.forEach(e => push(e, "")));
  tato.slice(2).forEach(x => push(x.en, x.pt));
  // translate the ones still without pt (costs MyMemory quota, so only these)
  await Promise.all(examples.map(async ex => {
    if (ex.pt) return;
    try { ex.pt = (await translate(ex.en, o.email)).text; } catch (e){ /* keep it untranslated */ }
  }));

  const first = senses[0] || {};
  return {
    term: t, ipa: dict.ipa || "", audio: dict.audio || "",
    pos: posPt(first.pos), translation: trans ? (trans.alts.join(", ") || trans.text) : "",
    definition: first.text || "", examples, collocations: [], cefr: "", notes: "",
    senses: senses.slice(0, 4).map(s => ({pos: posPt(s.pos), text: s.text}))
  };
}
