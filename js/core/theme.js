// Light/dark theme override, kept in localStorage. "auto" follows the system.
// index.html applies the saved value before first paint with the same key.
const KEY = "nb:theme";

export const getTheme = () => { try { return localStorage.getItem(KEY) || "auto"; } catch (e){ return "auto"; } };
export function setTheme(t){
  try { if (t === "auto") localStorage.removeItem(KEY); else localStorage.setItem(KEY, t); } catch (e){}
  if (t === "auto") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
}
