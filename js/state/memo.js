// Memo for data derived from the store: cleared whenever the store changes.
import { version } from "./store.js";

const memo = new Map();
let memoV = -1;
export function cached(key, fn){
  if (memoV !== version){ memo.clear(); memoV = version; }
  if (!memo.has(key)) memo.set(key, fn());
  return memo.get(key);
}
