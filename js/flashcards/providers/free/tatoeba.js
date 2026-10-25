// Tatoeba: real sentences with human pt-BR translations.
export const tatoebaUrl = t => "https://api.tatoeba.org/unstable/sentences?lang=eng&q=" + encodeURIComponent('"' + t + '"') + "&trans:lang=por&sort=relevance&limit=20&showtrans=matching";

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
