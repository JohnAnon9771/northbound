// Backup download/restore, shared by Ajustes and the reminder toast.
import { S, update, exportAll, importAll } from "../state/store.js";
import { today, daysBetween } from "../core/date.js";
import { toast } from "../core/toast.js";

export function downloadBackup(){
  const data = JSON.stringify(exportAll(), null, 1);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([data], {type: "application/json"}));
  a.download = "northbound-backup-" + today() + ".json";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  update(s => { s.lastBackup = today(); });
  toast("Backup baixado. Guarde num lugar seguro (Drive, iCloud…).");
}

export function restoreBackup(file){
  return new Promise(resolve => {
    const r = new FileReader();
    r.onload = async () => {
      try { await importAll(JSON.parse(r.result)); toast("Backup restaurado."); resolve(true); }
      catch (e){ toast("Arquivo inválido. Use um backup desta página ou da página antiga (rota-ingles)."); resolve(false); }
    };
    r.readAsText(file);
  });
}

export const daysSinceBackup = () => S.state.lastBackup ? daysBetween(S.state.lastBackup, today()) : null;
