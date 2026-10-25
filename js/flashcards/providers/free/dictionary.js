// Free Dictionary API: IPA and pronunciation audio, when it's up.
import { tagged } from "../../audio.js";

export const dictionaryUrl = t => "https://api.dictionaryapi.dev/api/v2/entries/en/" + encodeURIComponent(t);

// keeps every British and American recording (space-separated), so changing the accent later still finds one
export function parseDictionary(json){
  const e = Array.isArray(json) ? json[0] : null;
  if (!e) return {};
  const phs = e.phonetics || [];
  const ph = phs.find(p => p.text) || {};
  const audio = phs.map(p => p.audio || "").filter(a => /^https:\/\//.test(a) && tagged(a));
  return {ipa: e.phonetic || ph.text || "", audio: Array.from(new Set(audio)).join(" ")};
}
