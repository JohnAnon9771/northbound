// The Diário: reads the feedback block ChatGPT gives at the end of a conversation or a text correction
// (prompts 2, 3 and 4) and turns the logged sessions into progress. Pure, so it runs under node --test.
import { CRIT } from "../state/schema.js";

export const CRIT_NAMES = {flu: "Fluência", gram: "Gramática", voc: "Vocabulário", ta: "Tarefa", org: "Organização"};
const CRIT_WORDS = [[/fluen/i, "flu"], [/grammar/i, "gram"], [/vocab|lexi/i, "voc"], [/task/i, "ta"], [/organi[sz]|coheren/i, "org"]];
const ARROW = /\s*(?:→|->|=>|⟶|➔|➜)\s*/;
const HEAD = /^(?:\d+[.)]\s*)?(?:errors?|mistakes?|corrections?)\b[^:]{0,30}:?\s*$/i;
// a section title: bold or markdown heading, or a line ending in ":" (and no correction in it)
const isTitle = raw => !ARROW.test(raw) && (/^(?:\*\*|#)/.test(raw) || /:\s*\**$/.test(raw));
const nf = v => v.toLocaleString("pt-BR", {maximumFractionDigits: 1});

// strips list markers, markdown and quotes from one side of a correction
function clean(s){
  return s.replace(/^\s*(?:[-*•–]|\d+[.)]|\(\d+\))\s*/, "").replace(/^(?:error|mistake|correction)\s*\d*\s*:\s*/i, "")
    .replace(/\*\*|__|`/g, "").replace(/\s+\([^)]*\)\s*\.?$/, "").replace(/\s+[—–]\s+.*$/, "")
    .replace(/^["“”'‘’]+|["“”'‘’]+$/g, "").replace(/\s*\.$/, "").trim();
}
function pair(line){
  let m = line.split(ARROW);
  if (m.length === 2) return [clean(m[0]), clean(m[1])];
  m = line.match(/^(.+?)\s+should be\s+(.+)$/i) || line.match(/^instead of\s+(.+?),\s*(?:say|use|write)\s+(.+)$/i);
  return m ? [clean(m[1]), clean(m[2])] : null;
}

export function parseFeedback(text, kind){
  const lines = String(text || "").split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const keys = CRIT[kind] || CRIT.conv;
  const out = {level: "", crit: {}, errs: [], grammar: ""};
  // level: a "Level:" line wins over any other line that mentions a level
  const lv = l => { const m = l.replace(/\*\*/g, "").match(/\b([ABC][12])(\+)?(?![0-9])/); return m ? m[1] + (m[2] || "") : ""; };
  const lvLine = lines.find(l => /^\W*(?:estimated\s+)?(?:cefr\s+)?level\b/i.test(l.replace(/\*\*/g, "")) && lv(l)) || lines.find(l => /level|cefr/i.test(l) && lv(l));
  if (lvLine) out.level = lv(lvLine);
  // scores: "fluency 3/5", "Grammar range and accuracy: 2.5/5"
  lines.forEach(l => {
    const re = /([A-Za-z][A-Za-z &]{1,40}?)\s*[:=\-–]?\s*(\d(?:[.,]5)?)\s*\/\s*5/g;
    let m;
    while ((m = re.exec(l.replace(/\*\*/g, "")))){
      const w = CRIT_WORDS.find(c => c[0].test(m[1]));
      if (w && keys.indexOf(w[1]) > -1 && out.crit[w[1]] == null) out.crit[w[1]] = Number(m[2].replace(",", "."));
    }
  });
  const g = lines.map(l => l.replace(/\*\*/g, "").match(/^\W*grammar point(?: to review)?\s*[:\-–]\s*(.+)$/i)).find(Boolean);
  if (g) out.grammar = clean(g[1]).slice(0, 160);
  // corrections: only the lines under an "Errors:" header when there is one,
  // since the "better phrases" part often uses arrows too
  // (the last header wins: the pasteable block comes at the end)
  let h = -1;
  lines.forEach((l, i) => { if (HEAD.test(l.replace(/\*\*|#+\s*/g, ""))) h = i; });
  let pool = lines;
  if (h > -1){
    pool = [];
    for (let i = h + 1; i < lines.length; i++){
      if (/^\W*grammar point/i.test(lines[i].replace(/\*\*/g, "")) || isTitle(lines[i])) break;
      pool.push(lines[i]);
    }
  }
  const seen = new Set();
  pool.forEach(l => {
    const p = pair(l);
    if (!p || !p[0] || !p[1] || p[0].length > 160 || p[1].length > 160 || errKey(p[0]) === errKey(p[1])) return;
    if (seen.has(errKey(p[0]))) return;
    seen.add(errKey(p[0]));
    out.errs.push({wrong: p[0], right: p[1]});
  });
  return out;
}

// compares errors ignoring case, quotes and punctuation
export const errKey = s => String(s || "").toLowerCase().replace(/[’']/g, "'").replace(/[^\p{L}\p{N}' ]+/gu, " ").replace(/\s+/g, " ").trim();

const byDate = (a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (a.ts || 0) - (b.ts || 0);
export const sessionsFor = (entries, kind) => entries.filter(e => e.kind === kind).sort(byDate);
export const countForTask = (entries, key) => entries.filter(e => e.task === key).length;

export function average(entries, k){
  const v = entries.map(e => e.crit[k]).filter(x => x != null);
  return v.length ? v.reduce((a, x) => a + x, 0) / v.length : null;
}
// average of each score over the last n sessions against the n before them
export function trend(entries, kind, n){
  n = n || 4;
  const s = sessionsFor(entries, kind), now = s.slice(-n), before = s.slice(-2 * n, -n);
  return CRIT[kind].map(k => ({k, now: average(now, k), before: average(before, k)})).filter(t => t.now != null);
}
export function latestLevel(entries, kind){
  const s = sessionsFor(entries, kind).filter(e => e.level);
  return s.length ? s[s.length - 1] : null;
}
// errors that came back in more than one session, most frequent first
export function repeatErrors(entries){
  const m = new Map();
  sessionsFor(entries, "conv").concat(sessionsFor(entries, "writ")).forEach(e => {
    new Set(e.errs.map(x => errKey(x.wrong))).forEach(key => {
      const x = e.errs.find(y => errKey(y.wrong) === key);
      const r = m.get(key) || {wrong: x.wrong, right: x.right, n: 0, last: ""};
      r.n++; if (e.date >= r.last){ r.last = e.date; r.right = x.right; }
      m.set(key, r);
    });
  });
  return Array.from(m.values()).filter(r => r.n > 1).sort((a, b) => b.n - a.n || (a.last < b.last ? 1 : -1));
}
export function grammarTop(entries, max){
  const m = new Map();
  entries.forEach(e => { if (!e.grammar) return; const k = errKey(e.grammar); const r = m.get(k) || {t: e.grammar, n: 0}; r.n++; m.set(k, r); });
  return Array.from(m.values()).sort((a, b) => b.n - a.n).slice(0, max || 5);
}

/* A few plain sentences on how the sessions are going. week: {done, goal} for this route week's conversations. */
export function insights(entries, week){
  const out = [];
  if (week && week.goal){
    const left = week.goal - week.done;
    out.push(left > 0 ? (week.done ? "Você fez " + week.done + " de " + week.goal + " conversas desta semana. Falta" + (left > 1 ? "m " : " ") + left + "." : "Nenhuma conversa registrada nesta semana ainda. A meta é " + week.goal + ".") : "Meta de conversas da semana cumprida (" + week.done + " de " + week.goal + ").");
  }
  [["conv", "nas conversas", "das conversas"], ["writ", "nos textos", "dos textos"]].forEach(([kind, inWhat, ofWhat]) => {
    const t = trend(entries, kind).filter(x => x.before != null);
    if (!t.length) return;
    const best = t.slice().sort((a, b) => (b.now - b.before) - (a.now - a.before))[0], worst = t.slice().sort((a, b) => (a.now - a.before) - (b.now - b.before))[0];
    if (best.now - best.before >= 0.25) out.push(CRIT_NAMES[best.k] + " " + inWhat + " subiu de " + nf(best.before) + " para " + nf(best.now) + " (média das últimas 4).");
    if (worst !== best && worst.now - worst.before <= -0.25) out.push(CRIT_NAMES[worst.k] + " " + inWhat + " caiu de " + nf(worst.before) + " para " + nf(worst.now) + ": vale um deep dive (prompt 5).");
    else if (best.now - best.before < 0.25 && sessionsFor(entries, kind).length >= 8) out.push("As notas " + ofWhat + " estão estáveis. Tente um tema ou nível um pouco mais difícil.");
  });
  const r = repeatErrors(entries)[0];
  if (r) out.push("“" + r.wrong + "” apareceu em " + r.n + " sessões. O certo é “" + r.right + "”.");
  const conv = sessionsFor(entries, "conv").filter(e => e.min > 0);
  if (conv.length >= 4){
    const a = conv.slice(-2).reduce((s, e) => s + e.min, 0) / 2, b = conv.slice(0, 2).reduce((s, e) => s + e.min, 0) / 2;
    if (a - b >= 5) out.push("Suas conversas cresceram de " + Math.round(b) + " para " + Math.round(a) + " minutos em média.");
  }
  return out;
}
