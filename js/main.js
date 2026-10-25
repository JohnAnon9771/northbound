// Boot: load the data, wire the router, events and timer bar, then show the screen in the URL.
import { S, load, subscribe, onError, persistent, updateQuiet } from "./state/store.js";
import { hasContent } from "./state/selectors.js";
import { toast } from "./core/toast.js";
import { setRenderer } from "./core/rerender.js";
import * as timer from "./core/study-timer.js";
import { currentRoadmapWeek } from "./domain/pace.js";
import { checkAchievements } from "./ui/achievement-check.js";
import { go, render } from "./app/router.js";
import { bindEvents } from "./app/events.js";
import { paintTimer } from "./app/timer-bar.js";
import { backupReminder } from "./app/backup-reminder.js";
import { registerSW } from "./app/service-worker.js";

setRenderer(render);
bindEvents();
addEventListener("hashchange", go);
timer.onTimer(() => { paintTimer(); render(); });

let achTimer = null;
async function boot(){
  await load();
  if (!persistent) toast("Não consegui abrir o armazenamento do navegador (modo privado?). Nada será salvo.");
  // the week you were on when this version arrived; earlier weeks keep their old task list
  if (S.state.revFrom == null) updateQuiet(s => { s.revFrom = hasContent() ? Math.min(currentRoadmapWeek(), 999) : 1; });
  checkAchievements(true);
  subscribe(() => {
    render();
    clearTimeout(achTimer);
    achTimer = setTimeout(() => checkAchievements(false), 700);
  });
  onError(() => toast("Não consegui salvar no navegador. Baixe um backup em Ajustes."));
  go();
  paintTimer();
  backupReminder();
  registerSW();
}

boot();
