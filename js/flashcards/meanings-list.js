// Ready-made senses for the words in assets/data/words.tsv: assets/data/meanings/<first letter>.json, built by
// scripts/merge-meanings.mjs and checked by scripts/check-meanings.mjs. Each sense's Portuguese words, definition
// and example were written together, so a card's question and answer always match (the free sources glue them
// together by guessing). Pure helpers except loadShard/lookupMeanings, so they run under node --test.
import { posPt } from "./pos.js";

export const LIST_SRC = "list";
export const shardOf = term => { const c = String(term).trim().toLowerCase()[0] || ""; return c >= "a" && c <= "z" ? c : "_"; };

const shards = {};
// a missing or unreachable shard reads as empty and is fetched again next time
export function loadShard(letter){
  if (!shards[letter]) shards[letter] = fetch("assets/data/meanings/" + letter + ".json")
    .then(r => r.ok ? r.json() : r.status === 404 ? {} : Promise.reject(new Error("http " + r.status)))
    .catch(() => { delete shards[letter]; return null; });
  return shards[letter];
}
export async function lookupMeanings(term){
  const k = String(term || "").trim().toLowerCase();
  if (!k) return null;
  try { const s = await loadShard(shardOf(k)); return (s && s[k]) || null; } catch (e){ return null; }
}

/* entry: {pos, ipa, senses: [{pos, pt, def, ex, form, exPt, hit, ipa?}]} → card content fields
   (a sense's own ipa is for words spelled alike but said differently: "tear" /tɪə/ lágrima, /teə/ rasgar).
   One sense: a plain card. Several: the card takes turns (meanings), and its examples are the senses' own. */
export function toCard(entry, term, context){
  const senses = entry.senses || [];
  const ctx = String(context || "").trim();
  const examples = (ctx ? [{en: ctx, pt: ""}] : []).concat(senses.map(s => ({en: s.ex, pt: s.exPt})));
  return {
    term, ipa: entry.ipa || "", src: LIST_SRC,
    pos: [...new Set(senses.map(s => posPt(s.pos)))].join(", "),
    translation: senses.length > 1 ? senses.map(s => s.pt[0]).join(", ") : (senses[0] ? senses[0].pt.join(", ") : ""),
    definition: senses[0] ? senses[0].def : "",
    examples,
    meanings: senses.length > 1 ? senses.map(s => ({pt: s.pt, gloss: "", def: s.def, ex: s.ex, exPt: s.exPt, form: s.form, ipa: s.ipa || ""})) : []
  };
}

// an existing card brought up to the list: its content is replaced, your sentence, notes, tags and audio stay
export function refreshed(card, entry){
  const fresh = toCard(entry, card.term, card.context);
  return Object.assign({}, card, fresh, {ipa: fresh.ipa || card.ipa || ""});
}
