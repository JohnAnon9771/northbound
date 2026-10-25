// The 52-week route: per-week lessons, conversation themes and checkpoints.
import { LESSONS, LINKS, EER_LEVEL_URL, LESSON_INDEXES, GA_IDS, GB1_IDS, GB2_IDS, GRAM_IDS, SKILL_IDS } from "./lessons.js";

export const DEFAULT_MIN = {gram:50, list:40, read:40, writ:75, speak:30};
export const TASK_NOTES = {
  gram:"Grammar test 1, explicação, Grammar test 2 e 10 frases suas. Anote a nota do Grammar test 2.",
  writ:"Depois, corrija com o prompt 4 ou no Write & Improve e reescreva.",
  speak:"Repita as useful phrases do vídeo em voz alta (shadowing)."
};
export function task(k, s, t, m, u, n, extra){ return Object.assign({k, s, t, m: m || 0, u: u || null, n: n || ""}, extra || {}); }
export function lessonTask(id){
  const L = LESSONS[id];
  return {k:id, s:L.s, t:L.t, u:L.u, m:DEFAULT_MIN[L.s] || 40, n:TASK_NOTES[L.s] || "", idx:L.idx, bc:true, sc:[id]};
}
export const PHASE_EXTRAS = {
  1:{conv:90, extras:[["pod","list","Podcasts do British Council: 1 episódio com transcrição",60,LINKS.podcasts],["sto","read","Story zone A2–B1: 1 história",50,LINKS.storyA]], vocab:["Vocabulário do British Council: 2 a 3 temas A1–A2 que você ainda não domina",40,"va"]},
  2:{conv:120, extras:[["aud","list","Audio series B1 (Writing home ou Big City Small World): 1 episódio",60,LINKS.audioSeries],["mag","read","Magazine zone: 1 artigo",50,LINKS.magazine]], vocab:["Vocabulário do British Council: 1 tema B1–B2",30,"vb"]},
  3:{conv:160, extras:[["aud","list","Audio zone ou Podcasts for professionals: 1 episódio",60,LINKS.audioZone],["mag","read","Magazine zone ou B2–C1 stories: 1 leitura",50,LINKS.magazine]]},
  4:{conv:120, extras:[]},
  5:{conv:180, extras:[]}
};
export const WEEKS = {};
function W(n, items, conv, o){ WEEKS[n] = Object.assign({items, conv}, o || {}); }
export const levelTestTask = n => task("w"+n+"-bc","test","British Council level test (anote o resultado em Níveis)",30,LINKS.levelTest,"",{ms:true});
export const writeImproveTask = n => task("w"+n+"-wi","writ","Write & Improve: 1 texto, anote a nota CEFR",40,LINKS.wi,"",{ms:true});
export const efsetTask = (n, meta) => task("w"+n+"-ef","test","EF SET 50 min, meta "+meta,60,LINKS.efset,"Registre a pontuação em Níveis.",{ms:true});
export const canDoTask = (n, l) => task("w"+n+"-cd","test","Reavaliar a lista “can-do” "+l,20,"#niveis","",{ms:true});

W(1,[
  task("w1-bc","test","British Council level test (resultado aproximado)",30,LINKS.levelTest,"Exige conta gratuita. Anote o resultado em Níveis.",{ms:true}),
  task("w1-ef","test","EF SET 50 min: seu ponto de partida",60,LINKS.efset,"Se der 38 ou mais, use “Pular semana” no Roteiro para as semanas 2 a 7.",{ms:true}),
  task("w1-wi","writ","Write & Improve: 1 texto curto sobre você",40,LINKS.wi,"",{ms:true}),
  task("w1-cd","test","Autoavaliação das listas “can-do” A2 e B1",20,"#niveis","",{ms:true}),
  task("w1-duo","cards","Flashcards: adicionar as Palavras do dia (A2)",30,"#palavras","Em Palavras, o cartão Palavras do dia traz as mais usadas do A2. Marque as que já sabe e adicione o resto."),
  task("w1-gpt","conv","ChatGPT: prompt 1 (diagnóstico) e salvar os 10 erros em Rotinas",40,"#rotinas"),
  task("w1-gt1","gram","Fazer o “Grammar test 1” das 18 lições A1–A2 e anotar quais ficaram com 80% ou mais",120,LESSON_INDEXES.ga[1],"Anote a nota de cada uma abaixo. Os tópicos com 80% ou mais viram revisão rápida e liberam tempo.",{sc:GA_IDS}),
  task("w1-pod","list","Podcasts do British Council: 1 episódio para sentir o nível",40,LINKS.podcasts)
], null, {label:"Diagnóstico e configuração", noStd:true});

W(2,["GA01","GA02","LA01","RA01","WA01","SA04"],"conversa “about me”");
W(3,["GA04","GA03","LA02","RA02","WA12"],"role-play sobre o seu último fim de semana");
W(4,["GA05","GA06","LA03","RA03","WA11","SA05"],"entrevista sobre o seu trabalho",{ms:["bc","wi"]});
W(5,["GA07","GA08","LA04","RA04","WA10"],"role-play num restaurante");
W(6,["GA09","GA10","LA05","RA05","WA02","SA03"],"small talk");
W(7,["GA11","GA12","LA06","RA06","WA08"],"descrever a sua casa e a sua cidade");
W(8,["GA13","LA07","RA07","WA05","SA01"],"reclamar de um problema",{ms:["bc","wi"]});
W(9,["GA14","GA15","LA08","RA08","WA06"],"comparar cidades ou produtos");
W(10,["GA16","GA17","LA09","RA09","WA09","SA02"],"dar instruções");
W(11,["GA18","GB01","LA10","RA10","WA03"],"experiências (“Have you ever…?”)");
W(12,["GB02",task("w12-rev","gram","Revisão: os seus 10 erros recorrentes (prompt 7)",30,"#rotinas"),
  task("w12-blk","gram","Revisão do bloco A2 (GA01 a GA18): refaça as lições com nota abaixo de 80%",30,LESSON_INDEXES.ga[1],"",{rev:GA_IDS,nv:true}),"LA11","LA12",
  task("w12-pod","list","Podcasts do British Council, série 1: 1 episódio",50,LINKS.podcasts),
  task("w12-sto","read","Story zone A2–B1: 1 história",50,LINKS.storyA),"WA04","WA07"],
  "conversa livre de 20 min, avaliada no fim",{ms:["ef:38 a 42","cd:A2"],noExtras:true,label:"Checkpoint A2+",block:true,err:true});

W(13,["GB03","LB08","RB03","WB01","SB04"],"planos de viagem",{soft:true,note:"Semana mais leve depois do checkpoint: sem os extras de listening, leitura e vocabulário. Mantenha as lições, a conversa e as revisões."});
W(14,["GB04","GB05","LB11","RB02","WB05"],"a sua infância (“used to”)");
W(15,["GB06","LB09","RB04","WB06","SB03"],"hipóteses (“If I…”)");
W(16,["GB07","LB07","RB01","WB04"],"regras do trabalho ou da escola",{ms:["bc","wi"]});
W(17,["GB08","GB09","LB01","RB05","WB07","SB05"],"contar uma história");
W(18,["GB10","LB04","RB06","WB02"],"explicar um processo (voz passiva)");
W(19,["GB11","LB10","RB12","WB11","SB02"],"pedir favores");
W(20,["GB12","GB13","LB02","RB13","WB08"],"recontar uma conversa",{ms:["bc","wi"]});
W(21,["GB14","GB15","LB05","RB07","WB03","SB01"],"debate leve");
W(22,["GB16","GB17","LB06","RB11","WB09"],"comparar opções");
W(23,["GB18","GB19","LB03","RB10","WB10"],"descrever dados e tendências");
W(24,["GB20","GB21","LB12","RB08","WB12"],"conversa de 25 min, avaliada no fim",{ms:["ef:41 a 50 (B1)"]});
W(25,[task("w25-rev","gram","Revisão: os seus 10 erros recorrentes (prompt 7)",30,"#rotinas"),
  task("w25-blk","gram","Revisão do bloco B1 (GB01 a GB21): refaça as lições com nota abaixo de 80%",60,LESSON_INDEXES.gb[1],"",{rev:GB1_IDS,nv:true}),
  task("w25-wh","list","Audio series: Writing home",60,LINKS.audioSeries),"RB09",
  task("w25-sto","read","Story zone A2–B1: 1 história",50,LINKS.storyA),
  task("w25-op","writ","Texto de opinião de 180 palavras, corrigido com o prompt 4",75,"#rotinas"),
  task("w25-mock","speak","Mock oral estilo B1 Preliminary com o ChatGPT",40,"#rotinas")],
  "conversa livre",{noExtras:true,label:"Revisão",block:true,err:true});
W(26,[task("w26-bcsw","list","Audio series: Big City Small World",60,LINKS.audioSeries),
  task("w26-mag","read","Magazine zone: 1 artigo",50,LINKS.magazine),
  task("w26-rew","writ","Reescrever 2 textos antigos",60)],
  "conversa livre",{ms:["cd:B1"],noExtras:true,light:true,label:"Semana leve",note:"Semana leve: cerca de 30% menos tempo. Descanse."});

W(27,["GB22","L2-10","R2-06","W2-09","S2-04"],"dar conselhos");
W(28,["GB23","L2-09","R2-03","W2-07"],"os seus planos para os próximos 5 anos");
W(29,["GB24","L2-08","R2-01","W2-06","S2-02"],"resolver um problema");
W(30,["GB25","L2-07","R2-02","W2-08"],"arrependimentos (“If I had…”)");
W(31,["GB26","L2-11","R2-10","W2-03","S2-03"],"prós e contras",{ms:["bc","wi"]});
W(32,["GB27","L2-12","R2-09","W2-12"],"especular sobre o passado");
W(33,["GB28","L2-03","R2-07","W2-01","S2-05"],"persuadir alguém");
W(34,["GB29","L2-05","R2-05","W2-02"],"entrevista de emprego");
W(35,["GB30","L2-01","R2-08","W2-10","S2-01"],"contestar ideias",{ms:["bc","wi"]});
W(36,["GB31","L2-02","R2-04","W2-05"],"apresentar um gráfico em 3 minutos",{ms:["ef:48 a 53"]});
W(37,["GB32","L2-04","R2-11","W2-11"],"debate com contra-argumento");
W(38,["GB33",task("w38-pp","list","Podcasts for professionals: 1 episódio",50,LINKS.business),
  task("w38-mag","read","Magazine zone: 1 artigo",50,LINKS.magazine),"W2-04"],"discussão de uma notícia",{noExtras:true});
W(39,["GB34",task("w39-az","list","Audio zone: 1 episódio",50,LINKS.audioZone),
  task("w39-bm","read","Business magazine: 1 artigo",50,LINKS.business),
  task("w39-es","writ","Opinion essay #2 (cerca de 250 palavras)",75,LESSON_INDEXES.wb2[1],TASK_NOTES.writ)],"small talk avançado",{ms:["bc","wi"],noExtras:true});
W(40,["GB35",task("w40-vz","list","Video zone: 1 vídeo",50,LINKS.videoZone),
  task("w40-st","read","B2–C1 stories: 1 história",50,LINKS.storyB),
  task("w40-rp","writ","Report #2",75,LESSON_INDEXES.wb2[1],TASK_NOTES.writ)],"reunião simulada",{noExtras:true});
W(41,["GB36",task("w41-ws","list","Word on the Street: 1 episódio",50,LINKS.videoSeries),
  task("w41-st","read","B2–C1 stories: 1 história",50,LINKS.storyB),
  task("w41-lc","writ","Letter of complaint #2",75,LESSON_INDEXES.wb2[1],TASK_NOTES.writ)],"negociação",{noExtras:true});
W(42,[task("w42-rev","gram","Revisão do bloco B2 (GB22 a GB36): refaça as lições com nota abaixo de 80%",90,LESSON_INDEXES.gb[1],"",{rev:GB2_IDS}),
  task("w42-az","list","Audio zone: 1 episódio",50,LINKS.audioZone),
  task("w42-mag","read","Magazine zone: 1 artigo",50,LINKS.magazine),
  task("w42-es","writ","Essay cronometrado (40 min) no Write & Improve",60,LINKS.wi),
  task("w42-mk","speak","Mock oral B2 com o prompt 6",40,"#rotinas")],"conversa livre",{noExtras:true,label:"Revisão B2",block:true});
W(43,[task("w43-rev","gram","Revisão: os seus 10 erros recorrentes (prompt 7)",60,"#rotinas"),
  task("w43-pp","list","Podcasts for professionals: 1 episódio",50,LINKS.business),
  task("w43-bm","read","Business magazine: 1 artigo",50,LINKS.business),
  task("w43-rw","writ","Reescrever 3 textos antigos",75)],"debate de 15 min",{ms:["bc","wi"],noExtras:true,label:"Revisão dos erros",err:true});
W(44,[task("w44-se","list","Série livre em inglês",60),
  task("w44-bk","read","Livro graded (English e-Reader, B2 intermediate-plus) ou artigo",60,EER_LEVEL_URL+"intermediate-plus"),
  task("w44-di","writ","Diário em inglês",40)],"conversa livre",{ms:["cd:B2"],noExtras:true,light:true,label:"Semana leve",note:"Semana leve: cerca de 30% menos tempo."});

const exam = n => task("w"+n+"-ex","speak","ChatGPT como examinador B2 (prompt 6)",45,"#rotinas");
W(45,[task("w45-es","writ","Simulado: opinion essay no Write & Improve, refazer até chegar a B2",80,LINKS.wi),
  task("w45-ml","writ","Simulado: e-mail formal",50,LINKS.wi), exam(45),
  task("w45-rev","gram","Revisão dos seus erros (prompt 7)",30,"#rotinas"),
  task("w45-az","list","Audio zone: 1 episódio",60,LINKS.audioZone),
  task("w45-mag","read","Magazine zone: 1 artigo",50,LINKS.magazine)],"conversa livre",{label:"Simulados",err:true});
W(46,[task("w46-rp","writ","Simulado: report",80,LINKS.wi),
  task("w46-lc","writ","Simulado: letter of complaint",50,LINKS.wi), exam(46),
  task("w46-gr","gram","English grammar reference: revisar 3 tópicos fracos",45,LINKS.gramRef),
  task("w46-pp","list","Podcasts for professionals: 1 episódio",60,LINKS.business),
  task("w46-st","read","B2–C1 stories: 1 história",50,LINKS.storyB)],"conversa livre",{label:"Simulados"});
W(47,[task("w47-full","writ","Simulado completo cronometrado: essay, report e e-mail",120,LINKS.wi), exam(47),
  task("w47-vz","list","Video zone: 1 vídeo",60,LINKS.videoZone),
  task("w47-bm","read","Business magazine: 1 artigo",50,LINKS.business),
  task("w47-rev","gram","Revisão dos seus erros (prompt 7)",30,"#rotinas")],"conversa livre",{label:"Simulados",err:true});
W(48,[task("w48-wi","writ","Write & Improve: essay final, anote a nota CEFR",60,LINKS.wi,"",{ms:true}),
  task("w48-ex","speak","Conversa avaliada pelo ChatGPT examinador B2 (prompt 6)",45,"#rotinas","",{ms:true}),
  task("w48-az","list","Audio zone: 1 episódio",60,LINKS.audioZone),
  task("w48-st","read","B2–C1 stories: 1 história",50,LINKS.storyB)],null,{ms:["ef:51 a 60 (B2)","bc","cd:B2"],label:"Checkpoint B2"});
W(49,[task("w49-redo","gram","Refazer as lições de gramática com nota abaixo de 80%",120,LESSON_INDEXES.gb[1],"",{rev:GRAM_IDS}),
  task("w49-c1g","gram","C1 grammar: 1 tópico",50,LINKS.c1g),
  task("w49-c1l","list","Listening C1: 1 lição",40,LINKS.c1l),
  task("w49-b2f","test","Decidir se vai marcar o B2 First (prova oficial, paga)",15)],"conversa livre",{label:"Fechar lacunas"});
W(50,[task("w50-redo","writ","Refazer as lições de habilidades com nota abaixo de 80%",120,null,"",{rev:SKILL_IDS}),
  task("w50-c1r","read","Reading C1: 1 lição",40,LINKS.c1r),
  task("w50-c1w","writ","Writing C1: 1 lição",60,LINKS.c1w),
  task("w50-az","list","Audio zone: 1 episódio",60,LINKS.audioZone)],"debate sobre um tema abstrato",{label:"Fechar lacunas"});
W(51,[task("w51-c1g","gram","C1 grammar: 2 tópicos",90,LINKS.c1g),
  task("w51-c1l","list","Listening C1: 1 lição",40,LINKS.c1l),
  task("w51-c1r","read","Reading C1: 1 lição",40,LINKS.c1r),
  task("w51-c1w","writ","Writing C1: 1 lição",60,LINKS.c1w)],"debate de 45 min",{label:"Início do C1"});
W(52,[task("w52-retro","test","Retrospectiva: compare testes, horas e listas “can-do” desde a semana 1",40,"#progresso"),
  task("w52-plan","test","Planejar a fase 5 (rumo ao C1)",20,"#roteiro"),
  task("w52-az","list","Audio zone ou Video zone: 1 episódio",60,LINKS.audioZone),
  task("w52-st","read","B2–C1 stories: 1 história",50,LINKS.storyB)],"conversa livre",{label:"Retrospectiva"});
