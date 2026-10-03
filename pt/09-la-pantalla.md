# Lição 9 — A tela e o programa terminado

**Tempo:** 2 × 45 min

**O que você constrói:** o painel web e o pacote final

**O que você aprende:** React com TypeScript, hooks, tipos compartilhados front–back, segurança básica (XSS), compilar e publicar

## Ao terminar, você vai conseguir

- Escrever componentes de React em arquivos `.tsx` com propriedades tipadas e uma união discriminada do `revisor`.
- Usar `useState` e `useEffect` para carregar dados da API com estados de carregamento e de erro, e cancelar a requisição quando o componente desaparece.
- Compartilhar entre o servidor e o navegador um mesmo contrato, com seu tipo e sua validação em tempo de execução, sem arrastar código do Node para a tela.
- Reconhecer uma inserção de HTML sem sanitizar, explicar por que ela abre uma vulnerabilidade XSS e bloqueá-la com o tipo, com o ESLint e com uma política de segurança de conteúdo.
- Empacotar o painel com o esbuild e servi-lo a partir do mesmo processo da API.
- Testar o painel em um DOM real e o pacote completo contra o servidor, e dizer com honestidade o que cada teste verificou e o que só um navegador pode verificar.
- Preparar o artefato que é publicado: o que ele leva, o que não leva e como é instalado sem dependências de desenvolvimento.

## O porquê antes do como

Até a lição anterior, o `revisor` já faz o trabalho difícil: valida uma configuração, consulta serviços reais de forma concorrente, representa as falhas como dados, expõe uma API HTTP e se encerra com ordem. No entanto, uma resposta JSON continua sendo uma interface pensada para outro programa. Uma pessoa que precisa saber se `pagos` está falhando pode abrir a rota, ler uma estrutura longa e procurar a olho os campos importantes. Isso serve para diagnosticar; não é uma boa tela de operação.

O painel troca a pergunta “que dados o sistema tem?” por “o que alguém precisa ver para tomar uma decisão?”. Um relatório deve mostrar primeiro o nome do serviço, se está disponível ou em falha e o dado que explica essa conclusão: código HTTP e duração para uma resposta disponível, detalhe para uma falha. Deve dizer quando ainda está carregando e o que aconteceu quando o carregamento falhou, porque uma tela que fica em branco não distingue “não há serviços” de “não consegui perguntar”. E deve se atualizar sozinha, porque um relatório de disponibilidade que fica velho é pior do que não ter nenhum.

O React ajuda a descrever essa tela como componentes. Um **componente** é uma função que recebe propriedades e devolve uma descrição de interface. O React se encarrega de converter essa descrição em elementos do navegador e de atualizá-los quando os dados mudam. Isso não substitui as regras construídas nas lições anteriores: o painel deve consumir um contrato já decidido, não inventar por conta própria que códigos são bem-sucedidos, o que significa um tempo limite nem como a configuração é validada.

Esse contrato já existe. A lição 8 separou o modelo interno do público: o servidor precisa de um `Servicio` completo, com `nombre`, `url` e `timeoutMs`, para fazer consultas, e um `Estado` interno conserva esse serviço porque a lógica de revisão precisa dele. O navegador só precisa de `ReportePublico`, que não leva a URL nem o tempo limite. Esta lição aproveita o que essa separação deixa pronto: `src/contrato.ts` não importa nada do Node, de modo que o mesmo arquivo, com seu tipo e sua validação, viaja ao navegador junto com o painel. Compartilhar tipos não significa compartilhar tudo; significa compartilhar o que realmente cruza a fronteira, e compartilhá-lo uma única vez para que servidor e tela não possam divergir sem que o compilador perceba.

Isso reduz uma classe de desacordos, mas não elimina a fronteira de rede. Os tipos do TypeScript são apagados antes de executar, como você viu na lição 0: o navegador recebe bytes de JSON, não uma instância viva de `ReportePublico`. Por isso o painel usa o mesmo padrão da lição 6: o que chega por `fetch` é `unknown` até que `esReportePublico` demonstre o contrário. O tipo compartilhado diz o que o painel espera; a validação verifica que o recebido o cumpre. Sem o primeiro, servidor e painel se dessincronizam em silêncio; sem a segunda, um proxy que devolva uma página de erro com código 200 faz a tela compilar, iniciar e falhar depois.

A tela também introduz um risco que não existe ao imprimir no console: o navegador interpreta HTML. O `detalle` de uma falha pode conter texto que vem de um serviço remoto, de uma configuração ou de uma pessoa. Se esse texto é inserido como HTML, pode fechar uma tag, criar elementos novos ou tentar executar código no contexto de quem abriu o painel. Essa família de vulnerabilidades se chama **XSS**, de *cross-site scripting*. Não é um problema de “texto estranho”: é um problema de confundir dados com instruções para o navegador, e é uma das falhas mais repetidas da web.

Em Go, a separação se parece com construir uma estrutura específica para uma resposta HTTP e entregá-la a um template com escape automático. A ideia não depende da linguagem: o modelo interno contém o que o programa precisa para operar; o modelo público contém apenas o necessário para comunicar o resultado; e o texto de fora nunca é tratado como código. O TypeScript traz uma vantagem quando servidor e tela vivem no mesmo repositório: o contrato pode ser nomeado uma vez e verificado nos dois lados antes de executar.

Por fim, o produto terminado não é apenas o código que fica bonito no seu computador. Inclui uma forma repetível de construí-lo, dependências registradas, uma saída que pode ser inspecionada e uma configuração segura para iniciá-lo. Publicar não é copiar às cegas todo o diretório nem subir segredos junto com o código: é gerar um artefato conhecido, verificar o que ele contém, instalar somente o necessário para executar e implantar com limites claros de rede, origem e configuração. No final da lição o `revisor` fica completo: um único processo Node que revisa os serviços de `servicios.json`, responde `GET /api/estados` e serve o painel que consome essa resposta.

Esta lição conserva, como a 8, a estrutura do projeto: entrada `src/main.ts`, `rootDir` `./src`, `outDir` `./dist`, e os scripts `compilar`, `verificar`, `arrancar`, `probar`, `lint` e `formato`, com um script novo, `empaquetar`. O que é instalado de novo é explicado no momento certo: React, um empacotador (esbuild) e um DOM de teste (jsdom). As figuras de um arquivo são executadas na pasta `figuras/` da lição 1; só precisam que você instale ali as mesmas dependências que o projeto usa.

```bash
cd ~/proyectos/figuras
npm install --save-dev --save-exact react@19.3.0 react-dom@19.3.0 @types/react@19.3.0 @types/react-dom@19.3.0 jsdom@29.1.1 @types/jsdom@28.0.3
```

## Os conceitos

### Componentes e JSX: uma função que descreve uma parte da tela

O JSX parece HTML dentro do TypeScript, mas não é uma string de HTML que o navegador recebe tal qual. É uma sintaxe que o TypeScript transforma em chamadas ao React. Por isso o arquivo deve terminar em `.tsx` e a compilação deve habilitar `--jsx react-jsx`. Esse modo usa o *runtime* automático do React: você não precisa importar um identificador chamado `React` só para que o JSX compile, embora importe os valores concretos que usar, como os hooks.

Um componente de função recebe um objeto de propriedades, normalmente desestruturado em seus parâmetros, e devolve JSX. As propriedades são um contrato igual aos parâmetros de qualquer outra função. Se uma linha precisa de um estado, o tipo da propriedade deve dizê-lo. Não a declare como `unknown`, `any` ou um objeto com propriedades opcionais só para “fazer a tela desenhar”: isso transferiria para a tela uma incerteza que o modelo já resolveu.

O programa a seguir usa o mesmo padrão de união discriminada da lição 3. A linha atende `disponible` e `falla` separadamente: no primeiro ramo pode ler `codigoHttp`; no segundo, `detalle`. Não é preciso perguntar se os campos existem nem encher o modelo de propriedades opcionais ambíguas. Nesta figura, `EstadoPublico` é simplificado em relação ao contrato real do projeto: não leva `duracionMs`, para que o exemplo seja curto.

```tsx
// fig09_01.tsx
import { renderToStaticMarkup } from "react-dom/server";

type EstadoPublico =
  | {
      readonly nombre: string;
      readonly tipo: "disponible";
      readonly codigoHttp: number;
    }
  | {
      readonly nombre: string;
      readonly tipo: "falla";
      readonly detalle: string;
    };

function FilaEstado({ estado }: { readonly estado: EstadoPublico }) {
  if (estado.tipo === "disponible") {
    return (
      <li>
        <strong>{estado.nombre}</strong> disponible: HTTP {estado.codigoHttp}
      </li>
    );
  }

  return (
    <li>
      <strong>{estado.nombre}</strong> falla: {estado.detalle}
    </li>
  );
}

const pantalla = renderToStaticMarkup(
  <ul>
    <FilaEstado estado={{ nombre: "catálogo", tipo: "disponible", codigoHttp: 200 }} />
    <FilaEstado estado={{ nombre: "pagos", tipo: "falla", detalle: "tiempo límite" }} />
  </ul>,
);

console.log(pantalla);
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext --jsx react-jsx fig09_01.tsx
$ node fig09_01.js
<ul><li><strong>catálogo</strong> disponible: HTTP 200</li><li><strong>pagos</strong> falla: tiempo límite</li></ul>
```

`renderToStaticMarkup` converte um componente em uma string de HTML sem necessidade de um navegador. **Renderizar** é isso: converter a descrição que o componente devolve em HTML ou em elementos visíveis. Aqui serve para ver o que o componente produz com dados controlados. Não acrescenta interatividade: gera HTML estático, sem estado e sem efeitos, e por isso não é o que o painel final usa. Que um componente possa ser executado assim, como uma função qualquer, é justamente o que o torna fácil de testar.

Os componentes não precisam ser classes. Uma função com propriedades tipadas é uma peça comum do TypeScript: pode ser extraída, testada e lida sem aprender uma hierarquia especial. O React se encarrega de interpretar o JSX devolvido. A comparação com o Go não é literal, porque o Go não tem JSX, mas a separação é familiar: uma função de apresentação recebe uma estrutura já válida e produz uma representação para quem a consome.

Dentro do `revisor`, a divisão é pequena. `Panel` pede os dados e decide que tela cabe segundo o carregamento; `Contenido` escolhe entre carregando, erro e lista; `FilaEstado` recebe um `EstadoPublico` e o desenha. Nenhum decide que rota HTTP existe, nem lê variáveis de ambiente, nem sabe que códigos HTTP significam “disponível”: isso já foi decidido pelo servidor e chega no campo `tipo`.

### Hooks: estado e efeitos

Um componente que apenas desenha dados recebidos é o caso fácil. O painel precisa de mais: pedir dados à API, esperar, mostrar “Cargando…”, substituí-lo pela lista quando chegar, mostrar um erro se a API falhar, e repetir isso de tempos em tempos. Para isso o React oferece os **hooks**, funções cujo nome começa com `use` e que conectam um componente com capacidades do React. Há dois de que você precisa agora.

`useState` dá memória ao componente. `const [total, establecerTotal] = useState<number | undefined>(undefined)` declara um valor, `total`, que o React conserva entre renderizações, e uma função, `establecerTotal`, que o muda. Chamar essa função não modifica a variável naquele momento: pede ao React que execute o componente de novo com o valor novo. O tipo entre os sinais de menor e maior descreve que valores admite; com uma união discriminada, o tipo do estado diz exatamente que telas existem.

`useEffect` executa trabalho que não é desenhar. Desenhar deve ser uma função pura das propriedades e do estado; pedir dados a uma rede, agendar um temporizador ou se inscrever em algo é um **efeito**, e deve ser feito depois de o React desenhar, não durante. `useEffect(() => { ... }, [])` recebe uma função e uma lista de dependências. A função roda depois da primeira renderização; se devolve outra função, essa função de limpeza roda quando o componente desaparece ou quando alguma dependência muda, antes de repetir o efeito. A lista de dependências é a parte em que mais se erra: diz de que valores o efeito depende, e o React o repete apenas quando algum muda. Uma lista vazia significa “somente ao montar”.

A figura seguinte é o mínimo que mostra o ciclo completo. Um componente pede, por meio de um efeito, um número que leva 10 ms para chegar; enquanto isso mostra “Cargando…”; ao chegar, guarda-o no estado e o React o desenha de novo. Para executá-lo no Node, sem navegador, a figura cria um documento simulado com o jsdom, uma implementação de DOM escrita em JavaScript, e o instala como `document` e `window` globais; o React o usa como se fosse o do navegador. `act` é a ferramenta do React para testes: executa o código que provoca mudanças, espera que o React termine de aplicá-las e só então devolve o controle, de modo que o que você lê a seguir é o que uma pessoa veria.

```tsx
// fig09_02.tsx
import { JSDOM } from "jsdom";
import { act, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

const dom = new JSDOM('<!doctype html><div id="raiz"></div>');

Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  IS_REACT_ACT_ENVIRONMENT: true,
});

function contarServicios(): Promise<number> {
  return new Promise((resolve) => setTimeout(() => resolve(2), 10));
}

function Resumen() {
  const [total, establecerTotal] = useState<number | undefined>(undefined);

  useEffect(() => {
    void contarServicios().then(establecerTotal);
  }, []);

  return <p>{total === undefined ? "Cargando…" : `${total} servicios`}</p>;
}

const raiz = dom.window.document.getElementById("raiz");

if (raiz === null) {
  throw new Error("falta el elemento #raiz");
}

const arbol = createRoot(raiz);

await act(async () => {
  arbol.render(<Resumen />);
});
console.log(`primer render: ${raiz.innerHTML}`);

await act(async () => {
  await new Promise((resolve) => setTimeout(resolve, 30));
});
console.log(`tras el efecto: ${raiz.innerHTML}`);

await act(async () => {
  arbol.unmount();
});
dom.window.close();
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext --jsx react-jsx fig09_02.tsx
$ node fig09_02.js
primer render: <p>Cargando…</p>
tras el efecto: <p>2 servicios</p>
```

Três coisas aparecem nessa saída. A primeira renderização mostra “Cargando…” porque o estado inicial é `undefined`. O efeito começou depois dessa renderização, não antes. E quando a promise foi resolvida, `establecerTotal(2)` provocou uma segunda renderização com o valor novo. Observe também o que a figura não faz: não usa `setTimeout` dentro do componente nem chama `contarServicios()` no corpo da função. Se você a chamasse no corpo, ela seria executada a cada renderização, e como cada resposta muda o estado e provoca outra renderização, você teria um laço de requisições.

Há uma armadilha que convém nomear agora. Um efeito que pede dados pode terminar depois de o componente já não existir: a pessoa mudou de tela ou, nos testes, você desmontou a árvore. Se a resposta chega então e chama `establecerTotal`, você tenta atualizar um componente que não está lá. A defesa é a limpeza do efeito: o painel cria um `AbortController` em cada efeito, entrega seu sinal ao `fetch` e o aborta na função de limpeza, exatamente o mecanismo de cancelamento que você conhece da lição 5, que agora cumpre uma tarefa nova. E quando a requisição é abortada, o `catch` o reconhece com `control.signal.aborted` e não escreve nenhum estado de erro: ser cancelado não é uma falha.

### Tipos compartilhados: um contrato, dois lados

A lição 8 criou `src/contrato.ts` com três peças: o tipo `EstadoPublico`, o tipo `ReportePublico` e a guarda `esReportePublico`. O servidor as usa para construir sua resposta (`aReportePublico` devolve um `ReportePublico`) e o painel as usa para recebê-la. Essa é a forma concreta de “tipos compartilhados front–back”: não um pacote publicado, nem uma ferramenta de geração de código, mas um arquivo do mesmo projeto que ambos os lados importam.

Duas regras fazem isso funcionar. A primeira: o arquivo compartilhado só contém o que faz sentido nos dois ambientes. `contrato.ts` importa apenas `esRegistro` de `configuracion.ts`, uma função pura sem dependências do Node. Se importasse `node:fs` ou `node:http`, o empacotador tentaria levá-lo ao navegador, que não tem esses módulos, e o empacotamento falharia ou, pior, produziria um pacote quebrado. A palavra “compartilhado” não autoriza a compartilhar código que só serve no Node, nem que o navegador arraste funções que leem arquivos ou segredos. Compartilhe tipos e transformações puras; deixe as fronteiras de rede, disco e ambiente em suas camadas.

A segunda regra: o compartilhado é o contrato público, não o modelo interno. Se o painel importasse `Estado`, com seu `Servicio`, o servidor teria que serializar a URL de cada serviço para que a resposta cumprisse esse tipo, ou o painel ficaria convencido de que recebe dados que a rede na verdade não traz; em ambos os casos o tipo interno estaria ditando o que é publicado. Se alguém mudar `duracionMs` para `duracion` em `contrato.ts`, o TypeScript apontará tanto o conversor do servidor, `aEstadoPublico`, quanto a linha do painel que lê o campo anterior. Esse é o benefício: o desacordo é detectado ao compilar, não ao ver uma tela vazia em produção.

Mesmo assim, um tipo não valida nada em tempo de execução. Quando o navegador recebe o corpo de `GET /api/estados`, `await respuesta.json()` entrega um valor de uma fronteira externa, e a tentação é escrever isto:

```ts
const reporte = (await respuesta.json()) as ReportePublico;
```

A asserção não inspeciona a resposta. Se uma versão antiga da API devolve `codigo` em vez de `codigoHttp`, ou se um proxy devolve uma página HTML com código 200, a tela compila e falha depois. O painel conserva a prática da lição 6: recebe `unknown`, chama `esReportePublico` e só então produz um `ReportePublico`. Antes de parsear, além disso, verifica o código HTTP: uma resposta `503` pode trazer um JSON válido e não ser o relatório que o painel esperava. **Parsear** é transformar uma representação serializada, como um texto JSON, em valores de JavaScript, que você ainda precisa validar. Não converta uma resposta malsucedida em uma lista vazia: isso faria uma falha da API parecer “está tudo bem, mas não há serviços”.

Essa validação ocorre uma vez, em `cargar.ts`, junto à chamada HTTP. `Panel` não recebe `unknown` nem pergunta se `reporte.estados` é um array. Um componente que faz validação de rede, ordenação, formatação e JSX ao mesmo tempo acaba difícil de testar e de ler. A camada que obtém dados responde “a resposta cumpre o contrato?”; o painel responde “como se mostra um contrato já confiável?”. E essa separação abre uma porta que você usará nos testes: `Panel` não sabe de onde vêm os dados; recebe uma função `cargar`, de modo que um teste lhe entrega uma função controlada e o programa real lhe entrega `cargarReporte`.

### XSS: texto externo não deve virar instruções

O XSS ocorre quando dados que outra parte controla acabam interpretados como HTML ou JavaScript dentro de uma página. Uma falha parece uma origem inocente: um serviço remoto devolve um texto de erro, o `revisor` o conserva como `detalle` e o painel o mostra. Mas esse texto é escrito por quem controla o serviço remoto, e poderia ser `<img src=x onerror=alert(1)>`. Se o painel insere essa string como HTML, o navegador cria um elemento `img`, a imagem não carrega e o atributo `onerror` executa código na página, com as permissões de quem a tem aberta.

A defesa principal é manter o tipo semântico correto. Um detalhe é texto; portanto, deve ser um filho de JSX, como `{detalle}`. O React o trata como texto e escapa os caracteres que significam algo para o HTML: `<` vira `&lt;`, `>` vira `&gt;`, `&` vira `&amp;`. A figura seguinte demonstra: embora a entrada contenha uma tag, a saída contém `&lt;` e `&gt;`, que o navegador mostra como caracteres visíveis em vez de interpretar como uma imagem.

```tsx
// fig09_03.tsx
import { renderToStaticMarkup } from "react-dom/server";

function Detalle({ texto }: { readonly texto: string }) {
  return <p>{texto}</p>;
}

const detalleExterno = "<img src=x onerror=alert(1)>";

console.log(renderToStaticMarkup(<Detalle texto={detalleExterno} />));
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext --jsx react-jsx fig09_03.tsx
$ node fig09_03.js
<p>&lt;img src=x onerror=alert(1)&gt;</p>
```

Compare com a alternativa. O React tem uma propriedade que se chama, de propósito, `dangerouslySetInnerHTML`: “definir HTML de forma perigosa”. Seu nome existe para detê-lo antes de usá-la. O React não pode saber se o HTML que você lhe dá foi gerado por uma fonte confiável, limpo por um sanitizador atualizado ou veio de uma rede sem validar; então deixa de escapar e o insere tal qual. A mesma figura, com essa propriedade, produz outra coisa:

```tsx
// fig09_04.tsx
import { renderToStaticMarkup } from "react-dom/server";

function DetalleInseguro({ texto }: { readonly texto: string }) {
  return <p dangerouslySetInnerHTML={{ __html: texto }} />;
}

const detalleExterno = "<img src=x onerror=alert(1)>";

console.log(renderToStaticMarkup(<DetalleInseguro texto={detalleExterno} />));
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext --jsx react-jsx fig09_04.tsx
$ node fig09_04.js
<p><img src=x onerror=alert(1)></p>
```

Essa segunda saída é o defeito. A tag `img` já não está escrita como texto: é um elemento que o navegador vai criar. O mesmo ocorre sem o React: atribuir a `elemento.innerHTML` um texto que vem de fora tem exatamente o mesmo problema, e por isso tampouco deve aparecer no painel. Quando o que você precisa é mostrar texto sem o React, `elemento.textContent = texto` faz a coisa certa, porque o navegador não interpreta o que você atribui por essa via.

Um erro comum é escrever uma função caseira que substitui apenas `<script>` ou elimina uma palavra concreta. O HTML tem atributos de eventos, URLs com esquema `javascript:`, entidades, SVG, estilos e variações de codificação; uma lista incompleta de substituições cria uma falsa sensação de segurança. Se algum produto realmente precisa mostrar HTML alheio, por exemplo conteúdo editorial com negritos, a resposta é um **sanitizador** mantido e testado, que percorre o HTML e deixa apenas um subconjunto permitido de tags e atributos, aplicado antes do ponto de renderização e com testes com entradas hostis. Para os detalhes operacionais do `revisor` esse requisito não existe, e o design correto é não interpretar HTML em absoluto.

Como uma regra que ninguém vigia é esquecida, o projeto a converte em uma verificação automática. O `eslint.config.js` desta lição acrescenta a regra `no-restricted-syntax` com dois seletores: um proíbe o atributo `dangerouslySetInnerHTML` e outro a atribuição a `innerHTML`. Se alguém escrever qualquer uma das duas coisas, `npm run lint` falha com a mensagem que você escreveu. Isto é o que ele imprime com um arquivo de teste, `src/panel/Mala.tsx`, que contém as duas coisas (apague-o depois):

```tsx
export function Mala({ texto }: { readonly texto: string }) {
  return <p dangerouslySetInnerHTML={{ __html: texto }} />;
}

export function pintar(elemento: HTMLElement, texto: string): void {
  elemento.innerHTML = texto;
}
```

```text
$ npm run lint

> lint
> eslint src

/home/tu-usuario/proyectos/revisor/src/panel/Mala.tsx
  2:13  error  No insertes HTML sin sanitizar: usa texto como hijo de JSX      no-restricted-syntax
  6:3   error  No asignes innerHTML: usa textContent o un componente de React  no-restricted-syntax

✖ 2 problems (2 errors, 0 warnings)
```

Uma regra de lint não é uma defesa completa: não enxerga uma atribuição feita por outra via, e alguém pode desativá-la. Por isso o projeto acrescenta uma segunda camada que não depende de ninguém se lembrar de nada: uma **política de segurança de conteúdo**, ou CSP (*Content Security Policy*). É um cabeçalho da resposta que diz ao navegador que recursos ele tem permissão de carregar ou executar naquela página. O servidor a envia com a página: `default-src 'none'` proíbe tudo por padrão, e depois é permitido apenas o que o painel precisa: `script-src 'self'` (somente scripts servidos da mesma origem da página, o que bloqueia um `<script>` ou um `onerror` inserido em linha), `style-src 'self'`, e `connect-src 'self'` (o painel só pode fazer `fetch` para sua própria origem). Além disso, `frame-ancestors 'none'` impede que outra página coloque a sua em um frame, `base-uri 'none'` bloqueia que se mude a base dos caminhos relativos e `form-action 'none'` evita que um formulário injetado envie dados a outro site. A CSP não muda o fato de que uma inserção insegura é um defeito; é a rede sob o trapezista, não uma permissão para deixar de olhar.

Restam dois lembretes. Primeiro, se o painel algum dia mostrar uma URL, não construa atributos concatenando strings: passe o valor como propriedade do JSX e valide o protocolo que o seu produto permite, porque um `href` com `javascript:` executa código mesmo sem conter nenhuma tag. Os tipos descrevem texto; a política de segurança decide que texto é um destino permitido. Segundo, o contrato público já faz a sua parte: a URL interna de cada serviço não chega ao painel, o que reduz tanto a exposição de infraestrutura quanto a quantidade de texto externo que poderia tocar a página. A segurança não é uma linha de código no final; começa por decidir que valores cruzam cada fronteira.

### O painel por dentro

O painel são quatro arquivos pequenos em `src/panel/`, mais uma folha de estilos. Convém lê-los na ordem em que o navegador os usa.

`cargar.ts` é a fronteira de rede do painel. Define o tipo `Cargar`, uma função que recebe um `AbortSignal` e devolve uma promise com um `ReportePublico`, e a implementação real, `cargarReporte`. Esta pede `/api/estados` com o sinal, verifica `respuesta.ok` e lança “la API respondió 503” se não for, converte o corpo com `respuesta.json()` para `unknown` (uma anotação, sem asserção) e o passa por `esReportePublico`; se falha, lança “la API no entregó un reporte válido”. O segundo parâmetro, `base`, vale `""` no navegador, onde `/api/estados` é resolvido contra a página que o carregou, e os testes o usam para apontar para um servidor local com seu endereço completo. Os três desfechos (relatório, código inválido, contrato descumprido) têm um teste, `cargar.test.ts`, contra um servidor HTTP real que responde o que cada caso precisa.

`useReporte.ts` é um hook próprio, ou seja, uma função cujo nome começa com `use` e que combina outros hooks. Declara o tipo `Carga` como uma união discriminada de três alternativas: `cargando`, `listo` com o relatório e `error` com o detalhe. É o padrão da lição 3 aplicado ao estado de uma tela, e tem a mesma vantagem: é impossível representar “listo” sem relatório, ou “error” sem detalhe. O hook guarda esse estado com `useState`, e um número `intento` que só serve para pedir ao efeito que se repita. O efeito cria um `AbortController`, define `pedir`, que chama `cargar(control.signal)` e guarda `listo` ou `error`, a executa uma vez, agenda `setInterval` para repeti-la a cada `cadaMs` milissegundos, e devolve a limpeza que aborta a requisição e detém o temporizador. Devolve o estado e `recargar`, que coloca a carga em `cargando` e aumenta `intento`; como `intento` está na lista de dependências, o efeito é limpo e repetido.

A lista de dependências, `[cargar, cadaMs, intento]`, merece uma pausa porque é onde se escondem os erros sutis. `cargar` está ali porque o efeito a usa: se mudasse, o efeito deve se repetir com a nova. Isso exige que quem chama passe uma função estável: se `Panel` recebesse uma função nova a cada renderização, o efeito se repetiria a cada renderização e você teria o laço de requisições que já conhece. `cliente.tsx` monta a aplicação uma única vez com `render(...)`, e não volta a ser executado: a arrow function que passa como propriedade é criada essa única vez e é a mesma durante toda a vida do painel. Se ela fosse criada por um componente que é renderizado muitas vezes, você teria que fixá-la com `useCallback` ou declará-la fora dele. O ESLint, neste projeto, não revisa listas de dependências; o pacote oficial que faz isso é o `eslint-plugin-react-hooks`, e é uma boa instalação seguinte para um projeto de React maior.

`Panel.tsx` é só apresentação. `Contenido` recebe um `Carga` e escolhe o que desenhar com um `switch` cujo `default` usa a guarda `never` da lição 3: se amanhã você acrescentar a alternativa `vacio` a `Carga` e esquecer de desenhá-la, o compilador avisa. Cada tela leva um atributo `role` (`status` para “Cargando…” e `alert` para o erro) que serve aos leitores de tela para anunciá-los, e aos testes para encontrá-los sem depender do texto exato. `FilaEstado` é a da figura 1, agora com `duracionMs` e uma classe CSS por tipo. `Panel` junta o hook, o conteúdo e um botão “Actualizar” que chama `recargar`. Cada linha leva como `key` a posição junto com o nome: `servicios.json` não obriga que os nomes sejam únicos, e duas linhas com a mesma chave confundiriam o React; como a lista é substituída inteira a cada carga e as linhas não guardam estado, a posição não causa nenhum problema.

`cliente.tsx` é o único arquivo que toca o documento. Procura o elemento `#raiz`, falha de forma explícita se ele não existe e monta o painel com `createRoot(raiz).render(...)`. É a fronteira entre o React e a página, e por isso é a única coisa que os testes de componentes não importam: os testes montam `Panel` por conta própria, em um documento simulado.

A folha `panel.css` é CSS comum e não toca o TypeScript, com uma decisão deliberada: não há atributos `style` no JSX. Um atributo `style` em linha violaria a política `style-src 'self'` que o servidor envia, porque o navegador trata o estilo em linha como código que não vem da origem. Todo o aspecto vive na folha, que o navegador carrega da mesma origem.

### Do código ao navegador: empacotar com o esbuild

Até agora tudo o que você compilou roda no Node. O painel roda em um navegador, e um navegador não sabe executar `.tsx`, nem resolver `import { createRoot } from "react-dom/client"`, que é o nome de um pacote e não o caminho de um arquivo. É preciso produzir um único arquivo de JavaScript que o navegador possa carregar com uma tag `<script>`. Essa tarefa se chama **empacotar**, e é feita por um **empacotador** (*bundler*): parte de um arquivo de entrada, segue todos os `import`, junta o que encontra e escreve o resultado.

O projeto usa o esbuild, um empacotador de código aberto, muito rápido, cuja documentação oficial está em `esbuild.github.io`. O script `empaquetar` é uma única linha:

```text
esbuild src/panel/cliente.tsx src/panel/panel.css --bundle --minify --format=iife --log-level=warning --outdir=dist/publico
```

Cada opção tem um motivo. Os dois primeiros argumentos são os arquivos de entrada: o programa do painel e a folha de estilos. `--bundle` é o que faz o esbuild seguir os `import`, incluindo os de `react` e `react-dom`, e incluí-los na saída; sem essa opção, ele apenas traduziria o arquivo e deixaria o `import` de um pacote que o navegador não poderia resolver. `--minify` remove espaços e encurta nomes para que o arquivo pese menos, e tem um efeito que importa: quando é usado, o esbuild define `process.env.NODE_ENV` como `"production"`, e o React inclui então sua versão de produção, sem as verificações e avisos de desenvolvimento. `--format=iife` escreve o resultado como uma função que é executada imediatamente; funciona com um `<script>` comum, sem depender de módulos do navegador. `--log-level=warning` silencia as mensagens informativas e deixa apenas avisos e erros. `--outdir=dist/publico` coloca o resultado em `dist/publico/`, que é o que o servidor lê: `cliente.js` e `panel.css`.

Há uma consequência que desconcerta se não for dita. O esbuild converte TypeScript em JavaScript apagando os tipos, mas não os verifica. Quem verifica os tipos continua sendo o `tsc`: por isso `npm run verificar` existe e por isso `npm run empaquetar` pode empacotar um arquivo com erros de tipo sem reclamar. Os dois comandos fazem trabalhos diferentes: um responde se o programa está correto, o outro produz o que é entregue. Um pipeline que apenas empacotasse não teria verificado nada.

Outra consequência: o mesmo `tsconfig.json` agora compila ao mesmo tempo o servidor e o painel. Por isso inclui `"jsx": "react-jsx"` e `"lib": ["ES2022", "DOM"]`, que declara os tipos do navegador (`document`, `window`, `HTMLElement`). É uma simplificação com um custo: o código do servidor também “enxerga” `document`, e um descuido que o use compilaria e falharia ao executar. Em um projeto maior são separados em duas configurações, uma para o servidor e outra para o painel, que compartilham o arquivo `contrato.ts`; aqui uma só mantém a lição focada.

Repare, por fim, onde ficam o React e o React DOM. Como o empacotador os copia para dentro de `cliente.js`, o servidor que roda em produção não os importa: são instalados com `--save-dev`, porque só são necessários para construir e para testar. É uma diferença contraintuitiva em relação a uma aplicação que renderiza no servidor, e tem uma consequência prática que você verá em “Compilar e publicar”: o artefato de produção não precisa de nenhuma dependência.

### O servidor serve o painel

Na lição 8, `crearServidor` recebia duas coisas: uma função que obtém o relatório e um log. Agora recebe uma terceira, `leerActivo`, a função que entrega o conteúdo dos dois arquivos que o empacotador produz. Um **ativo** (*asset*) é um arquivo estático que o servidor entrega tal qual, como um script ou uma folha de estilos. O tipo `Activo` é a união `"cliente.js" | "panel.css"`: não há maneira de pedir um arquivo que não esteja nessa lista. Essa é a defesa contra uma vulnerabilidade clássica, o **percurso de caminhos** (*path traversal*): um servidor que monta o caminho de um arquivo com o que chega na URL, como `/../../etc/passwd`, acaba entregando arquivos que nunca quis publicar. Aqui a URL só é comparada com duas rotas conhecidas e o nome do arquivo é decidido pelo programa, não pelo cliente; qualquer outra rota é um `404` da mesma `Ruta` da lição 8. `main.ts` entrega a implementação real, `readFile` sobre `dist/publico/<activo>`, resolvida com `import.meta.url` para que funcione independentemente de que pasta você inicie o processo.

A união `Ruta` cresce com duas alternativas, `pagina` para `GET /` e `activo` para os dois arquivos, e o `switch` com `never` faz o compilador obrigar você a atender cada uma. A página, `pagina.ts`, é um documento HTML mínimo guardado como constante de texto: um `<div id="raiz">`, o link para `/panel.css` e o `<script src="/cliente.js" defer>`. O atributo `defer` faz o navegador executar o script quando termina de ler o documento, de modo que `#raiz` já existe.

As respostas ganham cabeçalhos de segurança. Todas levam `x-content-type-options: nosniff`, que proíbe o navegador de adivinhar um tipo de conteúdo diferente do declarado (sem ele, um navegador poderia tratar um texto como script). A página leva além disso a política CSP da seção anterior. As respostas JSON levam `cache-control: no-store`, porque o estado dos serviços muda e ninguém deveria ver um relatório guardado na memória de um intermediário. E se ler um ativo falha, por exemplo porque você esqueceu de executar `npm run empaquetar`, o erro é registrado no log com sua causa e o cliente recebe um `500` genérico, como na lição 8.

Uma decisão que convém deixar dita: o painel e a API compartilham origem, ou seja, a mesma combinação de esquema, servidor e porta. Por isso o `fetch("/api/estados")` do painel não precisa de **CORS**, a política do navegador que decide se uma página de uma origem pode ler respostas de outra, e que se configura com cabeçalhos como `Access-Control-Allow-Origin`. Enquanto painel e API saírem do mesmo processo, não há nada a configurar; se algum dia você os separar, esse será o primeiro problema que encontrará, e a resposta correta é declarar de forma explícita as origens permitidas, não responder `*` por comodidade.

### O `revisor` terminado: montagem e testes

Agora estão todas as peças. O projeto completo é o seguinte. Cada arquivo aparece uma vez; os que não mudaram desde a lição 8 levam a mesma explicação de lá e estão no final.

Primeiro, a configuração do projeto. O `package.json` ganha o script `empaquetar` e as novas dependências de desenvolvimento, com versão exata. Instale-as a partir da raiz de `revisor/` com este comando; o npm as adiciona a `devDependencies`. O script `empaquetar` você acrescenta à mão, e as versões das dependências da lição 7 podem aparecer com `^` no seu arquivo: não importa, o `package-lock.json` fixa o que foi instalado, mas você pode deixar o `package.json` igual ao de baixo se quiser.

```bash
npm install --save-dev --save-exact react@19.3.0 react-dom@19.3.0 @types/react@19.3.0 @types/react-dom@19.3.0 esbuild@0.28.2 jsdom@29.1.1 @types/jsdom@28.0.3
```

```json fig09_05/package.json
{
  "name": "revisor",
  "private": true,
  "type": "module",
  "scripts": {
    "compilar": "tsc",
    "verificar": "tsc --noEmit",
    "empaquetar": "esbuild src/panel/cliente.tsx src/panel/panel.css --bundle --minify --format=iife --log-level=warning --outdir=dist/publico",
    "arrancar": "node dist/main.js",
    "probar": "npm run compilar && node --test \"dist/**/*.test.js\"",
    "lint": "eslint src",
    "formato": "prettier --check src"
  },
  "devDependencies": {
    "@eslint/js": "10.0.1",
    "@types/jsdom": "28.0.3",
    "@types/node": "24",
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "@typescript/native": "npm:typescript@^7.0.2",
    "esbuild": "0.28.2",
    "eslint": "10.11.0",
    "jsdom": "29.1.1",
    "prettier": "3.9.9",
    "react": "19.3.0",
    "react-dom": "19.3.0",
    "typescript": "npm:@typescript/typescript6@^6.0.2",
    "typescript-eslint": "8.71.0"
  }
}
```
```json fig09_05/tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "rootDir": "./src",
    "outDir": "./dist",
    "types": ["node"],
    "lib": ["ES2022", "DOM"],
    "jsx": "react-jsx",
    "sourceMap": true
  },
  "include": ["src"]
}
```
```js fig09_05/eslint.config.js
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(js.configs.recommended, ...tseslint.configs.recommended, {
  rules: {
    "no-restricted-syntax": [
      "error",
      {
        selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
        message: "No insertes HTML sin sanitizar: usa texto como hijo de JSX.",
      },
      {
        selector: "AssignmentExpression[left.property.name='innerHTML']",
        message: "No asignes innerHTML: usa textContent o un componente de React.",
      },
    ],
  },
});
```
O contrato compartilhado e o painel. `contrato.ts` é o da lição 8, sem mudanças; é mostrado aqui porque agora os dois lados o importam.

```ts
// fig09_05/src/contrato.ts
import { esRegistro } from "./configuracion.js";

export type EstadoPublico =
  | {
      readonly nombre: string;
      readonly tipo: "disponible";
      readonly codigoHttp: number;
      readonly duracionMs: number;
    }
  | {
      readonly nombre: string;
      readonly tipo: "falla";
      readonly detalle: string;
    };

export interface ReportePublico {
  readonly estados: readonly EstadoPublico[];
}

function esEstadoPublico(valor: unknown): valor is EstadoPublico {
  if (!esRegistro(valor) || typeof valor.nombre !== "string") {
    return false;
  }

  if (valor.tipo === "disponible") {
    return typeof valor.codigoHttp === "number" && typeof valor.duracionMs === "number";
  }

  return valor.tipo === "falla" && typeof valor.detalle === "string";
}

export function esReportePublico(valor: unknown): valor is ReportePublico {
  return esRegistro(valor) && Array.isArray(valor.estados) && valor.estados.every(esEstadoPublico);
}
```
```ts
// fig09_05/src/panel/cargar.ts
import { esReportePublico, type ReportePublico } from "../contrato.js";

export type Cargar = (senal: AbortSignal) => Promise<ReportePublico>;

export async function cargarReporte(senal: AbortSignal, base = ""): Promise<ReportePublico> {
  const respuesta = await fetch(`${base}/api/estados`, { signal: senal });

  if (!respuesta.ok) {
    throw new Error(`la API respondió ${respuesta.status}`);
  }

  const cuerpo: unknown = await respuesta.json();

  if (!esReportePublico(cuerpo)) {
    throw new Error("la API no entregó un reporte válido");
  }

  return cuerpo;
}
```
```ts
// fig09_05/src/panel/useReporte.ts
import { useEffect, useState } from "react";
import type { ReportePublico } from "../contrato.js";
import type { Cargar } from "./cargar.js";

export type Carga =
  | { readonly tipo: "cargando" }
  | { readonly tipo: "listo"; readonly reporte: ReportePublico }
  | { readonly tipo: "error"; readonly detalle: string };

export function useReporte(
  cargar: Cargar,
  cadaMs: number,
): { readonly carga: Carga; readonly recargar: () => void } {
  const [carga, establecerCarga] = useState<Carga>({ tipo: "cargando" });
  const [intento, establecerIntento] = useState(0);

  useEffect(() => {
    const control = new AbortController();

    async function pedir(): Promise<void> {
      try {
        const reporte = await cargar(control.signal);
        establecerCarga({ tipo: "listo", reporte });
      } catch (error: unknown) {
        if (control.signal.aborted) {
          return;
        }

        const detalle = error instanceof Error ? error.message : "falló la carga";
        establecerCarga({ tipo: "error", detalle });
      }
    }

    void pedir();
    const temporizador = setInterval(() => void pedir(), cadaMs);

    return () => {
      control.abort();
      clearInterval(temporizador);
    };
  }, [cargar, cadaMs, intento]);

  function recargar(): void {
    establecerCarga({ tipo: "cargando" });
    establecerIntento((actual) => actual + 1);
  }

  return { carga, recargar };
}
```
```tsx
// fig09_05/src/panel/Panel.tsx
import type { EstadoPublico } from "../contrato.js";
import type { Cargar } from "./cargar.js";
import { useReporte, type Carga } from "./useReporte.js";

function FilaEstado({ estado }: { readonly estado: EstadoPublico }) {
  if (estado.tipo === "disponible") {
    return (
      <li className="disponible">
        <strong>{estado.nombre}</strong>: disponible (HTTP {estado.codigoHttp}, {estado.duracionMs}{" "}
        ms)
      </li>
    );
  }

  return (
    <li className="falla">
      <strong>{estado.nombre}</strong>: falla ({estado.detalle})
    </li>
  );
}

function Contenido({ carga }: { readonly carga: Carga }) {
  switch (carga.tipo) {
    case "cargando":
      return <p role="status">Cargando…</p>;
    case "error":
      return <p role="alert">No se pudo cargar el reporte: {carga.detalle}</p>;
    case "listo":
      return (
        <ul>
          {carga.reporte.estados.map((estado, posicion) => (
            <FilaEstado key={`${posicion}-${estado.nombre}`} estado={estado} />
          ))}
        </ul>
      );
    default: {
      const sinAtender: never = carga;
      throw new Error(`carga sin atender: ${JSON.stringify(sinAtender)}`);
    }
  }
}

export function Panel({
  cargar,
  cadaMs = 10_000,
}: {
  readonly cargar: Cargar;
  readonly cadaMs?: number;
}) {
  const { carga, recargar } = useReporte(cargar, cadaMs);

  return (
    <main>
      <h1>Revisor</h1>
      <Contenido carga={carga} />
      <button type="button" onClick={recargar}>
        Actualizar
      </button>
    </main>
  );
}
```
```tsx
// fig09_05/src/panel/cliente.tsx
import { createRoot } from "react-dom/client";
import { cargarReporte } from "./cargar.js";
import { Panel } from "./Panel.js";

const raiz = document.getElementById("raiz");

if (raiz === null) {
  throw new Error("falta el elemento #raiz en la página");
}

createRoot(raiz).render(<Panel cargar={(senal) => cargarReporte(senal)} />);
```
```css fig09_05/src/panel/panel.css
body {
  font-family: system-ui, sans-serif;
  margin: 2rem auto;
  max-width: 40rem;
  padding: 0 1rem;
}

ul {
  list-style: none;
  padding: 0;
}

li {
  border-left: 0.5rem solid #888;
  margin: 0.5rem 0;
  padding: 0.5rem 0.75rem;
}

li.disponible {
  border-color: #1a7f37;
}

li.falla {
  border-color: #cf222e;
}
```
O servidor, sua página e o ponto de entrada.

```ts
// fig09_05/src/pagina.ts
export const paginaInicial = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Revisor</title>
    <link rel="stylesheet" href="/panel.css" />
  </head>
  <body>
    <div id="raiz"></div>
    <script src="/cliente.js" defer></script>
  </body>
</html>
`;
```
```ts
// fig09_05/src/servidor.ts
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { Bitacora } from "./bitacora.js";
import type { ReportePublico } from "./contrato.js";
import { paginaInicial } from "./pagina.js";

export type ObtenerReporte = () => Promise<ReportePublico>;
export type Activo = "cliente.js" | "panel.css";
export type LeerActivo = (activo: Activo) => Promise<string>;

export interface OpcionesServidor {
  readonly obtenerReporte: ObtenerReporte;
  readonly leerActivo: LeerActivo;
  readonly registrar: Bitacora;
}

type Ruta =
  | { readonly tipo: "pagina" }
  | { readonly tipo: "activo"; readonly activo: Activo }
  | { readonly tipo: "salud" }
  | { readonly tipo: "estados" }
  | { readonly tipo: "no-encontrada" };

const POLITICA_PAGINA = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "connect-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join("; ");

function rutaDe(url: string | undefined): string {
  try {
    return new URL(url ?? "/", "http://revisor.local").pathname;
  } catch {
    return "?";
  }
}

function reconocerRuta(url: string | undefined): Ruta {
  switch (rutaDe(url)) {
    case "/":
      return { tipo: "pagina" };
    case "/cliente.js":
      return { tipo: "activo", activo: "cliente.js" };
    case "/panel.css":
      return { tipo: "activo", activo: "panel.css" };
    case "/salud":
      return { tipo: "salud" };
    case "/api/estados":
      return { tipo: "estados" };
    default:
      return { tipo: "no-encontrada" };
  }
}

function enviar(
  respuesta: ServerResponse,
  codigo: number,
  tipo: string,
  cuerpo: string,
  extra: Record<string, string> = {},
): void {
  respuesta.writeHead(codigo, {
    "content-type": tipo,
    "x-content-type-options": "nosniff",
    ...extra,
  });
  respuesta.end(cuerpo);
}

function enviarJson(respuesta: ServerResponse, codigo: number, cuerpo: unknown): void {
  enviar(respuesta, codigo, "application/json; charset=utf-8", JSON.stringify(cuerpo), {
    "cache-control": "no-store",
  });
}

function errorInterno(opciones: OpcionesServidor, respuesta: ServerResponse, error: unknown): void {
  opciones.registrar({
    evento: "error",
    detalle: error instanceof Error ? error.message : "falla desconocida",
  });
  enviarJson(respuesta, 500, { detalle: "error interno" });
}

async function atender(
  solicitud: IncomingMessage,
  respuesta: ServerResponse,
  opciones: OpcionesServidor,
): Promise<void> {
  const inicio = performance.now();

  respuesta.once("finish", () => {
    const duracion = Math.round(performance.now() - inicio);

    opciones.registrar({
      evento: "solicitud",
      detalle: `${solicitud.method ?? "?"} ${rutaDe(solicitud.url)} ${respuesta.statusCode} ${duracion} ms`,
    });
  });

  if (solicitud.method !== "GET") {
    respuesta.setHeader("allow", "GET");
    enviarJson(respuesta, 405, { detalle: "método no permitido" });
    return;
  }

  const ruta = reconocerRuta(solicitud.url);

  switch (ruta.tipo) {
    case "pagina":
      enviar(respuesta, 200, "text/html; charset=utf-8", paginaInicial, {
        "content-security-policy": POLITICA_PAGINA,
      });
      return;
    case "activo":
      try {
        const tipo = ruta.activo === "cliente.js" ? "text/javascript" : "text/css";
        enviar(respuesta, 200, `${tipo}; charset=utf-8`, await opciones.leerActivo(ruta.activo));
      } catch (error: unknown) {
        errorInterno(opciones, respuesta, error);
      }
      return;
    case "salud":
      enviar(respuesta, 200, "text/plain; charset=utf-8", "ok");
      return;
    case "estados":
      try {
        enviarJson(respuesta, 200, await opciones.obtenerReporte());
      } catch (error: unknown) {
        errorInterno(opciones, respuesta, error);
      }
      return;
    case "no-encontrada":
      enviarJson(respuesta, 404, { detalle: "ruta no encontrada" });
      return;
    default: {
      const sinAtender: never = ruta;
      throw new Error(`ruta sin atender: ${JSON.stringify(sinAtender)}`);
    }
  }
}

export function crearServidor(opciones: OpcionesServidor): Server {
  return createServer((solicitud, respuesta) => {
    atender(solicitud, respuesta, opciones).catch((error: unknown) => {
      opciones.registrar({
        evento: "error",
        detalle: error instanceof Error ? error.message : "falla desconocida",
      });

      if (respuesta.headersSent) {
        respuesta.end();
      } else {
        enviarJson(respuesta, 500, { detalle: "error interno" });
      }
    });
  });
}

export function escuchar(servidor: Server, puerto: number): Promise<void> {
  return new Promise((resolve, reject) => {
    servidor.once("error", reject);
    servidor.listen(puerto, "127.0.0.1", () => {
      servidor.off("error", reject);
      resolve();
    });
  });
}

export function cerrar(servidor: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    servidor.close((error) => {
      if (error === undefined) {
        resolve();
      } else {
        reject(error);
      }
    });
  });
}

export function puertoDe(servidor: Server): number {
  const direccion = servidor.address();

  if (direccion === null || typeof direccion === "string") {
    throw new Error("el servidor no escucha en un puerto TCP");
  }

  return direccion.port;
}
```
```ts
// fig09_05/src/main.ts
import { readFile } from "node:fs/promises";
import { leerServiciosDeArchivo } from "./archivo.js";
import { bitacoraEnConsola as registrar } from "./bitacora.js";
import { leerPuerto } from "./configuracion.js";
import { consultarConFetch } from "./consulta.js";
import { aReportePublico } from "./reporte.js";
import { revisarTodos } from "./revisar.js";
import { cerrar, crearServidor, escuchar, puertoDe } from "./servidor.js";

function fallarArranque(evento: string, detalle: string): void {
  registrar({ evento, detalle });
  process.exitCode = 1;
}

async function main(): Promise<void> {
  const puerto = leerPuerto(process.env.PUERTO);

  if (!puerto.ok) {
    fallarArranque("configuracion-invalida", puerto.detalle);
    return;
  }

  const servicios = await leerServiciosDeArchivo("servicios.json");

  if (!servicios.ok) {
    fallarArranque("configuracion-invalida", servicios.detalle);
    return;
  }

  const servidor = crearServidor({
    obtenerReporte: async () =>
      aReportePublico(await revisarTodos(servicios.valor, consultarConFetch)),
    leerActivo: (activo) => readFile(new URL(`./publico/${activo}`, import.meta.url), "utf8"),
    registrar,
  });

  try {
    await escuchar(servidor, puerto.valor);
  } catch (error: unknown) {
    fallarArranque(
      "arranque-fallido",
      error instanceof Error ? error.message : "falla desconocida",
    );
    return;
  }

  registrar({ evento: "escuchando", detalle: `http://127.0.0.1:${puertoDe(servidor)}` });

  let cierre: Promise<void> | undefined;

  const detener = (senal: string): void => {
    cierre ??= (async () => {
      registrar({ evento: "cierre", detalle: `${senal} recibida` });
      await cerrar(servidor);
      registrar({ evento: "cerrado", detalle: "el servidor dejó de aceptar conexiones" });
    })().catch((error: unknown) => {
      fallarArranque(
        "cierre-fallido",
        error instanceof Error ? error.message : "falla desconocida",
      );
    });
  };

  process.once("SIGTERM", () => detener("SIGTERM"));
  process.once("SIGINT", () => detener("SIGINT"));
}

await main();
```
Os testes são o que sustenta a afirmação “o painel funciona” sem abrir um navegador. Convém ler o que cada um demonstra, e o que não demonstra.

`Panel.test.tsx` monta o componente de verdade: instala um documento simulado do jsdom (`dom-de-prueba.ts`, como na figura 2), monta `Panel` com `createRoot` dentro de `act` e verifica quatro coisas. Que se vê “Cargando…” enquanto a promise de `cargar` continua pendente e que, ao resolvê-la, aparecem as duas linhas com seu texto. Que um `detalle` com HTML é mostrado como texto: procura um elemento `img` e não encontra nenhum, e verifica que o HTML resultante contém `&lt;img`. Que um erro da API é mostrado com `role="alert"` e que pressionar “Actualizar” (um clique real sobre o botão, dentro de `act`) pede de novo e recupera a lista. E que ao desmontar a árvore o sinal que `cargar` recebeu fica abortado. São os hooks de verdade: o efeito roda, o estado muda e o React desenha de novo; não há nenhuma função simulada do React.

`cargar.test.ts` verifica a camada de rede do painel contra um servidor HTTP local que responde o que cada caso precisa: um relatório válido, um `503` e um JSON que não cumpre o contrato.

`paquete.test.ts` é o teste de fumaça do conjunto, e o mais ambicioso. Constrói o painel com a API do esbuild, em memória e com as mesmas opções que `npm run empaquetar`; levanta o servidor do `revisor` com esses arquivos como ativos e um relatório que contém um `detalle` hostil (`<b>negrita</b>`); pede `/` e verifica que chega a política CSP completa, idêntica ao texto exato e sem nenhum `unsafe-` (relaxá-la por descuido deixa o teste vermelho); baixa `/cliente.js` tal como um navegador o receberia; abre a página em um documento simulado, executa esse script, que faz `fetch` à API de verdade, e espera que a linha apareça. Verifica que seu texto é literal, com as tags visíveis, e que nenhum elemento `b` foi criado. É o percurso completo: servidor, página, pacote, API, validação, React e escape, com os mesmos bytes que viajariam a um navegador. Uma ressalva do teste: o jsdom não traz `fetch`, então o teste instala um que resolve as rotas relativas contra o servidor local, e essa substituição descarta o segundo argumento, incluindo o sinal de cancelamento, porque o `AbortSignal` criado dentro do jsdom não é o do Node. O cancelamento não é testado aqui; o teste de `Panel.test.tsx`, que sim recebe o sinal do Node, é o que o verifica.

E o que nenhum desses testes demonstra: que um navegador real baixe e execute o pacote. O jsdom implementa o DOM, mas não é um navegador: não aplica o CSS, não impõe a política CSP e não tem um motor de renderização. Por isso, depois de construir, há uma verificação manual que não se automatiza e que convém fazer uma vez, como se explica abaixo.

Os testes que já existiam desde a lição 8 continuam ali: a tabela de `leerPuerto`, a de `esReportePublico` e as do servidor. No servidor só mudou sua construção, que agora recebe `leerActivo`. O bloco seguinte mostra todos os arquivos que não mudaram ou que mudaram em um detalhe pequeno.

```ts
// fig09_05/src/panel/dom-de-prueba.ts
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://127.0.0.1/",
});

Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  IS_REACT_ACT_ENVIRONMENT: true,
});

export const documento = dom.window.document;
```
```tsx
// fig09_05/src/panel/Panel.test.tsx
import { documento } from "./dom-de-prueba.js";
import assert from "node:assert/strict";
import test from "node:test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { ReportePublico } from "../contrato.js";
import type { Cargar } from "./cargar.js";
import { Panel } from "./Panel.js";

const reporte: ReportePublico = {
  estados: [
    { nombre: "catálogo", tipo: "disponible", codigoHttp: 200, duracionMs: 42 },
    { nombre: "pagos", tipo: "falla", detalle: "<img src=x onerror=alert(1)>" },
  ],
};

async function montar(cargar: Cargar): Promise<{ contenedor: HTMLElement; desmontar: () => void }> {
  const contenedor = documento.createElement("div");
  documento.body.append(contenedor);
  const raiz = createRoot(contenedor);

  await act(async () => {
    raiz.render(<Panel cargar={cargar} cadaMs={60_000} />);
  });

  return {
    contenedor,
    desmontar: () => {
      act(() => raiz.unmount());
      contenedor.remove();
    },
  };
}

test("muestra Cargando mientras la API no responde y luego las filas", async () => {
  let responder: (reporte: ReportePublico) => void = () => {};
  const cargar: Cargar = () =>
    new Promise((resolve) => {
      responder = resolve;
    });

  const { contenedor, desmontar } = await montar(cargar);
  assert.equal(contenedor.querySelector("[role=status]")?.textContent, "Cargando…");

  await act(async () => {
    responder(reporte);
  });

  const filas = [...contenedor.querySelectorAll("li")].map((fila) => fila.textContent);
  assert.deepEqual(filas, [
    "catálogo: disponible (HTTP 200, 42 ms)",
    "pagos: falla (<img src=x onerror=alert(1)>)",
  ]);
  desmontar();
});

test("un detalle con HTML se muestra como texto y no crea elementos", async () => {
  const { contenedor, desmontar } = await montar(async () => reporte);

  assert.equal(contenedor.querySelector("img"), null);
  assert.match(contenedor.innerHTML, /&lt;img src=x onerror=alert\(1\)&gt;/);
  desmontar();
});

test("muestra el error y se recupera al pulsar Actualizar", async () => {
  let intentos = 0;
  const cargar: Cargar = async () => {
    intentos += 1;

    if (intentos === 1) {
      throw new Error("la API respondió 503");
    }

    return reporte;
  };

  const { contenedor, desmontar } = await montar(cargar);
  assert.equal(
    contenedor.querySelector("[role=alert]")?.textContent,
    "No se pudo cargar el reporte: la API respondió 503",
  );

  await act(async () => {
    contenedor.querySelector("button")?.click();
  });

  assert.equal(contenedor.querySelector("[role=alert]"), null);
  assert.equal(contenedor.querySelectorAll("li").length, 2);
  assert.equal(intentos, 2);
  desmontar();
});

test("al desmontar cancela la solicitud en curso", async () => {
  let senalRecibida: AbortSignal | undefined;
  const cargar: Cargar = (senal) => {
    senalRecibida = senal;
    return new Promise(() => {});
  };

  const { desmontar } = await montar(cargar);
  assert.equal(senalRecibida?.aborted, false);
  desmontar();
  assert.equal(senalRecibida?.aborted, true);
});
```
```ts
// fig09_05/src/panel/cargar.test.ts
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import test from "node:test";
import { cerrar, escuchar, puertoDe } from "../servidor.js";
import { cargarReporte } from "./cargar.js";

async function servirRespuesta(
  codigo: number,
  cuerpo: string,
): Promise<{ readonly servidor: Server; readonly base: string }> {
  const servidor = createServer((_solicitud, respuesta) => {
    respuesta.writeHead(codigo, { "content-type": "application/json; charset=utf-8" });
    respuesta.end(cuerpo);
  });

  await escuchar(servidor, 0);
  return { servidor, base: `http://127.0.0.1:${puertoDe(servidor)}` };
}

const casos = [
  {
    nombre: "devuelve el reporte cuando la API responde con el contrato",
    codigo: 200,
    cuerpo: '{"estados":[{"nombre":"pagos","tipo":"falla","detalle":"HTTP 503"}]}',
    esperado: undefined,
  },
  {
    nombre: "rechaza un código HTTP que no es 2xx",
    codigo: 503,
    cuerpo: '{"detalle":"error interno"}',
    esperado: "la API respondió 503",
  },
  {
    nombre: "rechaza un JSON que no cumple el contrato",
    codigo: 200,
    cuerpo: '{"estados":[{"nombre":"pagos"}]}',
    esperado: "la API no entregó un reporte válido",
  },
] as const;

for (const caso of casos) {
  test(`cargarReporte: ${caso.nombre}`, async () => {
    const { servidor, base } = await servirRespuesta(caso.codigo, caso.cuerpo);

    try {
      const senal = new AbortController().signal;

      if (caso.esperado === undefined) {
        const reporte = await cargarReporte(senal, base);
        assert.equal(reporte.estados[0]?.nombre, "pagos");
      } else {
        await assert.rejects(cargarReporte(senal, base), { message: caso.esperado });
      }
    } finally {
      await cerrar(servidor);
    }
  });
}
```
```ts
// fig09_05/src/panel/paquete.test.ts
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { build } from "esbuild";
import { JSDOM } from "jsdom";
import { aReportePublico } from "../reporte.js";
import { cerrar, crearServidor, escuchar, puertoDe, type Activo } from "../servidor.js";

async function empaquetar(): Promise<Map<string, string>> {
  const resultado = await build({
    entryPoints: [
      fileURLToPath(new URL("../../src/panel/cliente.tsx", import.meta.url)),
      fileURLToPath(new URL("../../src/panel/panel.css", import.meta.url)),
    ],
    bundle: true,
    minify: true,
    format: "iife",
    outdir: "salida",
    write: false,
    logLevel: "silent",
  });

  return new Map(
    resultado.outputFiles.map((archivo) => [archivo.path.split("/").pop() ?? "", archivo.text]),
  );
}

async function esperar(condicion: () => boolean): Promise<void> {
  for (let intento = 0; intento < 100; intento += 1) {
    if (condicion()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  throw new Error("la condición no se cumplió a tiempo");
}

test("el paquete que sirve el servidor pinta el reporte en una página real", async () => {
  const archivos = await empaquetar();
  const api = crearServidor({
    obtenerReporte: async () =>
      aReportePublico([
        {
          servicio: { nombre: "catálogo", url: "https://catalogo.example", timeoutMs: 1500 },
          tipo: "falla",
          detalle: "<b>negrita</b>",
        },
      ]),
    leerActivo: async (activo: Activo) => archivos.get(activo) ?? "",
    registrar: () => {},
  });
  await escuchar(api, 0);
  const base = `http://127.0.0.1:${puertoDe(api)}`;

  try {
    const pagina = await fetch(`${base}/`);
    const politica = pagina.headers.get("content-security-policy") ?? "";
    assert.equal(
      politica,
      "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    );
    assert.doesNotMatch(politica, /unsafe-/);

    const script = await (await fetch(`${base}/cliente.js`)).text();
    const ventana = new JSDOM(await pagina.text(), { runScripts: "outside-only", url: base })
      .window;
    Object.assign(ventana, { fetch: (ruta: string) => fetch(new URL(ruta, base)) });
    ventana.eval(script);

    await esperar(() => ventana.document.querySelector("li") !== null);
    assert.equal(
      ventana.document.querySelector("li")?.textContent,
      "catálogo: falla (<b>negrita</b>)",
    );
    assert.equal(ventana.document.querySelector("b"), null);
    ventana.close();
  } finally {
    await cerrar(api);
  }
});
```
```ts
// fig09_05/src/servidor.test.ts
import assert from "node:assert/strict";
import { createServer, request, type Server } from "node:http";
import test from "node:test";
import type { EntradaBitacora } from "./bitacora.js";
import { esReportePublico } from "./contrato.js";
import { consultarConFetch } from "./consulta.js";
import type { Servicio } from "./modelo.js";
import { aReportePublico } from "./reporte.js";
import { revisarTodos } from "./revisar.js";
import { cerrar, crearServidor, escuchar, puertoDe } from "./servidor.js";

async function destino(): Promise<{ readonly servidor: Server; readonly base: string }> {
  const servidor = createServer((solicitud, respuesta) => {
    if (solicitud.url === "/ok") {
      respuesta.writeHead(200).end("ok");
    } else if (solicitud.url === "/caido") {
      respuesta.writeHead(503).end("caído");
    }
    // /lento nunca responde: sirve para provocar el tiempo límite.
  });

  await escuchar(servidor, 0);
  return { servidor, base: `http://127.0.0.1:${puertoDe(servidor)}` };
}

async function puertoCerrado(): Promise<number> {
  const servidor = createServer();
  await escuchar(servidor, 0);
  const puerto = puertoDe(servidor);
  await cerrar(servidor);
  return puerto;
}

test("GET /api/estados revisa destinos reales y publica el reporte", async () => {
  const { servidor: remoto, base } = await destino();
  const sinServicio = await puertoCerrado();
  const servicios: readonly Servicio[] = [
    { nombre: "catálogo", url: `${base}/ok`, timeoutMs: 1500 },
    { nombre: "pagos", url: `${base}/caido`, timeoutMs: 1500 },
    { nombre: "inventario", url: `http://127.0.0.1:${sinServicio}/`, timeoutMs: 1500 },
    { nombre: "reportes", url: `${base}/lento`, timeoutMs: 150 },
  ];
  const entradas: EntradaBitacora[] = [];
  const api = crearServidor({
    obtenerReporte: async () => aReportePublico(await revisarTodos(servicios, consultarConFetch)),
    leerActivo: async () => "",
    registrar: (entrada) => entradas.push(entrada),
  });
  await escuchar(api, 0);

  try {
    const respuesta = await fetch(`http://127.0.0.1:${puertoDe(api)}/api/estados?orden=nombre`);
    assert.equal(respuesta.status, 200);
    assert.equal(respuesta.headers.get("content-type"), "application/json; charset=utf-8");

    const cuerpo: unknown = await respuesta.json();
    assert.ok(esReportePublico(cuerpo));
    assert.deepEqual(
      cuerpo.estados.map((estado) =>
        estado.tipo === "falla"
          ? [estado.nombre, estado.detalle]
          : [estado.nombre, estado.codigoHttp],
      ),
      [
        ["catálogo", 200],
        ["pagos", "HTTP 503"],
        ["inventario", "conexión rechazada"],
        ["reportes", "tiempo límite agotado"],
      ],
    );
    assert.equal(JSON.stringify(cuerpo).includes("url"), false);
    assert.match(entradas[0]?.detalle ?? "", /^GET \/api\/estados 200 \d+ ms$/);
  } finally {
    await cerrar(api);
    remoto.closeAllConnections();
    await cerrar(remoto);
  }
});

test("las rutas desconocidas, los métodos y los errores internos responden con su código", async () => {
  const entradas: EntradaBitacora[] = [];
  const api = crearServidor({
    obtenerReporte: async () => {
      throw new Error("detalle interno que no debe salir");
    },
    leerActivo: async () => "",
    registrar: (entrada) => entradas.push(entrada),
  });
  await escuchar(api, 0);
  const base = `http://127.0.0.1:${puertoDe(api)}`;

  try {
    const salud = await fetch(`${base}/salud`);
    assert.equal(salud.status, 200);
    assert.equal(await salud.text(), "ok");

    const desconocida = await fetch(`${base}/api/no-existe`);
    assert.equal(desconocida.status, 404);
    assert.deepEqual(await desconocida.json(), { detalle: "ruta no encontrada" });

    const metodo = await fetch(`${base}/api/estados`, { method: "POST" });
    assert.equal(metodo.status, 405);
    assert.equal(metodo.headers.get("allow"), "GET");
    await metodo.body?.cancel();

    const interno = await fetch(`${base}/api/estados`);
    assert.equal(interno.status, 500);
    assert.deepEqual(await interno.json(), { detalle: "error interno" });
    assert.ok(entradas.some((entrada) => entrada.detalle === "detalle interno que no debe salir"));
  } finally {
    await cerrar(api);
  }
});

test("una ruta que no se puede analizar responde 404 y no derriba el servidor", async () => {
  const api = crearServidor({
    obtenerReporte: async () => ({ estados: [] }),
    leerActivo: async () => "",
    registrar: () => {},
  });
  await escuchar(api, 0);
  const puerto = puertoDe(api);

  try {
    const codigo = await new Promise<number>((resolve, reject) => {
      const solicitud = request({ host: "127.0.0.1", port: puerto, path: "//" }, (respuesta) => {
        respuesta.resume();
        resolve(respuesta.statusCode ?? 0);
      });
      solicitud.on("error", reject);
      solicitud.end();
    });

    assert.equal(codigo, 404);
    assert.equal((await fetch(`http://127.0.0.1:${puerto}/salud`)).status, 200);
  } finally {
    await cerrar(api);
  }
});
```
```ts
// fig09_05/src/contrato.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { esReportePublico } from "./contrato.js";

const casos: readonly {
  readonly nombre: string;
  readonly valor: unknown;
  readonly valido: boolean;
}[] = [
  {
    nombre: "un reporte con las dos variantes",
    valor: {
      estados: [
        { nombre: "catálogo", tipo: "disponible", codigoHttp: 200, duracionMs: 42 },
        { nombre: "pagos", tipo: "falla", detalle: "tiempo límite agotado" },
      ],
    },
    valido: true,
  },
  { nombre: "null", valor: null, valido: false },
  { nombre: "estados no es un arreglo", valor: { estados: "ninguno" }, valido: false },
  {
    nombre: "un estado con un tipo desconocido",
    valor: { estados: [{ nombre: "pagos", tipo: "pendiente" }] },
    valido: false,
  },
  {
    nombre: "codigoHttp llega como texto",
    valor: {
      estados: [{ nombre: "pagos", tipo: "disponible", codigoHttp: "200", duracionMs: 42 }],
    },
    valido: false,
  },
];

for (const caso of casos) {
  test(`esReportePublico: ${caso.nombre}`, () => {
    assert.equal(esReportePublico(caso.valor), caso.valido);
  });
}
```
```ts
// fig09_05/src/configuracion.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { leerPuerto } from "./configuracion.js";

const casos: readonly {
  readonly nombre: string;
  readonly entrada: string | undefined;
  readonly esperado: ReturnType<typeof leerPuerto>;
}[] = [
  { nombre: "sin variable usa 3000", entrada: undefined, esperado: { ok: true, valor: 3000 } },
  { nombre: "un puerto válido", entrada: "8080", esperado: { ok: true, valor: 8080 } },
  { nombre: "65535 es el límite", entrada: "65535", esperado: { ok: true, valor: 65535 } },
  {
    nombre: "65536 se pasa del límite",
    entrada: "65536",
    esperado: { ok: false, detalle: "PUERTO debe estar entre 1 y 65535" },
  },
  {
    nombre: "0 no es un puerto",
    entrada: "0",
    esperado: { ok: false, detalle: "PUERTO debe ser un entero positivo" },
  },
  {
    nombre: "un decimal se rechaza",
    entrada: "12.5",
    esperado: { ok: false, detalle: "PUERTO debe ser un entero positivo" },
  },
  {
    nombre: "texto se rechaza",
    entrada: "hola",
    esperado: { ok: false, detalle: "PUERTO debe ser un entero positivo" },
  },
  {
    nombre: "la cadena vacía se rechaza",
    entrada: "",
    esperado: { ok: false, detalle: "PUERTO debe ser un entero positivo" },
  },
];

for (const caso of casos) {
  test(`leerPuerto: ${caso.nombre}`, () => {
    assert.deepEqual(leerPuerto(caso.entrada), caso.esperado);
  });
}
```
```ts
// fig09_05/src/reporte.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import type { Estado } from "./modelo.js";
import { aReportePublico, lineaReporte } from "./reporte.js";

const servicio = { nombre: "catálogo", url: "https://catalogo.example", timeoutMs: 1500 };

test("disponible conserva código y duración", () => {
  assert.equal(
    lineaReporte({ servicio, tipo: "disponible", codigoHttp: 204, duracionMs: 18 }),
    "catálogo: HTTP 204 en 18 ms",
  );
});

test("falla conserva detalle", () => {
  assert.equal(
    lineaReporte({ servicio, tipo: "falla", detalle: "conexión rechazada" }),
    "catálogo: falla (conexión rechazada)",
  );
});

test("el reporte público no publica la URL ni el tiempo límite", () => {
  const estados: readonly Estado[] = [
    { servicio, tipo: "disponible", codigoHttp: 200, duracionMs: 42 },
    { servicio, tipo: "falla", detalle: "tiempo límite agotado" },
  ];

  assert.deepEqual(aReportePublico(estados), {
    estados: [
      { nombre: "catálogo", tipo: "disponible", codigoHttp: 200, duracionMs: 42 },
      { nombre: "catálogo", tipo: "falla", detalle: "tiempo límite agotado" },
    ],
  });
});
```
E os arquivos da lição 8 que continuam iguais: o log, a consulta com `fetch`, o leitor do arquivo de serviços, a configuração, o relatório, o modelo, o coordenador `revisarTodos`, `.prettierrc` e `servicios.json`.

```ts
// fig09_05/src/bitacora.ts
export interface EntradaBitacora {
  readonly evento: string;
  readonly detalle: string;
}

export type Bitacora = (entrada: EntradaBitacora) => void;

export const bitacoraEnConsola: Bitacora = (entrada) => {
  console.log(JSON.stringify({ momento: new Date().toISOString(), ...entrada }));
};
```
```ts
// fig09_05/src/consulta.ts
import type { Consultar } from "./revisar.js";

function codigoDeRed(error: unknown): string | undefined {
  if (
    error instanceof Error &&
    error.cause instanceof Error &&
    "code" in error.cause &&
    typeof error.cause.code === "string"
  ) {
    return error.cause.code;
  }

  return undefined;
}

export const consultarConFetch: Consultar = async (servicio, senal) => {
  const inicio = performance.now();

  try {
    const respuesta = await fetch(servicio.url, { signal: senal });
    await respuesta.body?.cancel();

    return {
      codigoHttp: respuesta.status,
      duracionMs: Math.round(performance.now() - inicio),
    };
  } catch (error: unknown) {
    if (senal.aborted) {
      throw new Error("tiempo límite agotado", { cause: error });
    }

    if (codigoDeRed(error) === "ECONNREFUSED") {
      throw new Error("conexión rechazada", { cause: error });
    }

    throw new Error("no se pudo conectar", { cause: error });
  }
};
```
```ts
// fig09_05/src/archivo.ts
import { readFile } from "node:fs/promises";
import { leerServicios, type Resultado } from "./configuracion.js";
import type { Servicio } from "./modelo.js";

export async function leerServiciosDeArchivo(
  ruta: string,
): Promise<Resultado<readonly Servicio[]>> {
  let texto: string;

  try {
    texto = await readFile(ruta, "utf8");
  } catch {
    return { ok: false, detalle: `no se pudo leer ${ruta}` };
  }

  let documento: unknown;

  try {
    documento = JSON.parse(texto);
  } catch {
    return { ok: false, detalle: `${ruta} no contiene JSON válido` };
  }

  return leerServicios(documento);
}
```
```ts
// fig09_05/src/configuracion.ts
import type { Servicio } from "./modelo.js";

export type Resultado<T> = { ok: true; valor: T } | { ok: false; detalle: string };

export function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function leerServicio(valor: unknown): Resultado<Servicio> {
  if (!esRegistro(valor)) {
    return { ok: false, detalle: "cada servicio debe ser un objeto" };
  }

  const { nombre, url, timeoutMs } = valor;

  if (
    typeof nombre !== "string" ||
    nombre.trim() === "" ||
    typeof url !== "string" ||
    url.trim() === "" ||
    typeof timeoutMs !== "number" ||
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs <= 0
  ) {
    return { ok: false, detalle: "servicio incompleto o inválido" };
  }

  return { ok: true, valor: { nombre, url, timeoutMs } };
}

export function leerServicios(valor: unknown): Resultado<readonly Servicio[]> {
  if (!Array.isArray(valor)) {
    return { ok: false, detalle: "la configuración debe ser un arreglo" };
  }

  const servicios: Servicio[] = [];

  for (const [indice, entrada] of valor.entries()) {
    const resultado = leerServicio(entrada);

    if (!resultado.ok) {
      return { ok: false, detalle: `servicio ${indice + 1}: ${resultado.detalle}` };
    }

    servicios.push(resultado.valor);
  }

  return { ok: true, valor: servicios };
}

export function leerEnteroPositivo(
  nombre: string,
  valor: string | undefined,
  predeterminado: number,
): Resultado<number> {
  if (valor === undefined) {
    return { ok: true, valor: predeterminado };
  }

  if (!/^[1-9]\d*$/.test(valor)) {
    return { ok: false, detalle: `${nombre} debe ser un entero positivo` };
  }

  const numero = Number(valor);

  if (!Number.isSafeInteger(numero)) {
    return { ok: false, detalle: `${nombre} está fuera del rango seguro` };
  }

  return { ok: true, valor: numero };
}

export function leerPuerto(valor: string | undefined): Resultado<number> {
  const puerto = leerEnteroPositivo("PUERTO", valor, 3000);

  if (puerto.ok && puerto.valor > 65535) {
    return { ok: false, detalle: "PUERTO debe estar entre 1 y 65535" };
  }

  return puerto;
}
```
```ts
// fig09_05/src/reporte.ts
import type { EstadoPublico, ReportePublico } from "./contrato.js";
import type { Estado } from "./modelo.js";

export function lineaReporte(estado: Estado): string {
  if (estado.tipo === "disponible") {
    return `${estado.servicio.nombre}: HTTP ${estado.codigoHttp} en ${estado.duracionMs} ms`;
  }

  return `${estado.servicio.nombre}: falla (${estado.detalle})`;
}

function aEstadoPublico(estado: Estado): EstadoPublico {
  if (estado.tipo === "disponible") {
    return {
      nombre: estado.servicio.nombre,
      tipo: "disponible",
      codigoHttp: estado.codigoHttp,
      duracionMs: estado.duracionMs,
    };
  }

  return { nombre: estado.servicio.nombre, tipo: "falla", detalle: estado.detalle };
}

export function aReportePublico(estados: readonly Estado[]): ReportePublico {
  return { estados: estados.map(aEstadoPublico) };
}
```
```ts
// fig09_05/src/modelo.ts
export interface Servicio {
  readonly nombre: string;
  readonly url: string;
  readonly timeoutMs: number;
}

export type Estado =
  | {
      readonly servicio: Servicio;
      readonly tipo: "disponible";
      readonly codigoHttp: number;
      readonly duracionMs: number;
    }
  | {
      readonly servicio: Servicio;
      readonly tipo: "falla";
      readonly detalle: string;
    };
```
```ts
// fig09_05/src/revisar.ts
import type { Estado, Servicio } from "./modelo.js";

export type Respuesta = { readonly codigoHttp: number; readonly duracionMs: number };
export type Consultar = (servicio: Servicio, senal: AbortSignal) => Promise<Respuesta>;

export async function revisarTodos(
  servicios: readonly Servicio[],
  consultar: Consultar,
): Promise<readonly Estado[]> {
  return Promise.all(
    servicios.map(async (servicio) => {
      try {
        const respuesta = await consultar(servicio, AbortSignal.timeout(servicio.timeoutMs));

        if (respuesta.codigoHttp >= 200 && respuesta.codigoHttp < 300) {
          return { servicio, tipo: "disponible", ...respuesta };
        }

        return { servicio, tipo: "falla", detalle: `HTTP ${respuesta.codigoHttp}` };
      } catch (error: unknown) {
        return {
          servicio,
          tipo: "falla",
          detalle: error instanceof Error ? error.message : "falla desconocida",
        };
      }
    }),
  );
}
```
```json fig09_05/.prettierrc
{
  "singleQuote": false,
  "printWidth": 100
}
```
```json fig09_05/servicios.json
[
  { "nombre": "ejemplo", "url": "https://example.com", "timeoutMs": 3000 },
  { "nombre": "node", "url": "https://nodejs.org", "timeoutMs": 3000 },
  { "nombre": "local-apagado", "url": "http://127.0.0.1:8099", "timeoutMs": 1000 }
]
```
```bash
$ cd fig09_05
$ npm run verificar
> verificar
> tsc --noEmit
$ npm run lint
> lint
> eslint src
$ npm run formato
> formato
> prettier --check src

Checking formatting...
All matched files use Prettier code style!
$ npm run probar
> probar
> npm run compilar && node --test "dist/**/*.test.js"


> compilar
> tsc

✔ leerPuerto: sin variable usa 3000 (0.5965ms)
✔ leerPuerto: un puerto válido (0.069125ms)
✔ leerPuerto: 65535 es el límite (0.053416ms)
✔ leerPuerto: 65536 se pasa del límite (0.111167ms)
✔ leerPuerto: 0 no es un puerto (0.076833ms)
✔ leerPuerto: un decimal se rechaza (0.056958ms)
✔ leerPuerto: texto se rechaza (0.077583ms)
✔ leerPuerto: la cadena vacía se rechaza (0.061083ms)
✔ esReportePublico: un reporte con las dos variantes (0.642125ms)
✔ esReportePublico: null (0.076959ms)
✔ esReportePublico: estados no es un arreglo (0.1285ms)
✔ esReportePublico: un estado con un tipo desconocido (0.741875ms)
✔ esReportePublico: codigoHttp llega como texto (0.060958ms)
✔ muestra Cargando mientras la API no responde y luego las filas (18.194375ms)
✔ un detalle con HTML se muestra como texto y no crea elementos (3.132041ms)
✔ muestra el error y se recupera al pulsar Actualizar (4.856ms)
✔ al desmontar cancela la solicitud en curso (1.096125ms)
✔ cargarReporte: devuelve el reporte cuando la API responde con el contrato (21.967625ms)
✔ cargarReporte: rechaza un código HTTP que no es 2xx (8.867708ms)
✔ cargarReporte: rechaza un JSON que no cumple el contrato (3.011083ms)
✔ el paquete que sirve el servidor pinta el reporte en una página real (142.25275ms)
✔ disponible conserva código y duración (0.3745ms)
✔ falla conserva detalle (0.051708ms)
✔ el reporte público no publica la URL ni el tiempo límite (0.32275ms)
✔ GET /api/estados revisa destinos reales y publica el reporte (178.837542ms)
✔ las rutas desconocidas, los métodos y los errores internos responden con su código (10.282458ms)
✔ una ruta que no se puede analizar responde 404 y no derriba el servidor (5.185333ms)
ℹ tests 27
ℹ suites 0
ℹ pass 27
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 532.285292
$ npm run empaquetar
> empaquetar
> esbuild src/panel/cliente.tsx src/panel/panel.css --bundle --minify --format=iife --log-level=warning --outdir=dist/publico
```

Para ver o painel em um navegador de verdade, construa e inicie. `npm run empaquetar` deixa o painel em `dist/publico/`:

```text
$ npm run compilar
$ npm run empaquetar
$ wc -c dist/publico/*
  225635 dist/publico/cliente.js
     249 dist/publico/panel.css
  225884 total
$ PUERTO=3100 npm run arrancar
{"momento":"2026-10-02T21:48:15.755Z","evento":"escuchando","detalle":"http://127.0.0.1:3100"}
```

Abra `http://127.0.0.1:3100/` no seu navegador. Você deve ver o título “Revisor”, um “Cargando…” que dura menos de um segundo e uma lista com um serviço por linha, com borda verde para os disponíveis e vermelha para os que falham; a cada dez segundos a lista se atualiza sozinha e o botão “Actualizar” a recarrega na hora. Abra as ferramentas de desenvolvimento (F12), a aba de rede, e confirme uma requisição `GET /api/estados` com status 200 a cada vez; na aba de console não deve haver erros, e nos cabeçalhos da resposta de `/` deve aparecer `content-security-policy`. Se algo falhar ali, o log do servidor, no primeiro terminal, tem uma linha por requisição.

Com o servidor em execução, assim responde cada rota da página:

```text
$ curl -i http://127.0.0.1:3100/
HTTP/1.1 200 OK
content-type: text/html; charset=utf-8
x-content-type-options: nosniff
content-security-policy: default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
...
$ curl -o /dev/null -w "%{http_code} %{content_type}\n" http://127.0.0.1:3100/cliente.js
200 text/javascript; charset=utf-8
$ curl -o /dev/null -w "%{http_code} %{content_type}\n" http://127.0.0.1:3100/etc/passwd
404 application/json; charset=utf-8
```

Essa última linha é a prova do percurso de caminhos: pedir um arquivo que o programa nunca prometeu entregar dá um `404`, não um arquivo.

### Compilar e publicar: um artefato conhecido

“Publicar” significa coisas diferentes em cada organização, então não há um comando universal honesto. O que sim é universal é a ordem: construir um artefato conhecido, inspecioná-lo, instalar só o necessário para executá-lo, configurar o ambiente fora do repositório e iniciar o que foi construído. Um **artefato** é a saída identificável que é entregue para executar. Esta lição prepara e verifica esse artefato; a implantação na sua infraestrutura fica fora do que pode ser dito de forma geral.

O artefato do `revisor` é uma pasta com quatro coisas: `dist/` (o servidor compilado e `dist/publico/` com o painel), `package.json` (de que o Node precisa para saber que os `.js` de `dist/` são módulos ESM, por seu campo `"type": "module"`), `package-lock.json` (a resolução exata de dependências) e `servicios.json` (a configuração). Não leva `src/` nem o `node_modules/` do desenvolvimento. `dist/` também contém os testes compilados, que ninguém executa em produção: não atrapalham, e se você quiser um artefato mais estrito pode excluí-los em uma configuração de compilação separada. E como o painel está empacotado dentro de `cliente.js` e o servidor só usa módulos do Node, o artefato não precisa de nenhuma dependência: o que se instala em produção é nada.

Para verificá-lo, não confie na lógica: construa-o e execute-o em uma pasta limpa, que é o mais parecido com um servidor novo. A partir da raiz de `revisor/`:

```text
$ npm run compilar && npm run empaquetar
$ mkdir ../revisor-artefacto
$ cp -R dist package.json package-lock.json servicios.json ../revisor-artefacto/
$ cd ../revisor-artefacto
$ npm ci --omit=dev

up to date, audited 1 package in 113ms

found 0 vulnerabilities
$ PUERTO=3100 node dist/main.js
{"momento":"2026-10-02T21:48:15.755Z","evento":"escuchando","detalle":"http://127.0.0.1:3100"}
```
`npm ci` instala exatamente o que diz o `package-lock.json`, falha se o lock e o `package.json` divergem e apaga `node_modules/` antes de começar: é a instalação pensada para entregas, diferentemente de `npm install`, que pode resolver versões novas. `--omit=dev` pula as dependências de desenvolvimento. O resultado, “audited 1 package”, é o próprio projeto: nenhuma dependência de produção. Se você tivesse colocado `react` como dependência normal, teria sido instalado à toa; se o servidor importasse algo que só está em `devDependencies`, este passo é onde falharia, e é melhor que falhe aqui do que no servidor de produção.

Antes de entregar o artefato, execute as verificações nesta ordem, a partir de uma instalação limpa com `npm ci`: `npm run verificar`, `npm run lint`, `npm run formato`, `npm run probar`, `npm run empaquetar`. Revise o `package-lock.json` como parte da mudança, porque ele registra o que vai ser executado. Não publique `node_modules/`, arquivos `.env`, logs nem exemplos com endereços, senhas ou tokens reais; e note que `servicios.json` é lido da pasta onde você inicia o processo, de modo que o serviço deve ser iniciado com essa pasta como diretório de trabalho.

Há quatro decisões que o artefato não toma por você. A primeira: o servidor escuta apenas em `127.0.0.1`, a interface local, e é deliberado, porque não deve ser exposto diretamente à internet. O habitual é colocar na frente um **proxy reverso**, um processo que recebe as conexões públicas, termina a criptografia HTTPS, o **TLS**, e reenvia a requisição ao `revisor` pela interface local; esse proxy, e não o programa, é quem apresenta o certificado. A segunda: um supervisor, que inicie o processo, o reinicie se cair e lhe envie `SIGTERM` para detê-lo, que é o motivo pelo qual o encerramento ordenado da lição 8 importa. A terceira: acesso. Um painel público pode sê-lo se só mostra informação pública; um que revela que sistemas você tem e como falham provavelmente requer autenticação, e isso não se resolve escondendo a URL: uma rota não se torna privada por não estar linkada. Defina o limite antes de publicar e teste as respostas sem uma sessão válida. A quarta: não use nada que seja de desenvolvimento, como o recarregamento automático ou mensagens detalhadas, como se fosse o pacote final.

## O erro que você vai ver

O React não inventa uma classe nova de erros de tipo; os erros de um componente são os de qualquer chamada, com a forma das propriedades. O primeiro aparece quando você passa uma propriedade que não pertence à união do contrato, e o segundo quando esquece uma propriedade obrigatória. Com o TypeScript 7.0.2, o `tsc` informa ambos em um mesmo arquivo. Nenhum dos dois é um problema do React: o estado `"pendiente"` não pertence à união que o painel promete atender, e um `FilaEstado` sem seu `estado` não tem nada para desenhar.

```tsx
// fig09_06.tsx
type EstadoPublico =
  | { readonly nombre: string; readonly tipo: "disponible"; readonly codigoHttp: number }
  | { readonly nombre: string; readonly tipo: "falla"; readonly detalle: string };

function FilaEstado({ estado }: { readonly estado: EstadoPublico }) {
  return <li>{estado.nombre}</li>;
}

export const pantalla = (
  <ul>
    <FilaEstado estado={{ nombre: "pagos", tipo: "pendiente" }} />
    <FilaEstado />
  </ul>
);
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext --jsx react-jsx fig09_06.tsx
fig09_06.tsx(12,44): error TS2322: Type '"pendiente"' is not assignable to type '"disponible" | "falla"'.
fig09_06.tsx(13,6): error TS2741: Property 'estado' is missing in type '{}' but required in type '{ readonly estado: EstadoPublico; }'.
```

O TS2322 diz que um valor não pode ser atribuído ao tipo que a propriedade espera: aqui, que `"pendiente"` não é nenhum dos dois valores de `tipo`. Não o resolva com `as EstadoPublico`: essa asserção calaria justamente o aviso que evita que você desenhe um estado que nenhum componente sabe desenhar. Se “pendiente” é um estado real do domínio, acrescente-o à união de `contrato.ts`, à guarda `esEstadoPublico`, ao conversor do servidor e a `FilaEstado`; o compilador irá dizendo onde falta cada peça. O TS2741 diz que falta uma propriedade obrigatória; leia-o como uma pergunta: essa linha deveria existir sem um estado? Quase sempre a resposta é que o componente foi chamado errado.

Há um erro que não é do compilador e que você vai encontrar: iniciar o servidor sem ter empacotado o painel. O servidor responde a página, mas `GET /cliente.js` devolve `500` e o log diz o que falta:

```text
$ curl -i http://127.0.0.1:3101/cliente.js
HTTP/1.1 500 Internal Server Error
...
{"detalle":"error interno"}
```

E no terminal do servidor:

```text
{"momento":"2026-10-02T21:48:27.838Z","evento":"error","detalle":"ENOENT: no such file or directory, open '/home/tu-usuario/proyectos/revisor/dist/publico/cliente.js'"}
{"momento":"2026-10-02T21:48:27.839Z","evento":"solicitud","detalle":"GET /cliente.js 500 1 ms"}
```

`ENOENT` significa “não existe esse arquivo”. A solução não é criar um arquivo vazio: é executar `npm run empaquetar`. A tela, enquanto isso, fica em branco, e as ferramentas de desenvolvimento mostram o script de `/cliente.js` falho em vermelho. É um bom exemplo de por que o erro é registrado no servidor e não apenas respondido: sem o log, o navegador só diria “falhou o carregamento”.

E um terceiro caso, este do navegador: se no console você vê `Refused to execute inline script because it violates the following Content Security Policy directive`, a política está fazendo seu trabalho. Algo tentou executar um script em linha ou carregar um recurso de outra origem. Não relaxe a política com `'unsafe-inline'` para que o aviso desapareça: descubra o que tentou executar, o que quase sempre é o sinal de que algo não deveria estar ali.

## O que se faz errado

- **Inserir HTML de fora sem sanitizar.** `dangerouslySetInnerHTML` ou `elemento.innerHTML = texto` com um texto que você não controla convertem dados em instruções: é XSS. Mostre texto como filho de JSX, e se você de fato precisa de HTML alheio, passe-o por um sanitizador mantido, antes de desenhar. O projeto proíbe ambas as formas com o ESLint e limita o que pode ser executado com uma política CSP.

- **Escrever uma função caseira para “limpar” HTML.** Substituir `<script>` ou uma lista de palavras deixa passar atributos de eventos, URLs `javascript:`, SVG e outras codificações. Uma lista do proibido está sempre incompleta; um sanitizador mantido parte de uma lista do permitido.

- **Tratar o JSON da rede como se fosse o tipo.** `(await respuesta.json()) as ReportePublico` compila e não verifica nada. Receba `unknown`, valide com a guarda compartilhada e revise `respuesta.ok` antes de parsear.

- **Converter um erro da API em uma lista vazia.** Um painel que mostra “não há serviços” quando a API devolveu um `503` oculta a falha justamente onde alguém está olhando. O estado de erro existe para que a tela diga o que aconteceu.

- **Pedir dados no corpo do componente.** Um `fetch` fora de `useEffect` se repete a cada renderização, e como a resposta muda o estado, provoca outra renderização: um laço de requisições. As requisições são efeitos e vão em `useEffect`.

- **Esquecer a limpeza do efeito.** Sem abortar a requisição nem deter o temporizador ao desmontar, as respostas atrasadas tentam atualizar componentes que já não existem e os intervalos continuam rodando para sempre.

- **Compartilhar o modelo interno em vez do contrato público.** Se o painel importa `Estado`, a URL de cada serviço viaja ao navegador por comodidade. Compartilhe `contrato.ts`: o que cruza a fronteira, não o que há dentro.

- **Importar código do Node em um arquivo compartilhado.** Um `import "node:fs"` em `contrato.ts` quebra o empacotamento do painel, ou pior, leva ao navegador código que não deveria sair do servidor. O compartilhado contém apenas tipos e funções puras.

- **Confundir empacotar com verificar.** O `esbuild` apaga os tipos sem verificá-los. Um fluxo que apenas empacota pode entregar um programa com erros de tipo; `npm run verificar` continua sendo obrigatório.

- **Servir arquivos com o caminho que o cliente escreve.** Montar `readFile("dist/publico" + url)` permite pedir `/../../secreto`. Com uma lista fechada de ativos conhecidos, como `Activo`, esse ataque não tem por onde entrar.

- **Relaxar a política CSP com `'unsafe-inline'` no primeiro aviso.** É o equivalente a desligar um alarme porque ele toca: você perde a defesa justamente quando ela estava funcionando. Descubra o que tentou ser executado.

- **Publicar o diretório de trabalho.** `node_modules/`, `src/`, `.env` e logs não fazem parte do artefato. Construa, copie apenas o necessário e instale com `npm ci --omit=dev`.

## Exercícios

### Exercício 1 — Uma terceira forma de ver o relatório

Acrescente ao painel um resumo sobre a lista: “2 de 3 servicios disponibles”. Calcule-o em uma função pura `resumir(reporte: ReportePublico): string` em seu próprio arquivo, teste-a com uma tabela de casos (nenhum disponível, todos, mistura, lista vazia) e use-a a partir de `Contenido`. Confirme com `npm run probar` que o teste de `Panel` continua passando e acrescente uma asserção que verifique o resumo na tela.

### Exercício 2 — Revisar o que cruza a API

Acrescente a `Servicio` um campo `responsable: string` (por exemplo, um e-mail de contato) e a `servicios.json` o valor de cada serviço, sem tocar `contrato.ts`. Execute `npm run verificar` e explique que arquivos você precisou modificar para que compile. Depois inicie o `revisor` e confirme com `curl http://127.0.0.1:3100/api/estados` que o responsável não aparece na resposta. Explique o que teria acontecido se a API serializasse o `Estado` diretamente.

### Exercício 3 — Validar antes de desenhar

Acrescente ao contrato um campo opcional `detalle` aos estados disponíveis, por exemplo para avisar de respostas lentas, e atualize `esEstadoPublico` para que o aceite somente se for texto. Escreva dois casos novos na tabela de `contrato.test.ts`: um válido e um com um `detalle` numérico. Verifique que o painel mostra o detalhe de um estado disponível sem que `FilaEstado` use uma asserção.

### Exercício 4 — Um painel que não fica velho em silêncio

Se a API deixa de responder, o painel mostra o erro, mas perde a lista que já tinha. Modifique `useReporte` para que, quando uma atualização falhar e já houver uma lista, conserve a última lista junto com o aviso de erro. Reflita sobre que alternativa de `Carga` você precisa acrescentar, adicione um teste em `Panel.test.tsx` que o verifique e confirme que o compilador aponta o `switch` de `Contenido` até você atender a nova alternativa.

## Soluções

### Solução 1

O cálculo é uma função pura que não sabe de React: recebe o contrato e devolve texto. Isso permite testá-la com dados construídos em memória, e é o que `Contenido` usa, sem lógica adicional.

```ts
// src/panel/resumir.ts
import type { ReportePublico } from "../contrato.js";

export function resumir(reporte: ReportePublico): string {
  const disponibles = reporte.estados.filter((estado) => estado.tipo === "disponible").length;
  return `${disponibles} de ${reporte.estados.length} servicios disponibles`;
}
```

Em `Contenido`, o ramo `listo` desenha `<p>{resumir(carga.reporte)}</p>` antes da lista. No teste de componente, a asserção é `assert.equal(contenedor.querySelector("p")?.textContent, "1 de 2 servicios disponibles")` com o relatório de exemplo, que tem um serviço disponível e um em falha. A lista vazia merece seu caso: `0 de 0 servicios disponibles` é uma frase correta, mas decida se você prefere outro texto antes que uma pessoa o veja.

### Solução 2

Acrescentar `responsable` a `Servicio` faz a compilação falhar em cada lugar que constrói um `Servicio` sem ele: `leerServicio` de `configuracion.ts`, que deve ler e validar o campo com as mesmas guardas que o resto, e os testes e figuras que escrevem serviços à mão. `contrato.ts`, `aReportePublico` e o painel não mudam, e aí está o ponto do exercício: como `aEstadoPublico` constrói o objeto campo por campo, o novo campo não chega à resposta. Se a API serializasse o `Estado` com `JSON.stringify`, `responsable` viajaria a cada navegador sem que ninguém o tivesse decidido; seria um vazamento de dados pessoais causado por acrescentar uma coluna.

### Solução 3

O campo é opcional no tipo e a guarda só o exige quando está presente: “opcional” significa que pode estar ausente, não que possa ter qualquer valor.

```ts
// src/contrato.ts (fragmento)
| {
    readonly nombre: string;
    readonly tipo: "disponible";
    readonly codigoHttp: number;
    readonly duracionMs: number;
    readonly detalle?: string;
  }

// en esEstadoPublico, rama "disponible":
return (
  typeof valor.codigoHttp === "number" &&
  typeof valor.duracionMs === "number" &&
  (valor.detalle === undefined || typeof valor.detalle === "string")
);
```

Em `FilaEstado`, o ramo `disponible` acrescenta `{estado.detalle === undefined ? null : ` — ${estado.detalle}`}` depois da duração. É um estreitamento normal: dentro do ramo não-`undefined`, `estado.detalle` é `string`, sem nenhuma asserção. Os dois casos da tabela são um relatório com `detalle: "lento"` em um estado disponível, que deve ser válido, e outro com `detalle: 7`, que deve ser rejeitado.

### Solução 4

A alternativa que falta é uma carga com lista e aviso ao mesmo tempo: `{ tipo: "obsoleto"; reporte: ReportePublico; detalle: string }`. É a única forma de representar “tenho dados velhos e a última tentativa falhou” sem inventar duas variáveis que possam se contradizer.

```ts
// en useReporte, dentro de pedir():
} catch (error: unknown) {
  if (control.signal.aborted) {
    return;
  }

  const detalle = error instanceof Error ? error.message : "falló la carga";
  establecerCarga((actual) =>
    actual.tipo === "listo" || actual.tipo === "obsoleto"
      ? { tipo: "obsoleto", reporte: actual.reporte, detalle }
      : { tipo: "error", detalle },
  );
}
```

Dois detalhes. Quando a atualização seguinte funciona, `establecerCarga({ tipo: "listo", reporte })` descarta o aviso. E como `Contenido` faz um `switch` com a guarda `never`, o compilador aponta (TS2322) essa função até você desenhar o ramo `obsoleto`: a lista e um `<p role="alert">` com o aviso. Essa é a utilidade de modelar os estados da tela como união.

## Como sei que consegui

- [ ] `npx tsc --version` imprime `Version 7.0.2` dentro de `~/proyectos/revisor`.
- [ ] Em `figuras/`, `fig09_02.tsx` imprime `primer render: <p>Cargando…</p>` e depois `tras el efecto: <p>2 servicios</p>`.
- [ ] `fig09_03.tsx` imprime a tag escapada com `&lt;` e `&gt;`, e `fig09_04.tsx`, com `dangerouslySetInnerHTML`, a imprime sem escapar.
- [ ] No projeto, `npm run verificar`, `npm run lint` e `npm run formato` terminam sem avisos, e `npm run probar` relata 27 testes aprovados e 0 falhos.
- [ ] Ao acrescentar um arquivo com `dangerouslySetInnerHTML`, `npm run lint` falha com a mensagem da regra; ao apagá-lo, volta a passar.
- [ ] `npm run empaquetar` termina sem saída e deixa `cliente.js` e `panel.css` em `dist/publico/`.
- [ ] Com `PUERTO=3100 npm run arrancar`, abrir `http://127.0.0.1:3100/` em um navegador mostra a lista, “Actualizar” a recarrega, e a aba de rede mostra `GET /api/estados` com status 200.
- [ ] `curl -i http://127.0.0.1:3100/` inclui o cabeçalho `content-security-policy`, e `curl http://127.0.0.1:3100/etc/passwd` responde 404.
- [ ] Em uma pasta limpa só com `dist/`, `package.json`, `package-lock.json` e `servicios.json`, `npm ci --omit=dev` termina bem e `node dist/main.js` inicia o mesmo servidor.

## Para ler mais

- [React: Aprenda React](https://pt-br.react.dev/learn) — documentação oficial de componentes, propriedades, estado e efeitos, com uma seção de TypeScript; consultado em 2 de outubro de 2026.

- [React: Sincronizando com Effects](https://pt-br.react.dev/learn/synchronizing-with-effects) — documentação oficial de `useEffect`: quando usá-lo, a lista de dependências e a função de limpeza; consultado em 2 de outubro de 2026.

- [OWASP: Cross Site Scripting Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) — guia da OWASP para evitar XSS, com as regras por contexto de saída (em inglês); consultado em 2 de outubro de 2026.

- [MDN: Content Security Policy (CSP)](https://developer.mozilla.org/pt-BR/docs/Web/HTTP/Guides/CSP) — referência sobre a política de segurança de conteúdo e suas diretivas; consultado em 2 de outubro de 2026.
