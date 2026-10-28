/* Adds generated meaning batches to the shipped shards (assets/data/meanings/<first letter>.json), replacing
   words already there. Refuses when scripts/check-meanings.mjs finds errors in the result.

   Run: node scripts/merge-meanings.mjs batch1.json batch2.json … */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { SHARDS, readShards, readList, checkAll } from "./check-meanings.mjs";

const shardOf = term => { const c = term[0]; return c >= "a" && c <= "z" ? c : "_"; };

const data = readShards();
const files = process.argv.slice(2);
files.forEach(f => Object.assign(data, JSON.parse(readFileSync(f, "utf8"))));
const { errors } = checkAll(data, readList());
if (errors.length){
  errors.slice(0, 50).forEach(e => console.log("ERROR " + e));
  console.log(errors.length + " errors: nothing written");
  process.exit(1);
}
const byShard = {};
Object.keys(data).sort().forEach(k => { (byShard[shardOf(k)] = byShard[shardOf(k)] || []).push(k); });
mkdirSync(SHARDS, {recursive: true});
// one word per line, so a change to a word is a one-line diff
Object.entries(byShard).forEach(([s, keys]) => {
  writeFileSync(join(SHARDS, s + ".json"), "{\n" + keys.map(k => JSON.stringify(k) + ":" + JSON.stringify(data[k])).join(",\n") + "\n}\n");
});
console.log(Object.keys(data).length + " words in " + Object.keys(byShard).length + " shards");
