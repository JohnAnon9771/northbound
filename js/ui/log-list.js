// One study log as a list item, with its delete action (Hoje and Progresso).
import { deleteLog, restoreLog } from "../state/store.js";
import { esc } from "../core/dom.js";
import { shortDate } from "../core/date.js";
import { toast } from "../core/toast.js";
import { skillOf } from "../data/skills.js";

export function logLi(e){
  const s = skillOf(e.skill);
  return '<li><span class="d">' + esc(shortDate(e.date)) + '</span><span class="mid"><span class="tag c-' + s.c + '">' + s.n + "</span>" + (e.note ? ' <span class="n">' + esc(e.note) + "</span>" : "") + '</span><span class="num">' + e.min + ' min</span><button class="x" type="button" data-act="log-del" data-id="' + esc(e.id) + '" aria-label="Apagar registro de ' + e.min + " min de " + s.n + '">×</button></li>';
}

export const logActions = {
  "log-del"(el){
    const en = deleteLog(el.dataset.id);
    if (en) toast("Registro apagado.", [{label: "Desfazer", fn: () => restoreLog(en)}]);
  }
};
