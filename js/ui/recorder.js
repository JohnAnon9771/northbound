// Microphone recording (MediaRecorder) plus the browser's speech recognition, for the speaking test.
// Both are optional: supports() says what this browser has. Recognition is looked up on each use.
const SR = () => typeof window === "undefined" ? null : window.SpeechRecognition || window.webkitSpeechRecognition || null;
const MIMES = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"];

export function supports(){
  const rec = typeof navigator !== "undefined" && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && typeof MediaRecorder !== "undefined";
  return {rec, asr: !!SR()};
}

/* Starts recording (and recognition, when there is one). onText gets the live transcript.
   Returns {asr, stop()}; stop() resolves to {blob, mime, sec, text}, text being null when
   recognition is missing or failed. Rejects when the microphone is refused. */
export async function startRecording(lang, onText){
  const stream = await navigator.mediaDevices.getUserMedia({audio: {echoCancellation: true, noiseSuppression: true}});
  const type = MIMES.find(m => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m));
  // ~24 kbps keeps a 2-minute answer around 360 KB
  const rec = new MediaRecorder(stream, Object.assign({audioBitsPerSecond: 24000}, type ? {mimeType: type} : {}));
  const chunks = [];
  rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  const t0 = Date.now();
  rec.start(1000);
  const asr = recognize(lang, onText);
  let done = null;
  return {
    asr: !!asr,
    stop(){
      if (done) return done;
      done = new Promise(resolve => {
        rec.onstop = async () => {
          stream.getTracks().forEach(t => t.stop());
          const text = asr ? await asr.stop() : null;
          const mime = rec.mimeType || type || "audio/webm";
          resolve({blob: new Blob(chunks, {type: mime}), mime, sec: Math.round((Date.now() - t0) / 1000), text});
        };
        try { rec.stop(); } catch (e){ rec.onstop(); }
      });
      return done;
    }
  };
}

// continuous recognition that restarts after the silences that end it; fatal errors give up (text null)
function recognize(lang, onText){
  const C = SR();
  if (!C) return null;
  const r = new C();
  r.lang = lang; r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
  const finals = [];
  let interim = "", on = true, failed = false, ended = null;
  const full = () => finals.concat(interim ? [interim] : []).join(" ").replace(/\s+/g, " ").trim();
  r.onresult = e => {
    interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++){
      const t = e.results[i][0].transcript.trim();
      if (e.results[i].isFinal){ if (t) finals.push(t); } else interim += " " + t;
    }
    interim = interim.trim();
    if (onText) onText(full());
  };
  r.onerror = e => { if (["not-allowed", "service-not-allowed", "audio-capture", "network", "language-not-supported"].indexOf(e.error) > -1){ failed = true; on = false; } };
  r.onend = () => { if (on){ try { r.start(); } catch (e){ on = false; } } else if (ended) ended(); };
  try { r.start(); } catch (e){ failed = true; on = false; }
  return {
    stop(){
      return new Promise(resolve => {
        const finish = () => resolve(failed ? null : full());
        if (!on){ finish(); return; }
        on = false; ended = finish;
        // the last words arrive after stop(); don't wait forever for them
        setTimeout(finish, 2500);
        try { r.stop(); } catch (e){ finish(); }
      });
    }
  };
}
