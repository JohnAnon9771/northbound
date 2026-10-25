// A few meaningful milestones. `ctx` is computed by the app (see ui/achievement-check.js); tests pass plain objects.
export const ACHIEVEMENTS = [
  {id: "first-card", icon: "cards", t: "Primeira palavra", d: "Você adicionou o primeiro cartão.", test: c => c.cards >= 1},
  {id: "known-100", icon: "leaf", t: "100 palavras", d: "100 palavras com revisão a cada 3 semanas ou mais.", test: c => c.known >= 100},
  {id: "known-500", icon: "leaf", t: "500 palavras", d: "Vocabulário de conversa do dia a dia.", test: c => c.known >= 500},
  {id: "known-1000", icon: "leaf", t: "1.000 palavras", d: "Mil palavras guardadas de verdade.", test: c => c.known >= 1000},
  {id: "known-2000", icon: "leaf", t: "2.000 palavras", d: "Faixa de vocabulário do B2.", test: c => c.known >= 2000},
  {id: "streak-7", icon: "flame", t: "7 dias seguidos", d: "Uma semana inteira de constância.", test: c => c.streak >= 7},
  {id: "streak-30", icon: "flame", t: "30 dias seguidos", d: "Um mês sem quebrar a sequência.", test: c => c.streak >= 30},
  {id: "streak-100", icon: "flame", t: "100 dias seguidos", d: "O hábito já é seu.", test: c => c.streak >= 100},
  {id: "hours-10", icon: "target", t: "10 horas", d: "As primeiras 10 horas de estudo.", test: c => c.hours >= 10},
  {id: "hours-100", icon: "target", t: "100 horas", d: "Cem horas de inglês.", test: c => c.hours >= 100},
  {id: "hours-450", icon: "target", t: "450 horas", d: "A meta de horas para o B2.", test: c => c.hours >= 450},
  {id: "week-1", icon: "check", t: "Primeira semana fechada", d: "Uma semana da rota concluída.", test: c => c.weeksDone >= 1},
  {id: "phase-1", icon: "route", t: "A2 consolidado", d: "Você passou da fase 1.", test: c => c.week > 12},
  {id: "phase-2", icon: "route", t: "B1 construído", d: "Você passou da fase 2.", test: c => c.week > 26},
  {id: "phase-3", icon: "route", t: "Chegada ao B2", d: "Você passou da fase 3.", test: c => c.week > 44},
  {id: "phase-4", icon: "route", t: "B2 comprovado", d: "Rota de 52 semanas completa.", test: c => c.week > 52},
  {id: "ef-b1", icon: "star", t: "EF SET B1", d: "41 pontos ou mais no EF SET.", test: c => c.efBest >= 41},
  {id: "ef-b2", icon: "star", t: "EF SET B2", d: "51 pontos ou mais no EF SET.", test: c => c.efBest >= 51},
  {id: "ef-c1", icon: "star", t: "EF SET C1", d: "61 pontos ou mais no EF SET.", test: c => c.efBest >= 61},
  {id: "conv-20", icon: "speak", t: "20 minutos de conversa", d: "Uma conversa de 20 minutos ou mais registrada.", test: c => c.longestConv >= 20},
  {id: "reviews-1000", icon: "cards", t: "1.000 revisões", d: "Mil respostas nos flashcards.", test: c => c.reviews >= 1000}
];

export function newlyUnlocked(ctx, unlocked){
  return ACHIEVEMENTS.filter(a => !unlocked[a.id] && a.test(ctx));
}
