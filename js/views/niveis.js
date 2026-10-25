// Níveis e testes: test results (with the EF SET chart) and the "can-do" self-assessment.
import { S, update } from "../state/store.js";
import { esc } from "../core/dom.js";
import { pct } from "../core/format.js";
import { uid } from "../core/id.js";
import { today, shortDate } from "../core/date.js";
import { toast } from "../core/toast.js";
import { CANDO } from "../data/cando.js";

const TTYPE = {efset: "EF SET 50 min", bc: "British Council level test", wi: "Write & Improve", gpt: "ChatGPT examinador", outro: "Outro"};
const LEVELS = ["A1", "A2", "A2+", "B1", "B1+", "B2", "B2+", "C1", "C2"];
export function efLevel(sc){ sc = Number(sc); if (!isFinite(sc)) return ""; return sc <= 20 ? "pré-A1" : sc <= 30 ? "A1" : sc <= 40 ? "A2" : sc <= 50 ? "B1" : sc <= 60 ? "B2" : sc <= 70 ? "C1" : "C2"; }

function efChart(ef){
  const W = Math.max(520, 80 + ef.length * 60), H = 210, padL = 40, padR = 46, top = 10, bot = 26, lo = 20, hi = 80;
  const y = v => top + (hi - Math.min(hi, Math.max(lo, v))) / (hi - lo) * (H - top - bot);
  const x = i => ef.length === 1 ? (padL + W - padR) / 2 : padL + 20 + i * ((W - padL - padR - 40) / (ef.length - 1));
  let s = '<svg class="chart" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Evolução no EF SET">';
  [[31, 40, "A2"], [41, 50, "B1"], [51, 60, "B2"], [61, 70, "C1"]].forEach((b, i) => { s += '<rect x="' + padL + '" y="' + y(b[1]) + '" width="' + (W - padL - padR) + '" height="' + (y(b[0] - 1) - y(b[1])) + '" fill="var(--surface-2)" opacity="' + (i % 2 ? 0.55 : 1) + '"/><text x="' + (W - padR + 8) + '" y="' + ((y(b[1]) + y(b[0] - 1)) / 2 + 4) + '">' + b[2] + "</text>"; });
  [30, 40, 50, 60, 70].forEach(v => { s += '<text x="' + (padL - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + v + "</text>"; });
  const pts = ef.map((t, i) => [x(i), y(Number(t.score))]);
  if (pts.length > 1) s += '<polyline fill="none" stroke="var(--accent)" stroke-width="2.5" points="' + pts.map(p => p.join(",")).join(" ") + '"/>';
  pts.forEach((p, i) => { s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="5" fill="var(--accent)"/><text x="' + p[0] + '" y="' + (p[1] - 10) + '" text-anchor="middle" style="fill:var(--ink);font-weight:700">' + esc(ef[i].score) + '</text><text x="' + p[0] + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(shortDate(ef[i].date)) + "</text>"; });
  return s + "</svg>";
}

function formHTML(){
  return '<section class="card section" aria-labelledby="hTestForm"><h2 id="hTestForm">Registrar resultado</h2><form data-submit="test-add">' +
    '<div class="row"><div class="field"><label for="tType">Teste</label><select id="tType" name="type">' + Object.keys(TTYPE).map(k => '<option value="' + k + '">' + TTYPE[k] + "</option>").join("") + '</select></div>' +
    '<div class="field"><label for="tDate">Data</label><input type="date" id="tDate" name="date" value="' + today() + '"></div></div>' +
    '<div class="row"><div class="field"><label for="tScore">Pontuação</label><input type="text" id="tScore" name="score" placeholder="Ex.: 44 (EF SET, 0 a 100)"></div>' +
    '<div class="field"><label for="tLevel">Nível CEFR</label><select id="tLevel" name="level"><option value="">Automático (EF SET)</option>' + LEVELS.map(l => "<option>" + l + "</option>").join("") + "</select></div></div>" +
    '<div class="field"><label for="tNote">Nota (opcional)</label><input type="text" id="tNote" name="note" maxlength="140" placeholder="Ex.: listening melhor que reading"></div>' +
    '<button class="btn" type="submit">Salvar resultado</button></form></section>';
}

function testsHTML(){
  const tests = S.state.tests.slice().sort((a, b) => a.date < b.date ? 1 : -1);
  let h = '<section class="card section"><h2>Resultados</h2>';
  if (!tests.length) h += '<p class="muted">Nenhum teste registrado. Na semana 1, faça o level test do British Council e o EF SET e anote os resultados aqui.</p>';
  else {
    const ef = S.state.tests.filter(t => t.type === "efset" && isFinite(Number(t.score)) && String(t.score).trim() !== "").sort((a, b) => a.date < b.date ? -1 : 1);
    if (ef.length) h += '<div class="scroll">' + efChart(ef) + "</div>";
    h += '<div class="scroll"><table class="table"><thead><tr><th>Data</th><th>Teste</th><th>Resultado</th><th>Nível</th><th>Nota</th><th><span class="sr">Ações</span></th></tr></thead><tbody>';
    tests.forEach(t => { h += '<tr><td class="num">' + esc(shortDate(t.date)) + "</td><td>" + esc(TTYPE[t.type] || t.type) + '</td><td class="num">' + esc(t.score || "–") + "</td><td><b>" + esc(t.level || "–") + '</b></td><td class="muted">' + esc(t.note || "") + '</td><td><button class="x" type="button" data-act="test-del" data-id="' + esc(t.id) + '" aria-label="Apagar resultado">×</button></td></tr>'; });
    h += "</tbody></table></div>";
  }
  return h + '<p class="hint">Faixas oficiais do EF SET: A2 31 a 40, B1 41 a 50, B2 51 a 60, C1 61 a 70.</p></section>';
}

function candoHTML(){
  let c = '<section class="section"><h2>Listas “can-do”</h2><p class="muted">Adaptadas da grade de autoavaliação do Conselho da Europa. Reavalie nas semanas 12, 26, 44 e 48. A meta é 80% de “sim” no nível-alvo.</p>';
  Object.keys(CANDO).forEach(l => {
    const items = CANDO[l], yes = items.filter(i => S.state.cando[i[0]] === 2).length;
    c += '<div class="lvl-head"><h3>' + l + '</h3><span class="muted">' + yes + " de " + items.length + " com “sim”, " + pct(yes, items.length) + '%</span></div><ul class="cando">';
    items.forEach(i => {
      const v = S.state.cando[i[0]] == null ? -1 : S.state.cando[i[0]];
      c += '<li><span><span class="sk">' + i[1] + "</span>" + esc(i[2]) + '</span><span class="seg" role="group" aria-label="' + esc(i[1]) + '">' + [[0, "não"], [1, "com ajuda"], [2, "sim"]].map(o => '<button type="button" data-act="cando" data-fk="cd-' + i[0] + "-" + o[0] + '" data-id="' + i[0] + '" data-v="' + o[0] + '" aria-pressed="' + (v === o[0]) + '">' + o[1] + "</button>").join("") + "</span></li>";
    });
    c += "</ul>";
  });
  return c + "</section>";
}

export default {
  id: "niveis",
  title: "Níveis e testes",
  render(){
    let h = '<div class="page-head"><a class="eyebrow" href="#mais">← Mais</a><h1>Níveis e testes</h1><p class="lead">Registre cada teste para acompanhar a tendência. O EF SET e o level test do British Council medem compreensão e gramática; fala e escrita ficam com o Write & Improve, o ChatGPT e as listas “can-do”.</p></div>';
    h += '<div class="grid-2">' + formHTML() + testsHTML() + "</div>";
    return h + candoHTML();
  },
  actions: {
    "test-add"(form){
      const f = new FormData(form);
      const type = String(f.get("type")), score = String(f.get("score") || "").trim();
      let level = String(f.get("level") || "");
      if (!level && type === "efset") level = efLevel(score);
      if (!score && !level){ toast("Informe a pontuação ou o nível."); return; }
      update(s => { s.tests.push({id: uid(), type, date: String(f.get("date")) || today(), score, level, note: String(f.get("note") || "").trim()}); });
      toast("Resultado salvo.");
    },
    "test-del"(el){
      const x = S.state.tests.find(t => t.id === el.dataset.id);
      if (!x) return;
      update(s => { s.tests = s.tests.filter(t => t.id !== x.id); });
      toast("Resultado apagado.", [{label: "Desfazer", fn: () => update(s => { s.tests.push(x); })}]);
    },
    cando(el){ update(s => { s.cando[el.dataset.id] = Number(el.dataset.v); }); }
  }
};
