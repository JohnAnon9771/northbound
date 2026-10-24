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

O service worker só é registrado em HTTPS, então em `localhost` você sempre vê os arquivos mais novos. No site publicado, uma mudança aparece no segundo carregamento (stale-while-revalidate). Ao mudar algo grande, troque `CACHE` em `sw.js` (`nb-v1` → `nb-v2`).

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

## Estrutura

```
index.html              shell: header, navegação, <main id="app">
sw.js  manifest.webmanifest  .nojekyll
assets/css/tokens.css   cores, fontes, raios, sombras (claro e “luz de vela”)
assets/css/base.css     reset, tipografia, layout
assets/css/components.css
js/app.js               boot, rotas (#hoje, #palavras…), delegação de eventos, cronômetro
js/core/                db (IndexedDB), store (estado em memória + persistência), migrate, date, dom, toast, timer
js/data/                só conteúdo: lições, fases, plano das 52 semanas, can-do, prompts, habilidades
js/domain/              regras: rota e ritmo, estatísticas, plano do dia, conquistas
js/flashcards/          srs, deck, enrich + providers (free, claude)
js/ui/                  pedaços de interface compartilhados (tarefas, palavras, backup, celebração)
js/views/               uma tela por arquivo
tests/                  node --test
```

## Como mudar o visual

Todas as cores, fontes, raios e sombras estão em `assets/css/tokens.css`, com o tema claro em `:root` e o escuro em `[data-theme="dark"]` e `prefers-color-scheme: dark`. Os componentes usam só esses tokens, então um redesign de cores e tipografia é editar um arquivo. As fontes vêm do Google Fonts no `<head>` do `index.html`.

## Como adicionar uma tela

1. Crie `js/views/minha-tela.js`:

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

2. Importe e adicione em `VIEWS` no `js/app.js`. Para aparecer na navegação, adicione em `NAV`; para ficar dentro de “Mais”, adicione em `PARENT` e um link em `js/views/mais.js`.

Opcionais: `enter()`/`leave()` ao entrar e sair, `mounted(root)` depois de cada render, `onKey(e)` para atalhos, `focus: true` para esconder a navegação (como no estudo).

Dados: leia de `S` (`js/core/store.js`) e altere com `update(s => { ... })`, `addLog`, `putCard` etc. Toda mudança salva no IndexedDB e redesenha a tela.
