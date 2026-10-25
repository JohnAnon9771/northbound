/* When a route week closes. Pure: give it the week's tasks, its goal extras, the done map and
   whether the week's time is up (the target pace already expects a later week).
   Doing everything closes a week early. Once its time is up, the core is enough: tasks tagged
   `vol` (free input, phase extras) and the goal extras stay behind, since the next week has its own. */
export function weekClosed(tasks, extras, done, timeUp){
  if (!tasks.length) return false;
  const open = tasks.concat(extras).filter(t => !done[t.k]);
  if (!open.length) return true;
  return !!timeUp && openCore(tasks, done).length === 0;
}

export const openCore = (tasks, done) => tasks.filter(t => !t.vol && !done[t.k]);
