// Ajustes: plan, flashcards, Claude API, appearance and data.
import { S, update, setSecret, resetAll, persistent } from "../core/store.js";
import { esc, icon } from "../core/dom.js";
import { toast } from "../core/toast.js";
import { rerender } from "../core/rerender.js";
import { PH, phaseNow } from "../domain/route.js";
import { CLAUDE_MODELS } from "../flashcards/providers/claude.js";
import { enrichMessage } from "../flashcards/enrich.js";
import { downloadBackup, restoreBackup, daysSinceBackup } from "../ui/backup.js";

const ui = {resetArmed: false, testing: false, keyDraft: "", persisted: null};
let resetTimer = null;

const getTheme = () => { try { return localStorage.getItem("nb:theme") || "auto"; } catch (e){ return "auto"; } };
function setTheme(t){
  try { if (t === "auto") localStorage.removeItem("nb:theme"); else localStorage.setItem("nb:theme", t); } catch (e){}
  if (t === "auto") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
}
const opt = (v, label, cur) => '<option value="' + esc(v) + '"' + (String(cur) === String(v) ? " selected" : "") + ">" + esc(label) + "</option>";

function planHTML(st){
  return '<section class="card section" aria-labelledby="hPlan"><h2 id="hPlan">Plano</h2>' +
    '<div class="field"><label for="sStart">Início do roteiro (semana 1)</label><input type="date" id="sStart" data-change="set-start" value="' + esc(st.start) + '"><p class="hint">As semanas do calendário contam a partir desta data.</p></div>' +
    '<div class="field"><label for="sGoal">Meta semanal em horas</label><input type="number" id="sGoal" data-change="set-goal" min="4" max="30" step="0.5" value="' + st.goalH + '"><p class="hint">A rota base usa 13,5 h. Acima disso, as horas extras entram em cada semana como leitura com áudio e conversa. Para 3 h por dia com alguns dias de folga, 18 h é uma meta realista.</p></div>' +
    '<div class="field"><label for="sTarget">Prazo para chegar ao B2</label><select id="sTarget" data-change="set-target">' +
    [[39, "39 semanas (9 meses)"], [44, "44 semanas (10 meses)"], [48, "48 semanas (11 meses)"], [52, "52 semanas (12 meses)"]].map(o => opt(o[0], o[1], st.targetWeeks)).join("") +
    '</select><p class="hint">O roteiro tem 52 semanas. Com um prazo menor, você avança mais de uma semana do roteiro por semana do calendário, e o site mostra se está no ritmo.</p></div></section>';
}

function cardsHTML(st){
  const p = phaseNow();
  return '<section class="card section" aria-labelledby="hFc"><h2 id="hFc">Flashcards</h2>' +
    '<div class="field"><label for="sNew">Palavras novas por dia</label><select id="sNew" data-change="set-new">' + opt("", "Automático pela fase (agora " + p.newPerDay + ")", st.newPerDay == null ? "" : "x") + [5, 8, 10, 12, 15, 20, 25].map(n => opt(n, n + " por dia", st.newPerDay)).join("") + '</select><p class="hint">Fases: ' + PH.map(x => x.newPerDay).join(" / ") + ". Mesmo assim, se as revisões do dia passarem de 15 min, as novas ficam para amanhã.</p></div>" +
    '<div class="field"><label for="sAccent">Sotaque da pronúncia</label><select id="sAccent" data-change="set-accent">' + opt("en-GB", "Britânico (en-GB)", st.accent) + opt("en-US", "Americano (en-US)", st.accent) + "</select></div>" +
    '<div class="field"><label for="sMail">E-mail para a tradução gratuita (opcional)</label><input type="email" id="sMail" data-change="set-mail" value="' + esc(st.mmEmail) + '" placeholder="voce@exemplo.com" autocomplete="email"><p class="hint">A MyMemory traduz cerca de 5 mil caracteres por dia sem cadastro; com um e-mail o limite sobe para 50 mil. Ele é enviado só para a MyMemory.</p></div></section>';
}

function claudeHTML(st){
  const has = !!S.secrets.claudeKey;
  let h = '<section class="card section" aria-labelledby="hAi"><h2 id="hAi">Claude API (opcional)</h2>' +
    '<p class="muted">Sem chave, os cartões usam fontes gratuitas (Wiktionary, Tatoeba e MyMemory). Com uma chave da Claude API, a tradução vem por sentido, com exemplos naturais, collocations, nível CEFR e notas para quem fala português. Cada palavra é uma chamada paga na sua conta da Anthropic.</p>';
  if (has) h += '<p><span class="pill pill-sage">' + icon("check", 14) + " Chave salva neste navegador</span> <span class=\"muted\">termina em …" + esc(S.secrets.claudeKey.slice(-4)) + "</span></p>";
  h += '<form data-submit="key-save"><div class="field"><label for="sKey">' + (has ? "Trocar a chave" : "Chave da API") + '</label><input type="password" id="sKey" name="key" data-input="key-draft" data-fk="sKey" value="' + esc(ui.keyDraft) + '" placeholder="sk-ant-…" autocomplete="off" spellcheck="false"></div>' +
    '<div class="row"><button class="btn btn-soft" type="submit">Salvar chave</button>' + (has ? '<button class="btn btn-ghost" type="button" data-act="key-test"' + (ui.testing ? " disabled" : "") + ">" + (ui.testing ? '<span class="spin"></span> Testando…' : "Testar") + '</button><button class="btn btn-ghost" type="button" data-act="key-del">Remover</button>' : "") + "</div></form>";
  h += '<div class="field" style="margin-top:14px"><label for="sModel">Modelo</label><select id="sModel" data-change="set-model">' + CLAUDE_MODELS.map(m => opt(m[0], m[1], st.claudeModel)).join("") + "</select></div>";
  h += '<p class="hint">A chave fica só no armazenamento deste navegador e nunca entra no backup. Ela é usada direto do navegador, então não use este site num computador compartilhado. Crie uma chave em <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a>, de preferência com limite de gasto.</p>';
  return h + "</section>";
}

function lookHTML(){
  const t = getTheme();
  return '<section class="card section" aria-labelledby="hLook"><h2 id="hLook">Aparência</h2><div class="seg" role="group" aria-label="Tema">' +
    [["auto", "Automático"], ["light", "Claro"], ["dark", "Luz de vela"]].map(o => '<button type="button" data-act="theme" data-t="' + o[0] + '" aria-pressed="' + (t === o[0]) + '">' + o[1] + "</button>").join("") +
    '</div><p class="hint">Automático segue o tema do sistema.</p></section>';
}

function dataHTML(){
  const d = daysSinceBackup();
  const where = !persistent ? "O armazenamento do navegador não está disponível (modo privado?). Nada está sendo salvo."
    : "Seus dados ficam no IndexedDB deste navegador, neste aparelho." + (ui.persisted === true ? " O navegador marcou o armazenamento como persistente." : ui.persisted === false ? " O navegador pode apagar os dados se faltar espaço ou se você ficar semanas sem abrir o site (Safari: 7 dias); instalar como app ajuda." : "");
  return '<section class="card section" aria-labelledby="hData"><h2 id="hData">Seus dados</h2><p class="muted">' + where + "</p>" +
    "<p>" + (d == null ? "Você ainda não baixou um backup." : d === 0 ? "Último backup: hoje." : "Último backup: há " + d + (d === 1 ? " dia." : " dias.")) + " " + S.cards.filter(c => c.dir !== "rev").length + " cartões, " + S.logs.length + " registros.</p>" +
    '<div class="row" style="margin-bottom:12px"><button class="btn btn-soft" type="button" data-act="backup">Baixar backup (JSON)</button><label class="btn btn-ghost" for="impFile">Restaurar de um arquivo</label><input type="file" id="impFile" data-change="restore" accept=".json,application/json" class="sr"></div>' +
    '<p class="hint">Aceita backups deste site e da página antiga (rota-ingles). Restaurar substitui tudo o que está aqui, exceto a chave da Claude API.</p>' +
    '<h3 style="margin-top:20px">Apagar tudo</h3><p class="muted">Remove registros, tarefas marcadas, cartões, testes, erros e listas. Não dá para desfazer; baixe um backup antes.</p>' +
    '<button class="btn btn-danger" type="button" data-act="reset">' + (ui.resetArmed ? "Toque de novo para confirmar" : "Apagar tudo") + "</button></section>";
}

export default {
  id: "ajustes",
  title: "Ajustes",
  enter(){
    ui.resetArmed = false;
    if (ui.persisted == null && navigator.storage && navigator.storage.persisted) navigator.storage.persisted().then(v => { ui.persisted = v; rerender(); }).catch(() => {});
  },
  render(){
    const st = S.state.settings;
    return '<div class="page-head"><a class="eyebrow" href="#mais">← Mais</a><h1>Ajustes</h1></div>' +
      '<div class="grid-2">' + '<div class="stack">' + planHTML(st) + lookHTML() + "</div>" + '<div class="stack">' + cardsHTML(st) + claudeHTML(st) + "</div></div>" + dataHTML();
  },
  actions: {
    "set-start"(el){ if (/^\d{4}-\d{2}-\d{2}$/.test(el.value)){ update(s => { s.settings.start = el.value; s.dayPlan = null; }); toast("Início do roteiro atualizado."); } },
    "set-goal"(el){
      const v = Number(el.value);
      if (v >= 4 && v <= 30) update(s => { s.settings.goalH = v; s.dayPlan = null; });
      else { el.value = S.state.settings.goalH; toast("Use um valor entre 4 e 30 horas."); }
    },
    "set-target"(el){ update(s => { s.settings.targetWeeks = Number(el.value); }); },
    "set-new"(el){ update(s => { s.settings.newPerDay = el.value === "" ? null : Number(el.value); }); },
    "set-accent"(el){ update(s => { s.settings.accent = el.value; }); },
    "set-mail"(el){
      const v = el.value.trim();
      if (v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)){ toast("Esse e-mail não parece válido."); return; }
      update(s => { s.settings.mmEmail = v; });
      toast(v ? "E-mail salvo." : "E-mail removido.");
    },
    "set-model"(el){ update(s => { s.settings.claudeModel = el.value; }); },
    "key-draft"(el){ ui.keyDraft = el.value; },
    "key-save"(){
      const k = ui.keyDraft.trim();
      if (!/^sk-ant-/.test(k)){ toast("A chave da Claude API começa com “sk-ant-”."); return; }
      ui.keyDraft = "";
      setSecret("claudeKey", k);
      toast("Chave salva. Os próximos cartões usam o Claude.");
    },
    "key-del"(){ setSecret("claudeKey", ""); toast("Chave removida. Voltando às fontes gratuitas."); },
    async "key-test"(){
      ui.testing = true; rerender();
      try {
        const { enrichClaude } = await import("../flashcards/providers/claude.js");
        const r = await enrichClaude("look forward to", "", {apiKey: S.secrets.claudeKey, model: S.state.settings.claudeModel, level: "B1"});
        toast("Funcionou: “look forward to” = " + (r.translation || "ok") + ".");
      } catch (e){
        const code = e && e.message;
        toast(code === "auth" ? enrichMessage("auth") : code === "offline" ? "Sem conexão com a API." : code === "rate" ? "A API pediu uma pausa. Tente de novo em instantes." : "A API respondeu com erro: " + (code || "desconhecido") + ".");
      }
      ui.testing = false; rerender();
    },
    theme(el){ setTheme(el.dataset.t); rerender(); },
    backup(){ downloadBackup(); },
    async restore(el){
      const f = el.files && el.files[0];
      if (!f) return;
      if (!confirm("Restaurar substitui todos os dados deste navegador pelos do arquivo. Continuar?")){ el.value = ""; return; }
      await restoreBackup(f);
      el.value = "";
    },
    async reset(){
      if (!ui.resetArmed){
        ui.resetArmed = true; rerender();
        clearTimeout(resetTimer);
        resetTimer = setTimeout(() => { ui.resetArmed = false; rerender(); }, 4000);
        return;
      }
      clearTimeout(resetTimer);
      ui.resetArmed = false;
      await resetAll();
      toast("Tudo apagado. Começando do zero.");
    }
  }
};
