// Card shape helpers. A word can have a reverse twin (dir: "rev", parent: id) that asks Portuguese → English.
export const isFront = c => c.dir !== "rev";

// fields that describe the word, as opposed to SRS state
export const CONTENT_FIELDS = ["term", "ipa", "audio", "pos", "translation", "definition", "examples", "collocations", "cefr", "notes", "context", "tags"];
export const pickContent = o => { const x = {}; CONTENT_FIELDS.forEach(k => { if (o[k] !== undefined) x[k] = o[k]; }); return x; };
