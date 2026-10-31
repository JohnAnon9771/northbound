// Checkpoint report: for each skill, the result logged near a checkpoint against its target.
// Finishing the week's content is one thing, proving the level another. Pure, so it runs under node --test.
import { addDays } from "../core/date.js";
import { CHECKPOINTS, CHECKPOINT_SKILLS } from "../data/checkpoints.js";
import { efLevel } from "./efset.js";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
export const LEVEL_SCALE = ["pré-A1", "A1", "A2", "A2+", "B1", "B1+", "B2", "B2+", "C1", "C2"];
export const levelRank = l => LEVEL_SCALE.indexOf(String(l || "").trim());

/* Where evidence comes from: `skills` it counts for, `strong` when it is independent of the study itself.
   With `pick`, a result's own `skill` wins (and "outro" counts only once it has one). ChatGPT is never strong.
   Extension point: a new test type, like the periodic speaking test, only needs an entry here. */
export const SOURCES = {
  efset: {name: "EF SET", skills: ["list", "read"], strong: true},
  bc: {name: "British Council", skills: ["list", "read"], strong: true},
  wi: {name: "Write & Improve", skills: ["writ"], strong: true},
  outro: {name: "Outro", skills: [], pick: true, strong: true},
  gpt: {name: "ChatGPT examinador", skills: ["speak"], pick: true, strong: false},
  "diario-conv": {name: "Diário (conversa)", skills: ["speak"], strong: false},
  "diario-writ": {name: "Diário (texto)", skills: ["writ"], strong: false}
};
// the skills a test result counts for
export function skillsOf(t){
  const src = SOURCES[t.type];
  if (!src) return [];
  return src.pick && CHECKPOINT_SKILLS.includes(t.skill) ? [t.skill] : src.skills;
}

// tests (Níveis) and Diário sessions as one evidence list: {skill, date, level, score, src, strong, ord}
export function evidenceFrom(tests, feedback){
  const out = [];
  (tests || []).forEach((t, i) => {
    if (!t || !ISO.test(t.date) || !SOURCES[t.type]) return;
    const score = t.type === "efset" && String(t.score == null ? "" : t.score).trim() !== "" && isFinite(Number(t.score)) ? Number(t.score) : null;
    const level = levelRank(t.level) > -1 ? t.level : score != null ? efLevel(score) : "";
    if (score == null && !level) return;
    skillsOf(t).forEach(skill => out.push({skill, date: t.date, level, score, src: t.type, strong: SOURCES[t.type].strong, ord: i}));
  });
  const base = out.length;
  (feedback || []).forEach((e, i) => {
    const src = SOURCES["diario-" + (e && e.kind)];
    if (!src || !ISO.test(e.date) || levelRank(e.level) < 0) return;
    src.skills.forEach(skill => out.push({skill, date: e.date, level: e.level, score: null, src: "diario-" + e.kind, strong: false, ord: base + i}));
  });
  return out;
}

// the day a checkpoint is judged: the last of its milestone tasks marked done, else today
export function anchorFor(msKeys, done, todayISO){
  const ds = msKeys.map(k => done[k]).filter(d => typeof d === "string" && ISO.test(d)).sort();
  return ds.length ? ds[ds.length - 1] : todayISO;
}

export const WINDOW = {before: 28, after: 14};
// an EF SET score is compared with the score target; anything else by CEFR level
export function meets(ev, target){
  if (ev.score != null && target.ef != null) return ev.score >= target.ef;
  return levelRank(ev.level) >= levelRank(target.level);
}
const latestFirst = (a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : b.ord - a.ord;

/* One row per skill: the latest independent result in the window around the anchor (a weak one only when
   there is none), its status (met, below or none) and whether it is weak. Proven: all four met, none weak. */
export function checkpointReport(cp, evidence, anchor){
  const from = addDays(anchor, -WINDOW.before), to = addDays(anchor, WINDOW.after);
  const near = evidence.filter(e => e.date >= from && e.date <= to);
  const rows = CHECKPOINT_SKILLS.map(skill => {
    const target = cp.targets[skill];
    const mine = near.filter(e => e.skill === skill).sort(latestFirst);
    const ev = mine.find(e => e.strong) || mine[0] || null;
    return {skill, target, ev, weak: !!ev && !ev.strong, status: !ev ? "none" : meets(ev, target) ? "met" : "below"};
  });
  const met = rows.filter(r => r.status === "met" && !r.weak).length;
  return {level: cp.level, anchor, from, to, rows, met, proven: met === rows.length};
}

// the last checkpoint week in [from, to] already reached (n <= upTo), or null
export function lastCheckpoint(from, to, upTo){
  const ws = Object.keys(CHECKPOINTS).map(Number).filter(n => n >= from && n <= to && n <= upTo);
  return ws.length ? Math.max(...ws) : null;
}
