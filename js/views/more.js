// Mais: hub for the less frequent sections.
import { icon } from "../core/icons.js";
import { daysSinceBackup } from "../ui/backup.js";

const LINKS = [
  ["diario", "speak", "Diário de conversas", "Cada conversa e texto corrigido no ChatGPT, com o feedback e a evolução das notas."],
  ["niveis", "target", "Níveis e testes", "EF SET, level test e as listas “can-do” para ver o nível subir."],
  ["rotinas", "book", "Rotinas", "Como usar os flashcards, a divisão da semana, seus erros recorrentes e os prompts."],
  ["ajustes", "gear", "Ajustes", "Meta semanal, prazo, Claude API, tema e backup dos seus dados."]
];

export default {
  id: "mais",
  title: "Mais",
  render(){
    const d = daysSinceBackup();
    let h = '<div class="page-head"><h1>Mais</h1></div><div class="hub">';
    h += LINKS.map(l => '<a href="#' + l[0] + '"><span class="hub-ic">' + icon(l[1], 22) + "</span><span><b>" + l[2] + "</b><span>" + l[3] + "</span></span></a>").join("");
    h += "</div>";
    if (d == null || d >= 14) h += '<p class="note" style="margin-top:20px">' + (d == null ? "Você ainda não baixou um backup." : "Seu último backup foi há " + d + " dias.") + ' Os dados ficam só neste navegador. <a href="#ajustes">Fazer backup</a></p>';
    return h;
  }
};
