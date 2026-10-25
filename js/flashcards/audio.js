// Pronunciation recordings: British and American files from the Free Dictionary API.
// recordings are named by accent: hello-uk.mp3, hello-us.mp3, hello-au.mp3
const ACCENT_TAG = {"en-GB": /[-_](uk|gb)[._\d]/i, "en-US": /[-_]us[._\d]/i};
export const tagged = url => Object.keys(ACCENT_TAG).some(k => ACCENT_TAG[k].test(url));

/* The recording in your accent, or "" so the synthesized voice (which follows the accent) speaks instead. */
export function pickAudio(audio, accent){
  const re = ACCENT_TAG[accent] || ACCENT_TAG["en-GB"];
  return String(audio || "").split(/\s+/).find(a => re.test(a)) || "";
}
