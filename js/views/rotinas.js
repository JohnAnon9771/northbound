// Rotinas: how to use the flashcards, the week split, recurring errors and the ChatGPT prompts.
import { S, update } from "../core/store.js";
import { esc, icon, fmtH, uid } from "../core/dom.js";
import { toast } from "../core/toast.js";
import { PROMPTS } from "../data/prompts.js";
import { extraPlan, planSplit, phaseNow } from "../domain/route.js";
import { addCard, findByTerm } from "../flashcards/deck.js";

function promptText(i){
  if (i === 6 && S.state.errors.length){
    const list = S.state.errors.slice().sort((a, b) => (b.count || 1) - (a.count || 1)).slice(0, 10).map(e => "“" + e.wrong + "” should be “" + e.right + "”").join("; ");
    return PROMPTS[6][1].replace("[...]", list);
  }
  return PROMPTS[i][1];
}
async function copyText(text, i){
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch (e){}
  if (!ok){
    const ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select();
    try { ok = document.execCommand("copy"); } catch (e){}
    ta.remove();
  }
  if (ok) toast("Prompt copiado. Cole no ChatGPT.");
  else {
    const el = document.getElementById("pt-" + i), range = document.createRange(), sel = window.getSelection();
    range.selectNodeContents(el); sel.removeAllRanges(); sel.addRange(range);
    toast("Não deu para copiar automaticamente. O texto está selecionado: copie manualmente.");
  }
}

function cardsHTML(){
  const p = phaseNow();
  return '<section class="card section" aria-labelledby="hCards"><h2 id="hCards">Flashcards, 20 minutos por dia</h2>' +
    '<div class="now" style="--pc:var(' + p.col + ')"><b>Agora, fase ' + p.id + ":</b> " + esc(p.cards) + "</div>" +
    '<ol class="plain"><li>Faça todas as revisões pendentes primeiro. O estudo já mostra as revisões antes das novas.</li>' +
    "<li>Palavras novas só entram se as revisões do dia levaram menos de 15 minutos. Passou disso, o site segura as novas até amanhã: com o tempo as revisões crescem, e são elas que seguram o vocabulário.</li>" +
    "<li>Salve 3 a 5 chunks da lição do British Council do dia (2 min).</li></ol>" +
    "<h3>Como montar os cartões</h3><ul class=\"plain\">" +
    "<li>Adicione a palavra junto com a frase onde você a viu: ela vira o primeiro exemplo, e a frente do cartão mostra a frase, não a palavra solta.</li>" +
    "<li>Confira a tradução sugerida e fique só com o sentido daquela frase. Um cartão por sentido da palavra.</li>" +
    "<li>Marque “também treinar ao contrário” para as palavras que você quer usar ao falar, não só reconhecer.</li>" +
    "<li>Seus erros recorrentes também viram cartão (botão abaixo): “I have 30 years” vira “I’m 30”.</li></ul>" +
    '<p class="hint">Fontes: as Palavras do dia (em Palavras, já no nível da fase; o <a href="https://www.oxfordlearnersdictionaries.com/wordlists/oxford3000-5000" target="_blank" rel="noopener">Oxford 3000 e 5000</a> serve de referência), as preparation tasks das lições, as transcrições dos podcasts e as leituras extras do <a href="https://english-e-reader.net/" target="_blank" rel="noopener">English e-Reader</a> e do <a href="https://www.newsinlevels.com/" target="_blank" rel="noopener">News in Levels</a> (no máximo 2 a 3 chunks por texto).</p>' +
    '<p><a class="btn btn-soft" href="#palavras">' + icon("cards", 18) + "Abrir Palavras</a></p></section>";
}

function splitHTML(){
  const xp = extraPlan();
  return '<section class="card section" aria-labelledby="hSplit"><h2 id="hSplit">Divisão da semana</h2>' +
    '<p class="muted">Para a sua meta de ' + fmtH(S.state.settings.goalH * 60) + " h por semana. Os flashcards entram como 20 minutos por dia." + (xp.extra ? " A rota base ocupa 13,5 h; as " + fmtH(xp.extra) + " h a mais viram leitura com áudio e conversa, como extras de cada semana." : "") + "</p>" +
    '<ul class="split">' + planSplit(false).map(s => "<li><span>" + s[1] + "</span><span>" + Math.round(s[2] / 5) * 5 + " min</span></li>").join("") + "</ul>" +
    '<h3 style="margin-top:20px">Três princípios</h3><ul class="plain"><li>Revisões antes de cartões novos.</li>' +
    "<li>Cerca de 55 a 60% do tempo em entrada (listening e reading) e 40 a 45% em produção (fala e escrita), aumentando a produção na fase 3, sem deixar a entrada cair abaixo de 4 h por semana.</li>" +
    "<li>Cada lição de gramática volta duas vezes: o “Grammar test 2” 7 dias depois e questões novas (prompt 8) cerca de 4 semanas depois. Anote as notas na própria tarefa.</li></ul></section>";
}

function errorsHTML(){
  const errs = S.state.errors.slice().sort((a, b) => (b.count || 1) - (a.count || 1));
  let h = '<section class="card section" aria-labelledby="hErr"><h2 id="hErr">Meus erros recorrentes</h2><p class="muted">Comece com os 10 erros do diagnóstico. Use “+1” quando o erro voltar a aparecer; os mais frequentes vão para o topo e para o prompt 7, que entra toda semana como um drill de 10 minutos.</p>';
  h += '<form class="row" data-submit="err-add" style="align-items:flex-end"><div class="field"><label for="eWrong">Como eu disse</label><input type="text" id="eWrong" name="wrong" data-fk="eWrong" maxlength="120" placeholder="I have 30 years"></div><div class="field"><label for="eRight">Como é o certo</label><input type="text" id="eRight" name="right" data-fk="eRight" maxlength="120" placeholder="I’m 30"></div><div class="field" style="flex:0 0 auto"><button class="btn" type="submit">Adicionar erro</button></div></form>';
  h += '<ul class="errs">';
  if (!errs.length) h += '<li style="display:block" class="muted">Nenhum erro anotado ainda.</li>';
  errs.forEach(e => {
    const carded = e.card && S.cards.some(c => c.id === e.card);
    h += '<li><span><span class="wrong">' + esc(e.wrong) + '</span><br><span class="right">' + esc(e.right) + '</span></span><span class="cnt">' + (e.count || 1) + "×</span>" +
      (carded ? '<span class="pill pill-sage">no deck</span>' : '<button class="btn btn-ghost btn-small" type="button" data-act="err-card" data-id="' + esc(e.id) + '">Virar cartão</button>') +
      '<button class="btn btn-ghost btn-small" type="button" data-act="err-inc" data-id="' + esc(e.id) + '" aria-label="Aconteceu de novo">+1</button><button class="x" type="button" data-act="err-del" data-id="' + esc(e.id) + '" aria-label="Remover erro">×</button></li>';
  });
  return h + "</ul></section>";
}

function promptsHTML(){
  return '<section class="section" aria-labelledby="hPrompts"><h2 id="hPrompts">Prompts para o ChatGPT</h2><p class="muted">Em inglês de propósito. Troque o que está entre colchetes. Escreva sempre primeiro sem ajuda e só depois peça a correção; use o Write & Improve como segunda opinião, porque o ChatGPT pode superestimar o seu nível.</p>' +
    PROMPTS.map((p, i) => '<div class="prompt"><div class="prompt-head"><h3>' + (i + 1) + ". " + esc(p[0]) + '</h3><button class="btn btn-ghost btn-small" type="button" data-act="copy" data-i="' + i + '">' + (i === 6 ? "Copiar com os meus erros" : "Copiar") + '</button></div><p class="prompt-text" id="pt-' + i + '">' + esc(p[1]) + "</p></div>").join("") + "</section>";
}

export default {
  id: "rotinas",
  title: "Rotinas",
  render(){
    return '<div class="page-head"><a class="eyebrow" href="#mais">← Mais</a><h1>Rotinas</h1><p class="lead">Os hábitos que fazem a rota funcionar no dia a dia.</p></div>' +
      '<div class="grid-2">' + cardsHTML() + splitHTML() + "</div>" + errorsHTML() + promptsHTML();
  },
  actions: {
    "err-add"(form){
      const f = new FormData(form), w = String(f.get("wrong") || "").trim(), r = String(f.get("right") || "").trim();
      if (!w || !r){ toast("Preencha o erro e a correção."); return; }
      update(s => { s.errors.push({id: uid(), wrong: w, right: r, count: 1}); });
      const i = document.getElementById("eWrong"); if (i){ i.value = ""; i.focus(); }
      const j = document.getElementById("eRight"); if (j) j.value = "";
    },
    "err-inc"(el){ update(s => { const x = s.errors.find(e => e.id === el.dataset.id); if (x) x.count = (x.count || 1) + 1; }); },
    "err-del"(el){
      const x = S.state.errors.find(e => e.id === el.dataset.id);
      if (!x) return;
      update(s => { s.errors = s.errors.filter(e => e.id !== x.id); });
      toast("Erro removido.", [{label: "Desfazer", fn: () => update(s => { s.errors.push(x); })}]);
    },
    "err-card"(el){
      const x = S.state.errors.find(e => e.id === el.dataset.id);
      if (!x) return;
      // the reverse card asks for the right form given the mistake
      const c = findByTerm(x.right) || addCard({term: x.right, translation: "em vez de “" + x.wrong + "”", notes: "Erro recorrente: “" + x.wrong + "” → “" + x.right + "”.", tags: ["erro"]}, {reverse: true, source: "erro"});
      update(s => { const e = s.errors.find(y => y.id === x.id); if (e) e.card = c.id; });
      toast("“" + x.right + "” entrou no deck.");
    },
    copy(el){ const i = Number(el.dataset.i); copyText(promptText(i), i); }
  }
};
