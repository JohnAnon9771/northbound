// Fala: the speaking test every 4 weeks, always in the same format (read aloud, 2-minute monologue,
// two follow-up questions), recorded here so old and new recordings can be heard side by side.
import { S, update, putAudios, getAudio, deleteAudio } from "../state/store.js";
import { esc } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { uid } from "../core/id.js";
import { today, shortDate } from "../core/date.js";
import { toast } from "../core/toast.js";
import { rerender } from "../core/rerender.js";
import { normalizeSpeak, CRIT } from "../state/schema.js";
import { RUBRIC, READ_TEXTS } from "../data/speaking-test.js";
import { PROMPTS } from "../data/prompts.js";
import { weekTasks } from "../domain/week-tasks.js";
import { currentRoadmapWeek } from "../domain/pace.js";
import { planTest, topicByKey, readTokens, readScore, words, speakMeasures, rubricAvg, speakSorted, examinerPrompt, nextSpeakWeek } from "../domain/speaking.js";
import { parseFeedback, errKey, CRIT_NAMES } from "../domain/gpt-feedback.js";
import { supports, startRecording } from "../ui/recorder.js";
import { speakBtn } from "../ui/speech.js";
import { setDone } from "../ui/task-actions.js";
import { lineChart, CRIT_COLORS } from "../ui/score-chart.js";

const LEVELS = ["A1", "A1+", "A2", "A2+", "B1", "B1+", "B2", "B2+", "C1", "C1+", "C2"];
const PART = {read: "Leitura", mono: "Monólogo", f1: "Pergunta 1", f2: "Pergunta 2"};
const MAX = {read: 120, mono: 120, f1: 60, f2: 60};
// the steps shown as 1 to 3; the assessment is the 4th
const STEP_N = {read: 1, prep: 2, mono: 2, f1: 3, f2: 3};
const nf = v => v.toLocaleString("pt-BR", {maximumFractionDigits: 1});
const clock = s => Math.floor(s / 60) + ":" + String(Math.max(0, s) % 60).padStart(2, "0");
const lang = () => S.state.settings.accent || "en-GB";

let run = null;      // the test being recorded
let rec = null;      // the recording in progress: {part, session, t0, timer, stopping}
let review = null;   // the assessment form of a saved test
let cmp = null;      // the two tests compared: [idA, idB]
const listen = new Set();   // tests whose recordings are open in the history
const urls = new Map();     // audio id → object URL (or "" while loading, null when missing)

/* ---------- audio ---------- */
function player(id, label){
  if (!id) return '<span class="muted sp-noaudio">sem gravação</span>';
  if (!urls.has(id)){
    urls.set(id, "");
    getAudio(id).then(r => { urls.set(id, r && r.blob ? URL.createObjectURL(r.blob) : null); rerender(); }).catch(() => { urls.set(id, null); rerender(); });
  }
  const u = urls.get(id);
  if (u === "") return '<span class="muted sp-noaudio">carregando…</span>';
  if (!u) return '<span class="muted sp-noaudio">áudio não está neste navegador</span>';
  return '<audio controls preload="metadata" src="' + esc(u) + '" aria-label="' + esc(label) + '"></audio>';
}
function freeUrls(){ urls.forEach(u => { if (u) URL.revokeObjectURL(u); }); urls.clear(); }

/* ---------- the next test ---------- */
const speakTask = n => weekTasks(n).find(t => /-sp$/.test(t.k));
function nextHTML(sup){
  const rw = currentRoadmapWeek(), t = speakTask(rw), done = t && S.state.speak.some(e => e.task === t.k);
  const due = t && !done;
  const plan = planTest(rw, S.state.speak, !!due);
  let h = '<section class="card section sp-next" aria-labelledby="hSpNext"><h2 id="hSpNext">' + (due ? "Teste desta semana" : "Próximo teste") + "</h2>";
  if (due) h += '<p class="muted">Semana ' + (rw >= 53 ? rw : rw) + " da rota, nível " + plan.level + ". Leva uns 15 minutos.</p>";
  else h += '<p class="muted">' + (done ? "O teste desta semana já foi feito. " : "") + "O próximo da rota é na semana " + nextSpeakWeek(rw + (done ? 1 : 0), S.state.spFrom) + ". Se quiser, faça um avulso agora, nível " + plan.level + ".</p>";
  h += '<ol class="sp-steps"><li><b>Leitura em voz alta</b> de um parágrafo fixo do nível, para medir quanto o reconhecimento entende.</li><li><b>Monólogo de 2 minutos</b> sobre um tema que aparece na hora, com 1 minuto de preparo.</li><li><b>Duas perguntas</b> sobre o tema, até 1 minuto cada.</li><li><b>Avaliação</b>: o ChatGPT dá as notas de fluência, vocabulário, gramática e coerência pela transcrição; a de pronúncia é sua, ouvindo a gravação.</li></ol>';
  if (plan.repeat) h += '<p class="note">Este teste repete o tema do seu primeiro teste no nível ' + plan.level + ", para comparar as duas gravações lado a lado.</p>";
  if (!sup.rec) return h + '<p class="note">Este navegador não grava áudio. Use o Chrome, o Edge ou o Safari atualizado para fazer o teste.</p></section>';
  return h + '<button class="btn" type="button" data-act="sp-start" data-due="' + (due ? t.k : "") + '">' + icon("play", 16) + (due ? "Começar o teste" : "Fazer um teste avulso") + "</button></section>";
}

/* ---------- recording flow ---------- */
function recBox(part){
  const on = rec && rec.part === part;
  if (!on) return "";
  return '<div class="sp-rec" role="status"><span class="sp-dot" aria-hidden="true"></span><b id="spClock" class="num">' + clock(rec.left) + '</b><span class="muted">gravando' + (rec.session.asr ? "" : " (sem reconhecimento)") + '</span><button class="btn btn-small btn-soft" type="button" data-act="sp-stop">Terminar</button></div>' +
    (rec.session.asr ? '<p class="sp-live" id="spLive" aria-live="off">' + esc(run.live || "") + "</p>" : "");
}
function readResult(){
  const p = run.parts.read;
  if (!p) return "";
  if (p.n == null) return '<p class="hint">' + (supports().asr ? "O reconhecimento de fala não funcionou nesta gravação (sem permissão ou sem conexão)" : "Sem reconhecimento de fala neste navegador") + ': a leitura foi gravada, mas sem a medida.</p>';
  return '<p class="sp-score"><b class="num">' + Math.round(p.hit / p.total * 100) + "%</b> das palavras reconhecidas (" + p.hit + " de " + p.total + ")</p>" + markedText(run.text, run.missed) +
    '<p class="hint">Medida aproximada. O reconhecimento completa palavras pelo contexto e muda com o microfone e o ruído: compare só com você mesmo, no mesmo aparelho e lugar. Palavras sublinhadas não foram reconhecidas.</p>';
}
function markedText(text, missed){
  const m = new Set(missed || []);
  return '<p class="sp-text">' + readTokens(text).map((t, i) => m.has(i) ? '<mark class="sp-miss">' + esc(t.w) + "</mark>" : esc(t.w)).join(" ") + "</p>";
}
function flowHTML(sup){
  const step = run.step, t = run.topic;
  let h = '<section class="card section sp-flow" aria-labelledby="hSpFlow"><div class="card-head"><h2 id="hSpFlow">Teste de fala, nível ' + run.level + '</h2><span class="muted">etapa ' + STEP_N[step] + ' de 4</span></div>';
  if (!sup.asr) h += '<p class="note">Este navegador não tem reconhecimento de fala: o teste é gravado, mas sem a % da leitura nem as palavras por minuto, e o prompt do examinador vai sem transcrição.</p>';
  if (step === "read"){
    h += "<h3>1. Leitura em voz alta</h3><p class=\"muted\">Leia em voz alta, no seu ritmo. Se quiser, ouça antes o modelo em " + (lang() === "en-GB" ? "inglês britânico" : "inglês americano") + ".</p>";
    if (!run.parts.read) h += '<p class="sp-text">' + esc(run.text) + "</p>";
    h += readResult() + recBox("read");
    if (!rec) h += '<div class="row">' + (run.parts.read ? '<button class="btn" type="button" data-act="sp-next">Seguir para o monólogo</button>' : '<button class="btn" type="button" data-act="sp-rec" data-part="read">' + icon("play", 16) + "Gravar a leitura</button>") + speakBtn(run.text, "Ouvir o modelo") + "</div>";
  } else if (step === "prep" || step === "mono"){
    h += "<h3>2. Monólogo de 2 minutos</h3>" + '<p class="sp-topic">' + esc(t.t) + '</p><ul class="sp-hints">' + t.hints.map(x => "<li>" + esc(x) + "</li>").join("") + "</ul>";
    if (step === "prep" && !rec) h += '<p class="muted">Use até 1 minuto para pensar, sem escrever frases inteiras. <span id="spPrep" class="num">' + clock(run.prepLeft) + '</span></p><button class="btn" type="button" data-act="sp-rec" data-part="mono">' + icon("play", 16) + "Começar a falar (2 min)</button>";
    h += recBox("mono");
  } else {
    const i = step === "f1" ? 0 : 1;
    h += "<h3>3. Pergunta " + (i + 1) + " de 2</h3>" + '<div class="row sp-q"><p class="sp-topic">' + esc(t.q[i]) + "</p>" + speakBtn(t.q[i], "Ouvir a pergunta") + "</div>";
    if (!rec) h += '<p class="muted">Responda com calma, até 1 minuto. Dá para ouvir a pergunta antes.</p><button class="btn" type="button" data-act="sp-rec" data-part="' + step + '">' + icon("play", 16) + "Responder</button>";
    h += recBox(step);
  }
  return h + (rec ? "" : '<p class="mt-l"><button class="btn btn-ghost btn-small" type="button" data-act="sp-cancel">Cancelar o teste</button></p>') + "</section>";
}

function tick(){
  if (!rec) return;
  rec.left = MAX[rec.part] - Math.floor((Date.now() - rec.t0) / 1000);
  const el = document.getElementById("spClock");
  if (el) el.textContent = clock(rec.left);
  if (rec.left <= 0) stopPart();
}
function prepTick(){
  if (!run || run.step !== "prep" || rec) return;
  run.prepLeft = Math.max(0, 60 - Math.floor((Date.now() - run.prepT0) / 1000));
  const el = document.getElementById("spPrep");
  if (el) el.textContent = run.prepLeft ? clock(run.prepLeft) : "tempo de preparo acabou";
}
async function startPart(part){
  if (rec) return;
  run.live = "";
  try {
    const session = await startRecording(lang(), text => { if (!run) return; run.live = text; const el = document.getElementById("spLive"); if (el) el.textContent = text; });
    clearInterval(run.prepTimer);
    rec = {part, session, t0: Date.now(), left: MAX[part], timer: setInterval(tick, 250)};
    if (part === "mono") run.step = "mono";
    rerender();
  } catch (e){
    toast(e && e.name === "NotAllowedError" ? "Sem acesso ao microfone. Libere o microfone para este site nas permissões do navegador." : "Não consegui abrir o microfone.");
  }
}
async function stopPart(discard){
  if (!rec || rec.stopping) return;
  rec.stopping = true;
  clearInterval(rec.timer);
  const part = rec.part, res = await rec.session.stop();
  rec = null;
  if (discard || !run){ rerender(); return; }
  const p = {sec: res.sec, text: res.text || "", n: res.text == null ? null : words(res.text).length};
  if (part === "read" && res.text != null){ const r = readScore(run.text, res.text); Object.assign(p, {hit: r.hit, total: r.total}); run.missed = r.missed; }
  run.parts[part] = p;
  run.blobs[part] = res;
  if (part === "mono") run.step = "f1";
  else if (part === "f1") run.step = "f2";
  else if (part === "f2"){ await saveRun(); return; }
  rerender();
}
async function saveRun(){
  const id = uid(), r = run;
  const rows = Object.keys(r.blobs).filter(k => r.blobs[k].blob.size).map(k => ({id: id + "-" + k, testId: id, part: k, mime: r.blobs[k].mime, sec: r.blobs[k].sec, blob: r.blobs[k].blob}));
  try { await putAudios(rows); rows.forEach(x => { r.parts[x.part].audio = x.id; }); }
  catch (e){ toast("Não consegui guardar o áudio neste navegador. As medidas e as transcrições foram salvas."); }
  const e = normalizeSpeak({id, date: today(), week: r.week, task: r.task, level: r.level, topic: r.topic.k, parts: r.parts, crit: {}, ts: Date.now()});
  run = null;
  review = draft(e);
  update(s => { s.speak.push(e); });
  if (e.task && !S.state.done[e.task] && setDone(e.task, true)) return;
  toast("Teste gravado. Agora falta a avaliação.");
  window.scrollTo(0, 0);
}

/* ---------- assessment ---------- */
const draft = e => ({id: e.id, raw: e.raw, crit: Object.assign({}, e.crit), cefr: e.cefr, grammar: e.grammar, errs: e.errs.map(x => ({wrong: x.wrong, right: x.right, on: false}))});
const byId = id => S.state.speak.find(e => e.id === id);
function measuresHTML(e){
  const m = speakMeasures(e), p = e.parts;
  return '<div class="ledger sp-measures" style="--cols:3"><div><b class="num">' + (m.readPct == null ? "–" : m.readPct + "%") + "</b><span>da leitura reconhecida" + (p.read && p.read.total ? " (" + p.read.hit + " de " + p.read.total + ")" : "") + '</span></div><div><b class="num">' + (m.wpm == null ? "–" : m.wpm) + "</b><span>palavras por minuto no monólogo (aprox.)</span></div><div><b class=\"num\">" + (p.mono ? clock(p.mono.sec) : "–") + "</b><span>de monólogo</span></div></div>";
}
function reviewHTML(){
  const e = byId(review.id);
  if (!e){ review = null; return ""; }
  const t = topicByKey(e.topic), m = speakMeasures(e);
  let h = '<section class="card section sp-review" aria-labelledby="hSpRev"><div class="card-head"><h2 id="hSpRev">Avaliação do teste de ' + esc(shortDate(e.date)) + '</h2><button class="btn btn-ghost btn-small" type="button" data-act="sp-close">Fechar</button></div>';
  h += measuresHTML(e);
  if (e.parts.read && e.parts.read.n != null) h += "<details><summary>Palavras da leitura que o reconhecimento não pegou</summary>" + markedText(READ_TEXTS[e.level], readScore(READ_TEXTS[e.level], e.parts.read.text).missed) + "</details>";
  if (t) h += "<details><summary>O que o reconhecimento ouviu</summary>" + ["mono", "f1", "f2"].map(k => "<p><b>" + (k === "mono" ? esc(t.t) : esc(t.q[k === "f1" ? 0 : 1])) + '</b><br><span class="muted">' + esc(e.parts[k] && e.parts[k].text || "(sem transcrição)") + "</span></p>").join("") + "</details>";
  h += '<form data-submit="sp-save"><div class="field"><span class="lbl">1. Notas do ChatGPT</span><p class="hint">Copie o prompt, que já vai com o tema, as perguntas, as transcrições e as medidas. Cole num chat novo e traga de volta o bloco do fim.</p><p><button class="btn btn-soft btn-small" type="button" data-act="sp-copy">Copiar prompt do examinador</button></p>' +
    '<label class="sr" for="spRaw">Resposta do ChatGPT</label><textarea id="spRaw" data-input="sp-raw" data-fk="spRaw" rows="5" placeholder="Level: B1&#10;Scores: fluency 3/5, grammar 3/5, vocabulary 3/5, coherence 2/5&#10;Errors:&#10;…">' + esc(review.raw) + "</textarea></div>";
  h += '<div class="field"><span class="lbl">2. Notas de 0 a 5</span><div class="fb-crit">' + CRIT.spk.map(k => '<label class="score"><span class="score-n">' + CRIT_NAMES[k] + '</span><span class="score-in"><input type="number" min="0" max="5" step="0.5" inputmode="decimal" data-input="sp-crit" data-k="' + k + '" data-fk="sp-crit-' + k + '" value="' + (review.crit[k] == null ? "" : review.crit[k]) + '" aria-label="' + CRIT_NAMES[k] + ' de 0 a 5"></span></label>').join("") + "</div>" +
    '<p class="hint">A pronúncia é com você: o ChatGPT só vê a transcrição. Ouça a sua leitura ao lado do modelo e da gravação anterior' + (m.readPct != null ? " (o reconhecimento pegou " + m.readPct + "% da leitura)" : "") + ".</p>" +
    '<details class="sp-rubric"><summary>O que vale cada nota</summary><dl>' + RUBRIC.map(r => "<dt>" + esc(r.n) + "</dt>" + r.d.map((d, i) => "<dd><b>" + [1, 3, 5][i] + "</b> " + esc(d) + "</dd>").join("")).join("") + "</dl></details></div>";
  h += '<div class="row"><div class="field"><label for="spCefr">Nível estimado</label><select id="spCefr" data-change="sp-cefr"><option value="">–</option>' + LEVELS.map(l => "<option" + (l === review.cefr ? " selected" : "") + ">" + l + "</option>").join("") + "</select></div>" +
    (e.parts.read && e.parts.read.audio ? '<div class="field"><span class="lbl">Sua leitura</span>' + player(e.parts.read.audio, "Sua leitura") + speakBtn(READ_TEXTS[e.level], "Ouvir o modelo") + "</div>" : "") + "</div>";
  if (review.errs.length){
    const known = new Set(S.state.errors.map(x => errKey(x.wrong)));
    h += '<div class="field"><span class="lbl">Erros encontrados</span><ul class="errs fb-errs">' + review.errs.map((x, i) => '<li><span><span class="wrong">' + esc(x.wrong) + '</span><br><span class="right">' + esc(x.right) + '</span></span><label class="fb-chk"><input type="checkbox" data-change="sp-err" data-i="' + i + '" data-fk="sp-err-' + i + '"' + (x.on ? " checked" : "") + "> " + (known.has(errKey(x.wrong)) ? "+1 nos recorrentes" : "Mandar para os recorrentes") + "</label></li>").join("") + "</ul></div>";
  }
  return h + '<button class="btn" type="submit">Salvar avaliação</button></form></section>';
}
function addError(s, wrong, right){
  const x = s.errors.find(e => errKey(e.wrong) === errKey(wrong));
  if (x) x.count = (x.count || 1) + 1;
  else s.errors.push({id: uid(), wrong, right, count: 1});
}
async function copy(text){
  try { await navigator.clipboard.writeText(text); return true; }
  catch (e){
    const ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand("copy"); } catch (x){}
    ta.remove(); return ok;
  }
}

/* ---------- evolution, comparison and history ---------- */
function evolutionHTML(list){
  let h = '<section class="card section" aria-labelledby="hSpEvo"><h2 id="hSpEvo">Evolução</h2>';
  const scored = list.filter(e => Object.keys(e.crit).length);
  h += scored.length ? lineChart(scored, CRIT.spk.map(k => ({k, name: CRIT_NAMES[k], color: CRIT_COLORS[k]})), "Notas dos testes de fala ao longo do tempo") : '<p class="muted">As notas aparecem aqui depois da avaliação de cada teste.</p>';
  h += '<div class="scroll"><table class="table"><thead><tr><th>Data</th><th>Nível</th><th>Média</th><th>Leitura</th><th>Palavras/min</th><th>Estimado</th></tr></thead><tbody>' +
    list.slice().reverse().map(e => { const m = speakMeasures(e), a = rubricAvg(e.crit); return '<tr><td class="num">' + esc(shortDate(e.date)) + "</td><td>" + esc(e.level) + '</td><td class="num">' + (a == null ? "–" : nf(a)) + '</td><td class="num">' + (m.readPct == null ? "–" : m.readPct + "%") + '</td><td class="num">' + (m.wpm == null ? "–" : m.wpm) + "</td><td><b>" + esc(e.cefr || "–") + "</b></td></tr>"; }).join("") + "</tbody></table></div>";
  return h + '<p class="hint">A leitura e as palavras por minuto são medidas aproximadas do reconhecimento de fala do navegador. A leitura só compara entre testes do mesmo nível, que usam o mesmo parágrafo.</p></section>';
}
// by default: the latest test against the first one at its level (same paragraph, often the same topic)
function cmpPair(list){
  if (cmp && byId(cmp[0]) && byId(cmp[1])) return cmp;
  const b = list[list.length - 1], a = list.find(e => e.level === b.level && e.id !== b.id) || list[list.length - 2];
  return [a.id, b.id];
}
function compareHTML(list){
  if (list.length < 2) return "";
  const pair = cmpPair(list), tests = pair.map(byId);
  const opt = sel => list.map(e => '<option value="' + esc(e.id) + '"' + (e.id === sel ? " selected" : "") + ">" + esc(shortDate(e.date) + " · " + e.level) + "</option>").join("");
  let h = '<section class="card section" aria-labelledby="hSpCmp"><h2 id="hSpCmp">Comparar gravações</h2><div class="sp-cmp"><div class="sp-cmp-head"></div>' +
    tests.map((e, i) => '<div class="sp-cmp-head"><label class="sr" for="spCmp' + i + '">Teste ' + (i ? "B" : "A") + '</label><select id="spCmp' + i + '" data-change="sp-cmp" data-i="' + i + '">' + opt(e.id) + "</select>" + (topicByKey(e.topic) ? '<span class="muted">' + esc(topicByKey(e.topic).t) + "</span>" : "") + "</div>").join("");
  ["read", "mono", "f1", "f2"].forEach(k => {
    h += '<div class="sp-cmp-label">' + PART[k] + "</div>" + tests.map(e => '<div class="sp-cmp-cell">' + player(e.parts[k] && e.parts[k].audio, PART[k] + " de " + shortDate(e.date)) + "</div>").join("");
  });
  const m = tests.map(speakMeasures);
  h += '<div class="sp-cmp-label">Medidas</div>' + tests.map((e, i) => '<div class="sp-cmp-cell muted">' + [m[i].readPct == null ? "" : "leitura " + m[i].readPct + "%", m[i].wpm == null ? "" : m[i].wpm + " palavras/min", rubricAvg(e.crit) == null ? "" : "média " + nf(rubricAvg(e.crit))].filter(Boolean).join(" · ") + "</div>").join("");
  return h + "</div>" + (tests[0].topic === tests[1].topic ? '<p class="hint">Mesmo tema nos dois testes: a comparação mais justa.</p>' : "") + "</section>";
}
function historyHTML(list){
  let h = '<section class="section"><h2>Histórico</h2><ul class="fb-hist">';
  list.slice().reverse().forEach(e => {
    const t = topicByKey(e.topic), a = rubricAvg(e.crit), m = speakMeasures(e), scored = Object.keys(e.crit).length;
    h += '<li><div class="fb-hist-head"><span class="d">' + esc(shortDate(e.date)) + '</span><span class="tag c-out">' + esc(e.level) + "</span><b>" + esc(t ? t.t : e.topic) + "</b>" + (e.cefr ? '<span class="pill">' + esc(e.cefr) + "</span>" : "") + '<button class="x" type="button" data-act="sp-del" data-id="' + esc(e.id) + '" aria-label="Apagar teste">×</button></div>' +
      '<div class="task-meta">' + (e.week ? "<span>semana " + e.week + "</span>" : "<span>avulso</span>") + (a != null ? "<span>média " + nf(a) + "</span>" : "") + (scored ? "<span>" + CRIT.spk.filter(k => e.crit[k] != null).map(k => CRIT_NAMES[k] + " " + nf(e.crit[k])).join(" · ") + "</span>" : "") + (m.readPct != null ? "<span>leitura " + m.readPct + "%</span>" : "") + (m.wpm != null ? "<span>" + m.wpm + " palavras/min</span>" : "") + "</div>" +
      '<div class="row sp-hist-acts"><button class="btn btn-small ' + (scored ? "btn-ghost" : "btn-soft") + '" type="button" data-act="sp-review" data-id="' + esc(e.id) + '">' + (scored ? "Editar avaliação" : "Completar avaliação") + '</button><button class="btn btn-ghost btn-small" type="button" data-act="sp-listen" data-id="' + esc(e.id) + '" aria-expanded="' + listen.has(e.id) + '">' + (listen.has(e.id) ? "Esconder gravações" : "Ouvir gravações") + "</button></div>";
    if (listen.has(e.id)) h += '<div class="sp-players">' + ["read", "mono", "f1", "f2"].filter(k => e.parts[k]).map(k => '<div><span class="lbl">' + PART[k] + "</span>" + player(e.parts[k].audio, PART[k]) + "</div>").join("") + "</div>";
    h += "</li>";
  });
  return h + "</ul></section>";
}

export default {
  id: "fala",
  title: "Teste de fala",
  leave(){
    if (rec) stopPart(true);
    if (run) clearInterval(run.prepTimer);
    freeUrls();
  },
  render(){
    const sup = supports(), list = speakSorted(S.state.speak);
    let h = '<header class="page-head"><div><a class="eyebrow back" href="#mais">' + icon("back", 14) + 'Mais</a><h1>Teste de fala</h1><p class="lead">A cada 4 semanas, o mesmo formato: leitura, monólogo de 2 minutos e duas perguntas, gravados aqui. Uma conversa boa com o ChatGPT não prova que a fala evoluiu; ouvir a gravação de hoje ao lado da de meses atrás, sim.</p></div></header>';
    h += run ? flowHTML(sup) : review ? reviewHTML() + nextHTML(sup) : nextHTML(sup);
    if (list.length) h += evolutionHTML(list) + compareHTML(list) + historyHTML(list);
    if (sup.rec && sup.asr) h += '<p class="hint mt-l">No Chrome e no Edge, o reconhecimento de fala envia o áudio para o servidor do navegador. As gravações ficam só neste aparelho; baixe uma cópia em <a href="#ajustes">Ajustes</a>.</p>';
    return h;
  },
  actions: {
    "sp-start"(el){
      const rw = currentRoadmapWeek(), task = el.dataset.due || "";
      const plan = planTest(rw, S.state.speak, !!task);
      review = null;
      run = {week: task ? rw : null, task, level: plan.level, topic: plan.topic, text: plan.text, step: "read", parts: {}, blobs: {}, live: "", missed: []};
      rerender();
    },
    "sp-rec"(el){ startPart(el.dataset.part); },
    "sp-stop"(){ stopPart(); },
    "sp-next"(){
      run.step = "prep"; run.prepT0 = Date.now(); run.prepLeft = 60;
      clearInterval(run.prepTimer); run.prepTimer = setInterval(prepTick, 500);
      rerender();
    },
    async "sp-cancel"(){
      if (!confirm("Cancelar o teste? O que foi gravado até aqui será descartado.")) return;
      if (rec) await stopPart(true);
      clearInterval(run.prepTimer);
      run = null; rerender();
    },
    async "sp-copy"(){
      const e = byId(review.id);
      toast(e && await copy(examinerPrompt(PROMPTS[8][1], e)) ? "Prompt copiado. Cole num chat novo do ChatGPT." : "Não consegui copiar.");
    },
    "sp-raw"(el){
      review.raw = el.value;
      const p = parseFeedback(review.raw, "spk");
      // pronunciation stays yours: the examiner only had a transcript
      delete p.crit.pron;
      review.cefr = p.level || review.cefr; review.grammar = p.grammar || review.grammar;
      Object.assign(review.crit, p.crit);
      review.errs = p.errs.map(x => ({wrong: x.wrong, right: x.right, on: true}));
      rerender();
    },
    "sp-crit"(el){ const v = el.value.trim(); if (v === "") delete review.crit[el.dataset.k]; else review.crit[el.dataset.k] = Number(v.replace(",", ".")); },
    "sp-cefr"(el){ review.cefr = el.value; },
    "sp-err"(el){ const x = review.errs[Number(el.dataset.i)]; if (x) x.on = el.checked; },
    "sp-save"(){
      const e = byId(review.id);
      if (!e) return;
      const n = normalizeSpeak(Object.assign({}, e, {crit: review.crit, cefr: review.cefr, raw: review.raw, grammar: review.grammar, errs: review.errs.length ? review.errs : e.errs}));
      const sent = review.errs.filter(x => x.on);
      update(s => { s.speak = s.speak.map(x => x.id === e.id ? n : x); sent.forEach(x => addError(s, x.wrong, x.right)); });
      review = null;
      toast("Avaliação salva." + (sent.length ? " " + sent.length + (sent.length === 1 ? " erro foi para os recorrentes." : " erros foram para os recorrentes.") : ""));
    },
    "sp-close"(){ review = null; rerender(); },
    "sp-review"(el){ const e = byId(el.dataset.id); if (!e) return; review = draft(e); rerender(); window.scrollTo(0, 0); },
    "sp-listen"(el){ const id = el.dataset.id; if (listen.has(id)) listen.delete(id); else listen.add(id); rerender(); },
    "sp-cmp"(el){ const list = speakSorted(S.state.speak), pair = cmpPair(list).slice(); pair[Number(el.dataset.i)] = el.value; cmp = pair; rerender(); },
    "sp-del"(el){
      const e = byId(el.dataset.id);
      if (!e || !confirm("Apagar este teste e as gravações dele? Não dá para desfazer.")) return;
      update(s => { s.speak = s.speak.filter(x => x.id !== e.id); });
      deleteAudio(Object.keys(e.parts).map(k => e.parts[k].audio));
      if (review && review.id === e.id) review = null;
      toast("Teste apagado.");
    }
  }
};
