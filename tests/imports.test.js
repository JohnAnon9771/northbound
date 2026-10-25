// Static check of the module graph: every relative import points to an existing file that exports the imported names.
// Covers the browser-only modules (views, app shell) that the other tests never load.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, relative, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function walk(dir){
  return readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".js") ? [p] : [];
  });
}

function exportsOf(src){
  const names = new Set();
  for (const m of src.matchAll(/^export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([\w$]+)/gm)) names.add(m[1]);
  for (const m of src.matchAll(/^export\s*\{([^}]*)\}/gm)) m[1].split(",").map(s => s.trim()).filter(Boolean).forEach(s => names.add(s.split(/\s+as\s+/).pop()));
  if (/^export\s+default\b/m.test(src)) names.add("default");
  return names;
}

const files = walk(join(ROOT, "js")).concat(walk(join(ROOT, "tests")));
const IMPORT = /^(?:import|export)\s*(?:\{([^}]*)\}|(\*\s+as\s+[\w$]+)|([\w$]+))?\s*(?:from\s*)?"(\.[^"]+)";/gm;
const DYNAMIC = /import\(\s*"(\.[^"]+)"\s*\)/g;

test("every relative import resolves to an existing export", () => {
  const problems = [];
  files.forEach(file => {
    const src = readFileSync(file, "utf8");
    const at = relative(ROOT, file);
    const check = (spec, names) => {
      const target = normalize(join(dirname(file), spec));
      if (!existsSync(target)){ problems.push(at + ": missing " + spec); return; }
      const exp = exportsOf(readFileSync(target, "utf8"));
      names.forEach(n => { if (!exp.has(n)) problems.push(at + ": " + spec + " has no export " + n); });
    };
    for (const m of src.matchAll(IMPORT)){
      const named = m[1] ? m[1].split(",").map(s => s.trim()).filter(Boolean).map(s => s.split(/\s+as\s+/)[0]) : [];
      check(m[4], m[3] ? ["default"] : named);
    }
    for (const m of src.matchAll(DYNAMIC)) check(m[1], []);
  });
  assert.deepEqual(problems, []);
});

test("index.html loads an existing entry module", () => {
  const html = readFileSync(join(ROOT, "index.html"), "utf8");
  const src = html.match(/<script type="module" src="([^"]+)"/)[1];
  assert.ok(existsSync(join(ROOT, src)), src);
});

// which top-level folders of js/ each folder may import from (besides itself)
const LAYERS = {
  core: [],
  data: [],
  state: ["core", "flashcards"],
  domain: ["core", "data", "state", "flashcards"],
  flashcards: ["core", "data", "state", "domain"],
  ui: ["core", "data", "state", "domain", "flashcards"],
  views: ["core", "data", "state", "domain", "flashcards", "ui"],
  app: ["core", "data", "state", "domain", "flashcards", "ui", "views"]
};

test("layers only import from the layers below them", () => {
  const problems = [];
  // js/main.js sits on top of everything, so only files inside a folder are checked
  files.filter(f => /^[a-z-]+\//.test(relative(join(ROOT, "js"), f))).forEach(file => {
    const from = relative(join(ROOT, "js"), file).split("/")[0];
    for (const m of readFileSync(file, "utf8").matchAll(/from\s*"(\.[^"]+)"/g)){
      const to = relative(join(ROOT, "js"), normalize(join(dirname(file), m[1]))).split("/")[0];
      if (to !== from && !LAYERS[from].includes(to)) problems.push(relative(ROOT, file) + " imports " + m[1]);
    }
  });
  assert.deepEqual(problems, []);
});
