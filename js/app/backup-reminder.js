// A toast at most once a day when there's data and no backup in the last 14 days.
import { today } from "../core/date.js";
import { toast } from "../core/toast.js";
import { hasContent } from "../state/selectors.js";
import { downloadBackup, daysSinceBackup } from "../ui/backup.js";

export function backupReminder(){
  const d = daysSinceBackup();
  if (!hasContent() || (d != null && d < 14)) return;
  let last = null;
  try { last = localStorage.getItem("nb:backupNag"); localStorage.setItem("nb:backupNag", today()); } catch (e){}
  if (last === today()) return;
  setTimeout(() => toast(d == null ? "Seus dados ficam só neste navegador. Que tal baixar um backup?" : "Seu último backup foi há " + d + " dias.", [{label: "Baixar backup", fn: downloadBackup}]), 1500);
}
