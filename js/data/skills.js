// Study skills. `c` is the category: base (grammar, vocabulary, tests), in (input), out (output).
export const SK = {
  cards:{n:"Flashcards",c:"base"}, gram:{n:"Gramática",c:"base"}, vocab:{n:"Vocabulário",c:"base"},
  list:{n:"Listening",c:"in"}, read:{n:"Reading",c:"in"}, input:{n:"Input livre",c:"in"},
  writ:{n:"Writing",c:"out"}, speak:{n:"Speaking",c:"out"}, conv:{n:"Conversa",c:"out"},
  test:{n:"Testes",c:"base"}
};
export const SKORDER = ["cards","gram","vocab","list","read","writ","speak","conv","input","test"];
export const CATN = {base:"Base (gramática, vocabulário, testes)", in:"Entrada", out:"Produção"};
export const SPLIT = [["cards","Flashcards e vocabulário",140],["gram","Gramática",120],["list","Listening e podcasts",120],["read","Reading e histórias",90],["writ","Writing com correção",90],["speak","Speaking (vídeos BC)",60],["conv","Conversa no ChatGPT",120],["input","Input livre",70]];
// logs from the old page used "duo" for DuoCards
export const sk = k => SK[k === "duo" ? "cards" : k] || SK.gram;
