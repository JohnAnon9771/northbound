// Wiktionary translation tables: Portuguese words per sense, curated by people (MyMemory's single-word
// answers come from unrelated projects: "lead" → "superar", "though." → "ninja.").
import { posFirst, posOnly } from "../../pos.js";
import { fold } from "./mymemory.js";

export const wiktionaryPtUrl = page => "https://en.wiktionary.org/w/api.php?action=parse&prop=wikitext&format=json&formatversion=2&origin=*&page=" + encodeURIComponent(page.replace(/ /g, "_"));

const POS = /^(noun|proper noun|verb|adjective|adverb|preposition|prepositional phrase|conjunction|pronoun|interjection|determiner|article|phrase|idiom|proverb|particle|numeral|contraction)$/i;
const unlink = s => s.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1");
// "{{t+|pt|[[no]] [[entanto]]|m}}, {{t+|pt|apesar}} de" → ["no entanto", "apesar de"];
// alt= is the form to show ("{{t+|pt|ter|alt=ter (por/como)}}" → "ter (por/como)")
const ptTerm = t => { const alt = t.match(/\|alt=([^|}]+)/); return alt ? alt[1] : t.match(/\{\{tt?\+?\|pt\|([^|}]+)/)[1]; };
const ptTerms = line => line.replace(/^[*:\s]*[^:{]*:/, "").split(/,(?![^{]*\}\})/)
  .filter(c => /\{\{tt?\+?\|pt\|/.test(c))
  .map(c => unlink(c.replace(/\{\{tt?\+?\|pt\|[^}]*\}\}/, m => ptTerm(m)).replace(/\{\{[^}]*\}\}/g, "")).replace(/\s+/g, " ").trim())
  .filter(Boolean);

/* common words keep their tables on "<word>/translations" (subpage: true says to fetch it).
   sections: every part-of-speech heading in page order, the same order as the REST definition blocks;
   ipa: the first pronunciation of each etymology ("lead" the metal /lɛd/, "lead" the verb /ˈliːd/). */
export function parseWiktionaryPt(json){
  const text = String((json && json.parse && json.parse.wikitext) || "");
  const en = text.indexOf("==English==") > -1 ? text.split("==English==")[1].split(/\n==[^=]/)[0] : text;
  const senses = [], sections = [], ipa = {};
  let ety = 0, pos = "", gloss = null, inPt = false, subpage = false;
  en.split("\n").forEach(line => {
    const h = line.match(/^=+\s*([^=]+?)\s*=+\s*$/);
    if (h){
      if (/^Etymology/.test(h[1])) ety++;
      else if (POS.test(h[1])){ pos = h[1]; sections.push({ety, pos}); }
      return;
    }
    const sound = line.match(/\{\{IPA\|en\|(\/[^/|}]+\/)/);
    if (sound && !ipa[ety]) ipa[ety] = sound[1];
    if (/\{\{see translation subpage/.test(line)) subpage = true;
    // checktrans-top holds unchecked guesses, so it is left out
    const top = line.match(/^\{\{trans-top(?:-see)?(\|[^}]*)?\}\}/);
    if (top){ gloss = (top[1] || "").split("|").filter(p => p && p.indexOf("=") < 0)[0] || ""; return; }
    if (/^\{\{(trans-bottom|checktrans-top)/.test(line)){ gloss = null; return; }
    if (gloss === null) return;
    if (/^\*\s*Portuguese\s*:/.test(line)) inPt = true;
    else if (!/^\*:/.test(line)) inPt = false;
    if (!inPt) return;
    const pt = ptTerms(line);
    if (!pt.length) return;
    const last = senses[senses.length - 1];
    if (last && last.gloss === gloss && last.pos === pos && last.ety === ety) last.pt.push(...pt);
    else senses.push({ety, pos, gloss, pt});
  });
  return {subpage, senses, sections, ipa};
}

// hinted part of speech first, taking turns between unrelated words with the same spelling
// ("lead" the metal, "lead" the verb)
function ordered(senses, pos){
  const groups = [];
  posFirst(posOnly(senses, pos), pos).forEach(s => { const g = groups.find(g => g.ety === s.ety); g ? g.list.push(s) : groups.push({ety: s.ety, list: [s]}); });
  const out = [];
  const n = groups.reduce((a, g) => a + g.list.length, 0);
  for (let i = 0; out.length < n; i++) groups.forEach(g => { if (g.list[i]) out.push(g.list[i]); });
  return out;
}

// up to 4 meanings: the first word of each sense, then the others
export function ptMeanings(senses, pos){
  const order = ordered(senses, pos);
  const out = [];
  const add = t => { if (t && out.length < 4 && !out.some(o => fold(o) === fold(t))) out.push(t); };
  const depth = Math.max(0, ...senses.map(s => s.pt.length));
  for (let i = 0; i < depth; i++) order.forEach(s => add(s.pt[i]));
  return out;
}

const STOP = new Set(["with", "that", "from", "this", "which", "have", "other", "into", "something", "someone", "used", "being", "more"]);
const words = s => (fold(s).match(/[a-z]{4,}/g) || []).filter(w => !STOP.has(w)).map(w => w.slice(0, 5));
// the REST definition that shares most words with a translation-table gloss ("precedence" ↔ "Precedence; advance position…")
function bestDefinition(gloss, defs){
  const g = words(gloss);
  let best = null, top = 0;
  defs.forEach(d => { const dw = words(d.text); const n = g.filter(w => dw.includes(w)).length; if (n > top){ top = n; best = d; } });
  return best;
}

/* The senses a card takes turns showing, one per review: [{pt, gloss, def, ex, ipa}], up to 4, or [] when
   there is only one. page: parseWiktionaryPt (main page, with the subpage's senses); rest: parseWiktionary.
   A sense counts when it brings a new Portuguese word, which it shows first ("ter (por/como), considerar").
   The definitions and examples are matched to senses by guessing, so the card only takes turns when every
   sense found an example of its own: a wrong pairing would ask one sense and answer another. */
export function buildMeanings(page, pos, rest){
  const used = [], out = [];
  ordered(page.senses, pos).forEach(s => {
    const fresh = s.pt.filter(t => !used.some(u => fold(u) === fold(t)));
    if (!fresh.length || out.length >= 4) return;
    used.push(...fresh);
    out.push({s, pt: fresh.concat(s.pt.filter(t => fresh.indexOf(t) < 0)).slice(0, 3)});
  });
  if (out.length < 2) return [];
  const sections = page.sections || [], ipa = page.ipa || {};
  // REST blocks follow the page's part-of-speech headings; if they don't line up, skip definitions
  const aligned = (rest || []).every(d => sections[d.block] && sections[d.block].pos.toLowerCase() === String(d.pos).toLowerCase());
  const twoSounds = new Set(Object.values(ipa)).size > 1;
  const list = out.map(({s, pt}) => {
    const block = sections.findIndex(x => x.ety === s.ety && x.pos === s.pos);
    const d = aligned && block > -1 ? bestDefinition(s.gloss, rest.filter(r => r.block === block)) : null;
    return {pt, gloss: s.gloss, def: d ? d.text.split("\n")[0] : "", ex: d && d.examples[0] || "", ipa: twoSounds ? ipa[s.ety] || "" : ""};
  });
  const exs = list.map(m => m.ex);
  return exs.every((e, i) => e && exs.indexOf(e) === i) ? list : [];
}
