/* Checks the ready-made meanings (assets/data/meanings/*.json, or the generator's batch files) against
   assets/data/words.tsv. Errors break the data; warnings are for a person to look at.

   Entry: {pos, ipa, senses: [{pos, pt: [..], def, ex, form, exPt, hit, ipa?}]} (a sense's ipa when it's said differently)
     form: how the term appears in ex ("considering"); hit: the words of exPt that translate it ("pensando em").

   Run: node scripts/check-meanings.mjs [files...]   (no files: the shipped shards) */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const SHARDS = join(ROOT, "assets", "data", "meanings");

export const fold = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, "'");
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const hasWords = (text, words) => new RegExp("(^|[^a-z])" + esc(fold(words)) + "($|[^a-z])").test(fold(text));

// tsv: term → {level, pos}
export function readList(file){
  const out = new Map();
  readFileSync(file || join(ROOT, "assets", "data", "words.tsv"), "utf8").split("\n").forEach(line => {
    if (!line || line[0] === "#") return;
    const [term, level, pos] = line.split("\t");
    if (term) out.set(term.toLowerCase(), {term, level, pos: pos || ""});
  });
  return out;
}

// parts of speech a sense may have for a tsv entry ("noun/verb" → noun or verb; "be-verb" → verb)
export function allowedPos(pos){
  const set = new Set();
  String(pos).split("/").filter(Boolean).forEach(p => {
    set.add(p);
    if (/verb|auxiliary/.test(p)) set.add("verb");
    if (p === "number") { set.add("noun"); set.add("adjective"); set.add("determiner"); }
    if (p === "infinitive-to") set.add("particle");
  });
  return set;
}

const IRREGULAR = "be:am,is,are,was,were,been,being,'m,'s,'re|have:has,had,having,'ve,'d|do:does,did,done,doing|go:goes,went,gone|get:got,gotten|make:made|take:took,taken|come:came|see:saw,seen|know:knew,known|give:gave,given|find:found|think:thought|tell:told|say:said|become:became|leave:left|feel:felt|bring:brought|begin:began,begun|keep:kept|hold:held|write:wrote,written|stand:stood|hear:heard|let:let|mean:meant|set:set|meet:met|run:ran|pay:paid|sit:sat|speak:spoke,spoken|lie:lay,lain,lying|lead:led|read:read|grow:grew,grown|lose:lost|fall:fell,fallen|send:sent|build:built|understand:understood|draw:drew,drawn|break:broke,broken|spend:spent|cut:cut|rise:rose,risen|drive:drove,driven|buy:bought|wear:wore,worn|choose:chose,chosen|seek:sought|throw:threw,thrown|catch:caught|deal:dealt|win:won|forget:forgot,forgotten|sell:sold|fight:fought|teach:taught|eat:ate,eaten|sing:sang,sung|swim:swam,swum|drink:drank,drunk|ring:rang,rung|fly:flew,flown|hide:hid,hidden|shake:shook,shaken|steal:stole,stolen|wake:woke,woken|bite:bit,bitten|ride:rode,ridden|blow:blew,blown|freeze:froze,frozen|feed:fed|sleep:slept|sweep:swept|weep:wept|bleed:bled|lend:lent|bend:bent|shoot:shot|stick:stuck|strike:struck|hang:hung|dig:dug|spin:spun|swing:swung|light:lit|slide:slid|forgive:forgave,forgiven|bear:bore,borne,born|tear:tore,torn|swear:swore,sworn|beat:beaten|lay:laid|show:shown|prove:proven|undertake:undertook,undertaken|withdraw:withdrew,withdrawn|overcome:overcame|arise:arose,arisen|shine:shone|flee:fled|split:split|spread:spread|hurt:hurt|cost:cost|put:put|shut:shut|quit:quit|bet:bet|burst:burst|upset:upset|forecast:forecast|broadcast:broadcast|can:could,can't,cannot|will:would,'ll,won't|shall:should|may:might|must:mustn't|child:children|sink:sank,sunk|grandchild:grandchildren|schoolchild:schoolchildren|gentleman:gentlemen|man:men|woman:women|person:people|foot:feet|tooth:teeth|mouse:mice|life:lives|wife:wives|knife:knives|leaf:leaves|half:halves|shelf:shelves|wolf:wolves|thief:thieves|good:better,best|well:better,best|bad:worse,worst|badly:worse,worst|far:further,farther,furthest,farthest|little:less,least|much:more,most|many:more,most|i:me,my,mine|he:him,his|she:her,hers|we:us,our,ours|they:them,their,theirs|you:your,yours|it:its|who:whom,whose|this:these|that:those|a:an";
const IRR = new Map(IRREGULAR.split("|").map(p => { const [k, v] = p.split(":"); return [k, v.split(",")]; }));

// spellings an English word takes: plural, 3rd person, past, -ing, comparative, adverb
export function inflections(word){
  const w = fold(word), out = new Set([w]);
  (IRR.get(w) || []).forEach(f => out.add(f));
  const stem = w.replace(/e$/, ""), cvc = /[^aeiou][aeiou][bcdfgklmnprstvz]$/.test(w);
  ["s", "es", "ed", "d", "ing", "er", "est", "r", "st", "ly", "'s", "s'"].forEach(s => out.add(w + s));
  ["ing", "ed", "er", "est", "ation"].forEach(s => out.add(stem + s));
  if (cvc) ["ing", "ed", "er", "est"].forEach(s => out.add(w + w.slice(-1) + s));
  if (/[^aeiou]y$/.test(w)) ["ies", "ied", "ier", "iest", "ily"].forEach(s => out.add(w.slice(0, -1) + s));
  if (/ie$/.test(w)) out.add(w.slice(0, -2) + "ying");
  if (/(f|fe)$/.test(w)) out.add(w.replace(/fe?$/, "ves"));
  if (/le$/.test(w)) out.add(w.slice(0, -1) + "y");
  if (/ic$/.test(w)) out.add(w + "ally");
  return out;
}
// "look forward to" → "looking forward to", "credit card" → "credit cards": any one word inflected
export function termForms(term){
  const words = fold(term).split(/\s+/), out = new Set([words.join(" ")]);
  words.forEach((w, i) => inflections(w).forEach(f => out.add(words.slice(0, i).concat(f, words.slice(i + 1)).join(" "))));
  return out;
}

// Portuguese irregular verbs, so "tenha" counts for "ter" and "fui" for "ir"
const PT_IRR = "ser:sou,es,e,somos,sao,era,eram,foi,fui,fomos,foram,seja,sejam,sido,sendo,fosse,sera|ir:vou,vai,vamos,vao,ia,iam,foi,fui,fomos,foram,va,vá,indo,ido,fosse,iremos,ira,irao|estar:estou,esta,estamos,estao,estava,esteve,estive,esteja|ter:tenho,tem,temos,tinha,teve,tive,tenha,tido,tendo,tivesse|haver:ha,havia,houve,haja|fazer:faco,faz,fez,fiz,feito,faca,fazendo,fizeram,fará,fara|dizer:digo,diz,disse,dito,diga,dizendo|ver:vejo,ve,viu,vi,visto,veja,vendo,viram|vir:venho,vem,veio,vim,vindo,venha|dar:dou,da,deu,dei,dado,de,dando|poder:posso,pode,pude,pode,possa,podendo,podia|saber:sei,sabe,soube,saiba,sabia|querer:quero,quer,quis,queira,queria|trazer:trago,traz,trouxe,traga|por:ponho,poe,pos,posto,ponha,pondo,pus|ouvir:ouco,ouve,ouviu|pedir:peco,pede,pediu|perder:perco,perde,perdeu|sair:saio,sai,saiu|cair:caio,cai,caiu|ler:leio,le,leu|crer:creio,cre|caber:caibo,coube|valer:valho,vale|medir:meco,mede|dormir:durmo,dorme|subir:subo,sobe|fugir:fujo,foge|seguir:sigo,segue|sentir:sinto,sente|servir:sirvo,serve|vestir:visto,veste|repetir:repito,repete|preferir:prefiro,prefere|conseguir:consigo,consegue|ferir:firo,fere|divertir:divirto,diverte|mentir:minto,mente|construir:constroi|destruir:destroi";
const PT = new Map(PT_IRR.split("|").map(p => { const [k, v] = p.split(":"); return [k, v.split(",")]; }));
// articles and prepositions fused together: "às" is "a" + "as", "na" is "em" + "a"
const FUSED = {a: "a,as,ao,aos,à,às", em: "no,na,nos,nas,num,numa", de: "do,da,dos,das,dum,duma,deste,desta,disso,daquele,daquela", por: "pelo,pela,pelos,pelas", o: "o,a,os,as", um: "um,uma,uns,umas",
  seu: "sua,seus,suas", meu: "minha,meus,minhas", teu: "tua,teus,tuas", nosso: "nossa,nossos,nossas", ele: "ela,eles,elas",
  dele: "dela,deles,delas", este: "esta,estes,estas", esse: "essa,esses,essas", aquele: "aquela,aqueles,aquelas", algum: "alguma,alguns,algumas",
  nenhum: "nenhuma", todo: "toda,todos,todas", outro: "outra,outros,outras", muito: "muita,muitos,muitas", pouco: "pouca,poucos,poucas"};
const ptWords = s => fold(s).split(/[^a-z]+/).filter(Boolean);
// does `hit` (from the sentence) look like one of the sense's Portuguese words?
export function ptRelated(hit, pt){
  const h = ptWords(hit);
  return pt.some(p => ptWords(p).some(w => {
    const forms = (PT.get(w) || []).concat(FUSED[w] ? fold(FUSED[w]).split(",") : []);
    const prefix = w.length > 3 ? w.slice(0, Math.max(3, Math.min(w.length - 2, 5))) : null;
    return h.some(x => x === w || forms.includes(x) || (prefix ? x.startsWith(prefix) : x.startsWith(w) && x.length <= w.length + 2));
  }));
}

const STR = (v, max) => typeof v === "string" && v.trim() && v.length <= max;

/* errors break the entry; warnings ask for a look */
export function checkEntry(key, e, listEntry){
  const errors = [], warnings = [];
  const err = m => errors.push(key + ": " + m), warn = m => warnings.push(key + ": " + m);
  if (!listEntry) err("not in words.tsv");
  if (!e || typeof e !== "object" || !Array.isArray(e.senses)) { err("no senses"); return {errors, warnings}; }
  if (listEntry && e.pos !== listEntry.pos) err("pos " + JSON.stringify(e.pos) + " but words.tsv says " + JSON.stringify(listEntry.pos));
  if (e.ipa != null && typeof e.ipa !== "string") err("ipa must be a string");
  if (e.ipa && /^\/|\/$/.test(e.ipa)) err("ipa without slashes");
  if (e.senses.length < 1 || e.senses.length > 4) err(e.senses.length + " senses (1 to 4)");
  const allowed = allowedPos(listEntry ? listEntry.pos : e.pos);
  const forms = termForms(listEntry ? listEntry.term : key);
  const firsts = new Set(), exs = new Set();
  e.senses.forEach((s, i) => {
    const n = "sense " + (i + 1) + " ";
    if (!s || typeof s !== "object") return err(n + "is not an object");
    // the list's part of speech misses some words' main use ("still" is only an adjective there, but learners need "ainda")
    if (!STR(s.pos, 30)) err(n + "pos missing");
    else if (!allowed.has(s.pos)) warn(n + "pos " + JSON.stringify(s.pos) + " not in " + [...allowed].join("/"));
    if (!Array.isArray(s.pt) || !s.pt.length || s.pt.length > 3 || !s.pt.every(t => STR(t, 40))) err(n + "pt: 1 to 3 short words");
    else {
      if (s.pt.some(t => /[;()]|\.\.\./.test(t))) err(n + "pt has notes in it (" + s.pt.join(", ") + ")");
      // exact: "Terra" the planet and "terra" the soil are different words
      const f = s.pt[0].trim();
      if (firsts.has(f)) err(n + "starts with " + JSON.stringify(s.pt[0]) + " like another sense: senses with the same Portuguese word are one sense");
      firsts.add(f);
      // accents count here: avô and avó are different words
      if (new Set(s.pt.map(t => t.toLowerCase())).size < s.pt.length) err(n + "repeats a word in pt");
    }
    if (s.ipa != null && (typeof s.ipa !== "string" || /^\/|\/$/.test(s.ipa))) err(n + "ipa: a string without slashes");
    if (!STR(s.def, 160)) err(n + "def: one short sentence");
    if (!STR(s.ex, 160)) err(n + "ex: one sentence");
    if (!STR(s.exPt, 200)) err(n + "exPt: one sentence");
    if (!STR(s.form, 40)) err(n + "form: the term as it appears in ex");
    if (!STR(s.hit, 50)) err(n + "hit: the words of exPt that translate the term");
    if (STR(s.ex, 160) && STR(s.form, 40)){
      if (!hasWords(s.ex, s.form)) err(n + "form " + JSON.stringify(s.form) + " is not in ex");
      // a set phrase around the term ("a while", "used to") is fine too
      else if (!forms.has(fold(s.form)) && ![...forms].some(f => hasWords(s.form, f))) warn(n + "form " + JSON.stringify(s.form) + " is not a known spelling of " + JSON.stringify(key));
      if (exs.has(fold(s.ex))) err(n + "same example as another sense");
      exs.add(fold(s.ex));
    }
    if (STR(s.exPt, 200) && STR(s.hit, 50)){
      if (!fold(s.exPt).includes(fold(s.hit))) err(n + "hit " + JSON.stringify(s.hit) + " is not in exPt");
      else if (Array.isArray(s.pt) && !ptRelated(s.hit, s.pt)) warn(n + "hit " + JSON.stringify(s.hit) + " doesn't look like " + JSON.stringify(s.pt.join(", ")));
    }
  });
  return {errors, warnings};
}

export function checkAll(data, list){
  const errors = [], warnings = [];
  Object.keys(data).forEach(k => {
    if (k !== k.toLowerCase()) errors.push(k + ": key must be lower case");
    const r = checkEntry(k, data[k], list.get(k));
    errors.push(...r.errors); warnings.push(...r.warnings);
  });
  return {errors, warnings};
}

export function readShards(dir){
  const d = dir || SHARDS, out = {};
  if (!existsSync(d)) return out;
  readdirSync(d).filter(f => f.endsWith(".json")).forEach(f => Object.assign(out, JSON.parse(readFileSync(join(d, f), "utf8"))));
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)){
  const files = process.argv.slice(2).filter(a => !a.startsWith("--"));
  const quiet = process.argv.includes("--quiet");
  const data = {};
  if (files.length) files.forEach(f => Object.assign(data, JSON.parse(readFileSync(f, "utf8"))));
  else Object.assign(data, readShards());
  const list = readList();
  const { errors, warnings } = checkAll(data, list);
  if (!quiet) warnings.forEach(w => console.log("warn  " + w));
  errors.forEach(e => console.log("ERROR " + e));
  console.log(Object.keys(data).length + " words, " + errors.length + " errors, " + warnings.length + " warnings");
  process.exitCode = errors.length ? 1 : 0;
}
