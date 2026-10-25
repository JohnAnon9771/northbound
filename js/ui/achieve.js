// Computes the achievement context from the store and unlocks what's new.
import { S, update } from "../state/store.js";
import { today } from "../core/date.js";
import { toast } from "../core/toast.js";
import { newlyUnlocked } from "../domain/achievements.js";
import { minutesByDate, streak, knownCount } from "../domain/stats.js";
import { currentRoadmapWeek, weekComplete } from "../domain/pace.js";
import { confetti } from "./celebrate.js";

export function achievementContext(){
  const rw = currentRoadmapWeek();
  let weeksDone = 0;
  for (let n = 1; n < Math.min(rw + 1, 400); n++) if (!S.state.skip[n] && weekComplete(n)) weeksDone++;
  const ef = S.state.tests.filter(t => t.type === "efset").map(t => Number(t.score)).filter(v => isFinite(v));
  return {
    cards: S.cards.filter(c => c.dir !== "rev").length,
    known: knownCount(S.cards),
    streak: streak(minutesByDate(S.logs), today()).days,
    hours: S.logs.reduce((a, e) => a + e.min, 0) / 60,
    weeksDone, week: rw,
    efBest: ef.length ? Math.max(...ef) : 0,
    longestConv: S.logs.filter(e => e.skill === "conv").reduce((a, e) => Math.max(a, e.min), 0),
    reviews: S.reviews.length
  };
}

export function checkAchievements(silent){
  const fresh = newlyUnlocked(achievementContext(), S.state.achievements);
  if (!fresh.length) return;
  update(s => fresh.forEach(a => { s.achievements[a.id] = today(); }));
  if (silent) return;
  const a = fresh[fresh.length - 1];
  confetti(null, true);
  toast(a.d + (fresh.length > 1 ? " (+" + (fresh.length - 1) + " outras em Progresso)" : ""), [], {title: "Conquista: " + a.t, tone: "warm", ms: 7000});
}
