// "Palavras do dia": the next words of your level, from the most to the least frequent (assets/data/words.tsv,
// built by scripts/build-wordlist.py). Pure helpers except loadList, so they run under node --test.

export const WL_LEVELS = ["A1", "A2", "B1", "B2", "C1"];
export const blankWl = () => ({level: "auto", cur: {A1: 0, A2: 0, B1: 0, B2: 0, C1: 0}, known: []});

// cleans S.state.wl as loaded from IndexedDB or a backup
export function normalizeWl(w){
  const b = blankWl();
  if (!w || typeof w !== "object") return b;
  const cur = {};
  WL_LEVELS.forEach(l => { const n = Math.floor(Number(w.cur && w.cur[l])); cur[l] = n > 0 ? n : 0; });
  return {
    level: w.level === "auto" || WL_LEVELS.indexOf(w.level) > -1 ? w.level : "auto",
    cur,
    known: Array.isArray(w.known) ? w.known.filter(t => typeof t === "string" && t).slice(0, 20000) : []
  };
}

// tsv lines: term, level, pos, British spelling. Returns {A1: [...], A2: [...], ...} in frequency order.
export function parseList(text){
  const out = {}; WL_LEVELS.forEach(l => { out[l] = []; });
  String(text).split("\n").forEach(line => {
    if (!line || line[0] === "#") return;
    const [term, level, pos, alt] = line.split("\t");
    if (term && out[level]) out[level].push({term, level, pos: pos || "", alt: alt || ""});
  });
  return out;
}

let cache = null;
export function loadList(){
  if (!cache) cache = fetch("assets/data/words.tsv").then(r => { if (!r.ok) throw new Error("list"); return r.text(); }).then(parseList).catch(e => { cache = null; throw e; });
  return cache;
}

// the route phase decides the level: A2 while consolidating, then B1, B2 and C1
export function phaseLevel(phaseId){ return phaseId <= 1 ? "A2" : phaseId === 2 ? "B1" : phaseId <= 4 ? "B2" : "C1"; }
export const levelFor = (wl, phaseId) => wl.level && wl.level !== "auto" ? wl.level : phaseLevel(phaseId);

export const displayTerm = (e, accent) => accent === "en-GB" && e.alt ? e.alt : e.term;
const keyOf = t => String(t).toLowerCase().replace(/-/g, " ").trim();

/* Next n words starting at `level` (moving up when a level runs out), skipping words already in the deck
   (`deckTerms`, a Set of lowercased terms) or marked as known. Each word carries its index in the level. */
export function nextBatch(list, wl, level, n, deckTerms){
  const known = new Set((wl.known || []).map(keyOf));
  const skip = e => known.has(keyOf(e.term)) || deckTerms.has(keyOf(e.term)) || (e.alt && deckTerms.has(keyOf(e.alt)));
  const words = [];
  for (let li = WL_LEVELS.indexOf(level); li > -1 && li < WL_LEVELS.length && words.length < n; li++){
    const l = WL_LEVELS[li], arr = list[l] || [];
    for (let i = (wl.cur && wl.cur[l]) || 0; i < arr.length && words.length < n; i++) if (!skip(arr[i])) words.push(Object.assign({i}, arr[i]));
  }
  return {level: words.length ? words[0].level : level, words};
}

// cursors move past the added words, never back, so nothing repeats
export function advance(wl, words){
  const cur = Object.assign({}, wl.cur);
  words.forEach(w => { cur[w.level] = Math.max(cur[w.level] || 0, w.i + 1); });
  return Object.assign({}, wl, {cur});
}
export const withKnown = (wl, term) => Object.assign({}, wl, {known: (wl.known || []).concat(term)});

export function progress(list, wl, level, deckTerms){
  const arr = list[level] || [];
  const known = new Set((wl.known || []).map(keyOf));
  let inDeck = 0, k = 0;
  arr.forEach(e => { if (known.has(keyOf(e.term))) k++; else if (deckTerms.has(keyOf(e.term)) || (e.alt && deckTerms.has(keyOf(e.alt)))) inDeck++; });
  return {total: arr.length, inDeck, known: k, left: arr.length - inDeck - k};
}

/* How many words today's batch may have: what's left of the daily new-card limit minus new cards
   still waiting, so batches never pile up. d = deckToday(). */
export const batchSize = d => d.blocked ? 0 : Math.max(0, d.limit - d.introduced - d.newWaiting);

export const deckTermSet = cards => new Set(cards.filter(c => c.dir !== "rev").map(c => keyOf(c.term)));
