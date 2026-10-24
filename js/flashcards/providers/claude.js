/* Claude provider, used when you save an API key in Ajustes. The SDK is loaded from the CDN only
   on first use, so the site stays light for everyone else. The key lives in this browser's IndexedDB. */
const SDK_URL = "https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.133.0/+esm";
export const CLAUDE_MODELS = [
  ["claude-haiku-5-5", "Claude Haiku 5.5 (mais barato)"],
  ["claude-sonnet-5-5", "Claude Sonnet 5.5"],
  ["claude-opus-5-5", "Claude Opus 5.5 (melhor qualidade)"]
];
// models that accept the server-side refusal fallback
const FALLBACK_MODELS = new Set(["claude-sonnet-5-5", "claude-opus-5-5"]);

let sdkP = null;
const sdk = () => sdkP || (sdkP = import(SDK_URL).then(m => m.default || m.Anthropic));

const SCHEMA = {
  type: "object",
  properties: {
    translation: {type: "string", description: "Most common pt-BR translations for this sense, comma-separated, max 3"},
    pos: {type: "string", description: "Part of speech in Portuguese (verbo, substantivo, expressão...)"},
    ipa: {type: "string", description: "British IPA without slashes"},
    definition: {type: "string", description: "Short learner-dictionary definition in simple English"},
    examples: {type: "array", items: {type: "object", properties: {en: {type: "string"}, pt: {type: "string"}}, required: ["en", "pt"], additionalProperties: false}},
    collocations: {type: "array", items: {type: "string"}},
    cefr: {type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2"]},
    notes: {type: "string", description: "One short tip in Portuguese for Brazilian learners (false friends, prepositions, register). Empty if none."}
  },
  required: ["translation", "pos", "ipa", "definition", "examples", "collocations", "cefr", "notes"],
  additionalProperties: false
};

const SYSTEM = "You build flashcards for a Brazilian Portuguese speaker learning English. " +
  "Given a word or expression (and sometimes the sentence where the learner found it), describe the sense used in that sentence, or the most common sense if there is none. " +
  "Write exactly 3 natural example sentences a native speaker would actually say, at or slightly above the learner's level, each with a natural pt-BR translation (not word for word). " +
  "If the learner's sentence is given and correct, use it as the first example. Give up to 4 common collocations.";

export async function enrichClaude(term, context, opts){
  const Anthropic = await sdk();
  const client = new Anthropic({apiKey: opts.apiKey, dangerouslyAllowBrowser: true, maxRetries: 1});
  const model = opts.model || "claude-haiku-5-5";
  const user = "Learner level: " + (opts.level || "B1") + "\nTerm: " + term + (opts.pos ? "\nPart of speech: " + opts.pos : "") + (context ? "\nSentence where I found it: " + context : "");
  const params = {
    model, max_tokens: 4000,
    system: SYSTEM,
    output_config: {effort: "low", format: {type: "json_schema", schema: SCHEMA}},
    messages: [{role: "user", content: user}]
  };
  let res;
  try {
    res = FALLBACK_MODELS.has(model)
      ? await client.beta.messages.create(Object.assign({betas: ["server-side-fallback-2026-07-01"], fallbacks: "default"}, params))
      : await client.messages.create(params);
  } catch (err){
    if (err instanceof Anthropic.AuthenticationError) throw new Error("auth");
    if (err instanceof Anthropic.RateLimitError) throw new Error("rate");
    if (err instanceof Anthropic.APIConnectionError) throw new Error("offline");
    if (err instanceof Anthropic.APIError) throw new Error("api " + err.status);
    throw err;
  }
  if (res.stop_reason === "refusal") throw new Error("refusal");
  const text = (res.content || []).filter(b => b.type === "text").map(b => b.text).join("");
  const o = JSON.parse(text);
  return Object.assign({term, audio: ""}, o);
}
