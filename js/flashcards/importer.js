// Adds a list of words to the deck one by one, looking up translation and examples for each.
// Used by the pasted-list import and by "Palavras do dia".
import { S } from "../state/store.js";
import { enrich, normalizeEnrichment } from "./enrich.js";
import { addCard, findByTerm } from "./deck.js";
import { posPt } from "./providers/free.js";
import { phaseNow } from "../domain/route.js";

const PAUSE_MS = 600;   // keeps the free APIs (MyMemory especially) happy

export function providerOpts(){
  const cefr = phaseNow().cefr;
  return {apiKey: S.secrets.claudeKey || "", model: S.state.settings.claudeModel, level: cefr === "ponto de partida" ? "A2" : cefr, email: S.state.settings.mmEmail};
}

/* items: [{term, translation?, pos?, cefr?}] (pos in English, "verb/noun", used to pick the right sense).
   run: {enrich: bool, stop: bool}, read between words so the caller can stop or turn lookups off.
   onStep({item, card, skipped, quota}) runs after each word. Returns {added, skipped, quota}. */
export async function importTerms(items, run, onStep){
  const res = {added: 0, skipped: 0, quota: false};
  for (const item of items){
    if (run.stop) break;
    if (findByTerm(item.term)){ res.skipped++; onStep && onStep({item, card: null, skipped: true}); continue; }
    let data = normalizeEnrichment({term: item.term, translation: item.translation || ""}, item.term), source = item.source || "import";
    let quota = false;
    if (run.enrich){
      try {
        const r = await enrich(item.term, "", Object.assign(providerOpts(), {pos: item.pos}));
        data = Object.assign(r.data, item.translation ? {translation: item.translation} : {});
        if (r.source === "claude") source = "claude";
      } catch (e){
        if (e && e.message === "quota"){ quota = res.quota = true; run.enrich = false; }
      }
      await new Promise(r => setTimeout(r, PAUSE_MS));
    }
    if (!data.pos && item.pos) data.pos = item.pos.split("/").map(posPt).join(", ");
    if (!data.cefr && item.cefr) data.cefr = item.cefr;
    const card = addCard(data, {source});
    res.added++;
    onStep && onStep({item, card, skipped: false, quota});
  }
  return res;
}
