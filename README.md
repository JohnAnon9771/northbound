# Northbound

Minha jornada do A2 à fluência em inglês: plano do dia, rota de 52 semanas, flashcards próprios com tradução e exemplos automáticos, e progresso.

Site estático, sem build e sem servidor. Os dados ficam no navegador (IndexedDB). Roda no GitHub Pages.

## Rodar localmente

ES modules precisam de HTTP (abrir o `index.html` direto não funciona):

```bash
npm run dev
```

Abra http://localhost:8000. Testes (Node 20+, sem dependências):

```bash
npm test
```

## Publicar no GitHub Pages

1. Envie para o GitHub (`main`).
2. No repositório: Settings → Pages → Source: *Deploy from a branch* → `main` / `(root)`.
3. Abra `https://<usuario>.github.io/northbound/`. No celular, “Adicionar à tela de início” instala como app (funciona offline e o Safari não apaga os dados após 7 dias sem uso).

O service worker só é registrado em HTTPS, então em `localhost` ele não interfere. No site publicado ele busca sempre a versão mais nova na rede e usa o cache só quando você está offline, então uma mudança aparece no próximo carregamento (o GitHub Pages pode levar alguns minutos para publicar).

## Seus dados

- Tudo fica no IndexedDB deste navegador, neste aparelho. Não há sincronização.
- **Ajustes → Baixar backup** gera um JSON com tudo (exceto a chave da Claude API). O site lembra de fazer backup a cada 14 dias.
- **Restaurar** aceita backups deste site e da página antiga (`rota-ingles.html`, exportada em Ajustes → “Baixar backup (JSON)”). Registros de DuoCards viram Flashcards.

## Flashcards

Ao adicionar uma palavra (com a frase onde você a viu, opcional), o site busca:

| Fonte | O que traz |
|---|---|
| [Wiktionary](https://en.wiktionary.org/api/rest_v1/) | classe gramatical, definições e exemplos |
| [Tatoeba](https://tatoeba.org) | frases reais com tradução humana para o português |
| [MyMemory](https://mymemory.translated.net) | tradução da palavra e das frases sem tradução (5 mil caracteres/dia; 50 mil com e-mail em Ajustes) |
| [Free Dictionary API](https://dictionaryapi.dev) | pronúncia (IPA) e áudio, quando disponível |

Com uma chave da Claude API em Ajustes, o Claude gera tradução por sentido, exemplos naturais, collocations, nível CEFR e notas para quem fala português. Se a chamada falhar, as fontes gratuitas assumem. A chave fica só no navegador e nunca entra no backup.

Revisão espaçada no estilo Anki (SM-2, `js/flashcards/srs.js`): revisões antes das novas, limite de novas por dia vindo da fase da rota, e novas bloqueadas no dia em que as revisões passam de 15 minutos. Cada resposta fica no store `reviews`, o que permite trocar o algoritmo (por exemplo, FSRS) sem perder histórico.

### Palavras do dia

O cartão "Palavras do dia" em Palavras sugere, a cada dia, as palavras mais usadas do nível da fase que ainda não estão no deck: A2 nas fases 0 e 1, B1 na 2, B2 na 3 e 4, C1 na 5 (dá para fixar o nível em Ajustes). Você marca "já sei" nas que conhece e adiciona o resto, com tradução e exemplos. O lote completa o limite de novas do dia e só aparece quando as novas anteriores já foram estudadas, então nada se acumula nem se repete.

A lista fica em `assets/data/words.tsv` e é gerada por:

```bash
python3 scripts/build-wordlist.py
```

Fontes (o Oxford 3000/5000 não pode ser redistribuído, então o site usa equivalentes abertos):

- níveis A1 a B2: [CEFR-J Wordlist 1.5](http://www.cefr-j.org/download.html) (Tono Lab, TUFS), via [olp-en-cefrj](https://github.com/openlanguageprofiles/olp-en-cefrj);
- C1: [Octanove Vocabulary Profile](https://github.com/openlanguageprofiles/olp-en-cefrj) (CC BY-SA 4.0);
- ordem por frequência: [NGSL 1.2](https://www.newgeneralservicelist.com/) (Browne, Culligan e Phillips, CC BY-SA 4.0).

`assets/data/words.tsv` é distribuído sob CC BY-SA 4.0.

## Estrutura

```
index.html              shell: header, navegação, <main id="app">
sw.js  manifest.webmanifest  .nojekyll
assets/css/tokens.css   cores, fontes, raios, sombras (claro e “luz de vela”)
assets/css/base.css     reset, tipografia, layout
assets/css/components.css
assets/data/words.tsv   lista das Palavras do dia (gerada por scripts/build-wordlist.py)
js/main.js              boot
js/app/                 router (telas, #hoje, #palavras…, navegação), delegação de eventos, barra do cronômetro,
                        lembrete de backup, service worker
js/core/                utilitários sem conhecer o app: date, dom, format, id, icons, theme, toast, rerender, study-timer
js/state/               store (estado em memória + persistência), db (IndexedDB), schema, backup-format, memo, selectors
js/data/                só conteúdo: lições, fases, as 52 semanas (weeks), can-do, prompts, habilidades
js/domain/              regras: tarefas de cada semana, extras da meta, ritmo e semana atual, fechamento da semana,
                        plano do dia, notas das lições, estatísticas, conquistas
js/flashcards/          srs, deck, card, enrich + providers (claude, free/ com uma fonte por arquivo), importer,
                        word-list (Palavras do dia), pos, audio
js/ui/                  pedaços de interface compartilhados (tarefa, ações de tarefa, logs, foco da semana, fala,
                        Palavras do dia, backup, conquistas, confete)
js/views/               uma tela por arquivo (today = #hoje, words = #palavras, route = #rota…)
tests/                  node --test, um arquivo por módulo
```

As regras ficam em funções puras (`buildWeek`, `buildExtras`, `paceFor`, `deckSummary`…), testadas sem navegador; ao lado de cada uma, um wrapper com o nome usado pelas telas lê o store (`weekTasks`, `extraTasks`, `paceText`, `deckToday`…).

Dependências: `core` não importa nada do app; `data` só importa `data`; `domain` e `flashcards` não importam `ui` nem `views`; `ui` não importa `views`.

## Testes

```bash
npm test
npm run coverage
```

`tests/route-snapshot.test.js` guarda as tarefas de cada semana da rota (1 a 60) para alguns estados fixos. Se você mudar o conteúdo da rota de propósito, gere de novo com `UPDATE_SNAPSHOT=1 node --test tests/route-snapshot.test.js`. `tests/imports.test.js` confere que todo import relativo aponta para um arquivo e um export que existem, inclusive nas telas, que os outros testes não carregam.

## Como mudar o visual

Todas as cores, fontes, raios e sombras estão em `assets/css/tokens.css`, com o tema claro em `:root` e o escuro em `[data-theme="dark"]` e `prefers-color-scheme: dark`. Os componentes usam só esses tokens, então um redesign de cores e tipografia é editar um arquivo. As fontes vêm do Google Fonts no `<head>` do `index.html`.

## Como adicionar uma tela

1. Crie `js/views/my-screen.js` (o nome do arquivo é em inglês; o `id` vira a URL):

   ```js
   export default {
     id: "minha-tela",          // vira #minha-tela
     title: "Minha tela",
     render(){ return "<h1>Olá</h1>"; },
     actions: {                 // data-act="salvar" (clique), data-change, data-input, data-submit
       salvar(el, event){ /* ... */ }
     }
   };
   ```

2. Importe e adicione em `VIEWS` no `js/app/router.js`. Para aparecer na navegação, adicione em `NAV`; para ficar dentro de “Mais”, adicione em `PARENT` e um link em `js/views/more.js`.

Opcionais: `enter()`/`leave()` ao entrar e sair, `mounted(root)` depois de cada render, `onKey(e)` para atalhos, `focus: true` para esconder a navegação (como no estudo).

Dados: leia de `S` (`js/state/store.js`) e altere com `update(s => { ... })`, `addLog`, `putCard` etc. Toda mudança salva no IndexedDB e redesenha a tela.
