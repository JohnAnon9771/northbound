// Backup download/restore, shared by Ajustes and the reminder toast.
import { S, update, exportAll, importAll, allAudio, putAudios } from "../state/store.js";
import { toAudioBackup, fromAudioBackup, isAudioBackup } from "../state/backup-format.js";
import { today, daysBetween } from "../core/date.js";
import { toast } from "../core/toast.js";

function save(data, name){
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([data], {type: "application/json"}));
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export function downloadBackup(){
  save(JSON.stringify(exportAll(), null, 1), "northbound-backup-" + today() + ".json");
  update(s => { s.lastBackup = today(); });
  toast("Backup baixado. Guarde num lugar seguro (Drive, iCloud…).");
}

/* ---- speaking test recordings: a separate file (see backup-format.js) ---- */
const toBase64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1] || ""); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
function fromBase64(data, mime){
  const bin = atob(data), bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], {type: mime});
}
// total size of the recordings in bytes
export const audioBytes = async () => (await allAudio()).reduce((a, r) => a + (r.blob && r.blob.size || 0), 0);
export async function downloadAudio(){
  const rows = (await allAudio()).filter(r => r.blob);
  if (!rows.length){ toast("Nenhuma gravação neste navegador."); return; }
  const out = [];
  for (const r of rows) out.push(Object.assign({}, r, {data: await toBase64(r.blob)}));
  save(JSON.stringify(toAudioBackup(out)), "northbound-gravacoes-" + today() + ".json");
  toast(rows.length + (rows.length === 1 ? " gravação baixada." : " gravações baixadas."));
}

// a main backup replaces everything; a recordings file only adds recordings
export const isAudioFile = json => isAudioBackup(json);
export function readJSON(file){
  return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => { try { resolve(JSON.parse(r.result)); } catch (e){ reject(e); } }; r.onerror = () => reject(r.error); r.readAsText(file); });
}
export async function restoreAudio(json){
  try {
    const rows = fromAudioBackup(json).map(r => ({id: r.id, testId: r.testId, part: r.part, mime: r.mime, sec: r.sec, blob: fromBase64(r.data, r.mime)}));
    await putAudios(rows);
    toast(rows.length + (rows.length === 1 ? " gravação restaurada." : " gravações restauradas."));
    return true;
  } catch (e){ toast("Arquivo de gravações inválido."); return false; }
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
