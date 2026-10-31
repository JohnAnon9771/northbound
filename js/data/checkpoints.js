// What each route checkpoint has to prove, per skill. `ef` is the EF SET minimum score; the rest compares CEFR levels.
// Targets follow the phase `check` in phases.js; week 36 is a midway B1+ step before the B2 of weeks 44 and 48.
const T = (level, ef) => ({level, targets: {list: {level, ef}, read: {level, ef}, writ: {level}, speak: {level}}});
export const CHECKPOINTS = {
  12: T("A2+", 38),
  24: T("B1", 41),
  26: T("B1", 41),
  36: T("B1+", 48),
  44: T("B2", 51),
  48: T("B2", 51)
};
export const CHECKPOINT_SKILLS = ["list", "read", "writ", "speak"];
// what to do when a skill is below the target
export const REVISE = {
  list: "reouça sem transcrição as lições de listening da fase e refaça o teste em 2 a 4 semanas.",
  read: "volte às lições de reading com nota abaixo de 80% e leia 1 história por dia antes de refazer o teste.",
  writ: "reescreva 2 textos com o prompt 4 e mande um texto novo ao Write & Improve.",
  speak: "faça 2 conversas a mais com o prompt 2 e refaça o teste de fala."
};
