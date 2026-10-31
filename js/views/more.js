// Mais: hub for the less frequent sections.
import { icon } from "../core/icons.js";
import { daysSinceBackup } from "../ui/backup.js";

const LINKS = [
  ["diario", "speak", "Diário de conversas", "Cada conversa e texto corrigido no ChatGPT, com o feedback e a evolução das notas."],
  ["fala", "seal", "Teste de fala", "A cada 4 semanas, o mesmo teste gravado: ouça a fala de hoje ao lado da de meses atrás."],
  ["niveis", "target", "Níveis e testes", "EF SET, level test e as listas “can-do” para ver o nível subir."],
  ["rotinas", "book", "Rotinas", "Como usar os flashcards, a divisão da semana, seus erros recorrentes e os prompts."],
  ["ajustes", "gear", "Ajustes", "Meta semanal, prazo, Claude API, tema e backup dos seus dados."]
];

export default {
  id: "mais",
  title: "Mais",
  render(){
    const d = daysSinceBackup();
    let h = '<header class="page-head"><div><p class="eyebrow">Índice</p><h1>Mais</h1><p class="lead">As seções de consulta: o que você lê de vez em quando, não todo dia.</p></div></header><nav class="hub" aria-label="Mais seções">';
    h += LINKS.map((l, i) => '<a href="#' + l[0] + '"><span class="hub-n">' + ["I", "II", "III", "IV", "V"][i] + '</span><span class="hub-ic">' + icon(l[1], 20) + '</span><span class="hub-txt"><b>' + l[2] + "</b><span>" + l[3] + "</span></span>" + icon("chevron", 18) + "</a>").join("");
    h += "</nav>";
    if (d == null || d >= 14) h += '<p class="note mt-l">' + (d == null ? "Você ainda não baixou um backup." : "Seu último backup foi há " + d + " dias.") + ' Os dados ficam só neste navegador. <a href="#ajustes">Fazer backup</a></p>';
    return h;
  }
};
