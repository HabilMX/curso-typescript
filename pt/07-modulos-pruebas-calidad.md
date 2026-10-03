# Lição 7 — Módulos, testes e qualidade

**Tempo:** 2 × 45 min

**O que você constrói:** o projeto de verdade, com testes

**O que você aprende:** módulos ESM, organização por responsabilidade, testes com tabela de casos, lint e formatação

## Ao terminar, você vai conseguir

- Separar o `revisor` em módulos ESM com responsabilidades nomeadas e dependências explícitas.
- Importar valores e tipos de arquivos relativos usando extensões `.js` compatíveis com o Node.
- Escrever um teste com uma tabela de casos que verifique resultados disponíveis e falhas.
- Interpretar um erro TS2305 de uma exportação ou importação que não coincide.
- Configurar comandos distintos para compilar, testar, revisar o estilo e formatar um projeto.
- Decidir que código deve ser puro e fácil de testar, e que código pertence às fronteiras de arquivos, rede ou console.

## O porquê antes do como

Até a lição anterior, o `revisor` já consegue fazer um trabalho útil. Tem um modelo `Servicio`, representa cada desfecho com uma união discriminada `Estado`, consulta vários destinos de forma concorrente e valida a configuração antes de usá-la. No entanto, os exemplos ainda cabem em poucos arquivos. Isso ajuda a estudar uma ideia isolada, mas não é suficiente para sustentar um programa que continuará crescendo com uma API HTTP na lição 8 e uma tela na lição 9.

Um arquivo grande tem uma vantagem inicial: tudo está à vista. Também tem um custo que cresce rápido. Para descobrir como um estado é apresentado, você percorre código de configuração, validação, temporizadores e consultas. Para testar uma regra de texto, você acaba importando ou executando peças que não têm relação com esse texto. Para mudar um detalhe da resposta HTTP, você pode tocar sem querer uma regra que o painel precisa conservar. O problema não é que um arquivo longo seja moralmente ruim; é que ele deixa de comunicar onde mora cada decisão.

Os módulos resolvem essa falta de limites. Um módulo é um arquivo que declara que valores oferece com `export` e o que precisa de outros módulos com `import`. Essa fronteira não é um comentário nem uma sugestão para quem mantém o código: o TypeScript verifica que os nomes importados existam, e o Node resolve os arquivos que serão carregados durante a execução. Quando `reporte.ts` exporta `lineaReporte`, anuncia uma capacidade concreta. Quando `revisor.ts` importa `Servicio` e `Estado`, deixa visível de que conceitos precisa para coordenar uma revisão.

Em JavaScript, os módulos ESM também são uma solução para um problema histórico. Antes era frequente carregar vários arquivos por meio de tags `<script>` e depender da ordem de carregamento global. Um arquivo podia assumir que outro já tinha criado uma variável global, embora nada em seu código mostrasse essa relação. Se a ordem mudasse, o erro aparecia ao executar. O ESM substitui esse acordo implícito por uma relação declarada: o arquivo que precisa de algo o importa com um caminho concreto. O Node pode construir o grafo de dependências antes de iniciar o programa.

O `revisor` precisa de uma organização que cresça sem criar gavetas de bagunça. Não convém colocar todas as interfaces em uma pasta chamada `types`, todas as funções em `utils` e todo o resto em `helpers`. Esses nomes descrevem a forma técnica do código, não a responsabilidade do domínio. Com o tempo, `utils` vira o lugar onde acaba qualquer função que ninguém quis nomear. Encontrar algo exige lembrar onde foi escondido, e não entender o que faz.

Uma estrutura inicial mais útil pode ser assim:

```text
revisor/
  package.json
  tsconfig.json
  src/
    modelo.ts
    configuracion.ts
    revisar.ts
    reporte.ts
    main.ts
    reporte.test.ts
```

`modelo.ts` descreve `Servicio`, `EstadoDisponible`, `EstadoFalla` e `Estado`: não lê arquivos, não abre conexões e não imprime. `configuracion.ts` recebe dados externos e os valida, como você aprendeu na lição 6. `revisar.ts` coordena as consultas concorrentes e converte seus desfechos em estados. `reporte.ts` transforma estados confiáveis em texto ou, mais adiante, em dados para a API e o painel. `main.ts` conecta as peças ao iniciar o programa. O teste vive ao lado do código que protege, em `src/reporte.test.ts`; ao compilar, termina como `dist/reporte.test.js` e o Node o descobre ali.

A meta não é ter muitas pastas. Separar cada função pequena em um arquivo também pode esconder a relação entre peças que deveriam ser lidas juntas. A pergunta útil é: “este arquivo responde a uma pergunta clara do programa?”. Se a resposta de `reporte.ts` é “como representamos o que aconteceu”, há uma responsabilidade. Se uma pasta se chama `misc`, `common` ou `helpers`, provavelmente ainda não há uma pergunta clara.

Essa organização tem uma consequência importante para os testes. Uma função que recebe um `Estado` e devolve uma string não precisa de rede, arquivos, relógio nem variáveis de ambiente. Com os mesmos dados, devolve o mesmo resultado. Esse tipo de função é barato de testar com uma tabela de casos. Já uma função que lê `process.env`, chama `fetch`, mede tempo e escreve no console mistura várias fronteiras. Pode precisar de testes de integração, mas não deve impedir que as regras centrais sejam testadas separadamente.

O Go faz uma separação comparável por meio de pacotes. Uma diferença útil é que o Go compila pacotes e decide quais nomes são públicos pela letra maiúscula, enquanto o TypeScript e o JavaScript usam explicitamente `export` e `import`. Em ambos os casos, a ideia de fundo é a mesma: uma dependência deve ser visível e limitada. Não se trata de dividir arquivos por esporte; trata-se de poder mudar uma parte sem precisar compreender nem arriscar o programa inteiro.

Os testes são a segunda metade desse acordo. O compilador responde se o programa respeita os tipos: por exemplo, que `lineaReporte` receba um `Estado` e não uma string. Não responde se a regra de apresentação é a que você precisava. Uma função pode compilar e, mesmo assim, imprimir `HTTP undefined`, omitir uma falha ou classificar o código 500 como disponível. Um teste constrói uma entrada conhecida, executa uma regra e compara o resultado com uma expectativa explícita.

A qualidade tampouco se reduz aos testes. Um formatador torna consistentes as decisões visuais: indentação, espaços, aspas e quebras de linha deixam de ser uma discussão repetida a cada mudança. Um linter procura padrões que compilam mas costumam esconder erros ou ambiguidades: uma variável declarada e nunca usada, uma promise esquecida, uma condição difícil de ler ou uma conversão arriscada. Cada ferramenta responde a uma pergunta diferente. O `tsc` pergunta se o programa cumpre seus contratos estáticos; os testes perguntam se casos conhecidos produzem os resultados esperados; o linter procura sinais de código problemático; o formatador mantém uma apresentação previsível.

Você não precisa esperar ter centenas de arquivos para incorporar essas práticas. Justamente quando o projeto é pequeno fica mais fácil escolher nomes claros, testar uma regra importante e automatizar revisões mecânicas. Depois, quando o `revisor` tiver servidor e tela, essas decisões já estarão funcionando como uma rede de segurança, em vez de virarem uma limpeza enorme e arriscada.

## Os conceitos

### Módulos ESM: arquivos com contratos explícitos

Em um projeto com `"type": "module"` no `package.json`, o Node interpreta os arquivos `.js` emitidos como módulos ECMAScript, também chamados de ESM. O TypeScript pode analisar arquivos `.ts` que seguem essas regras e emitir JavaScript compatível. A opção `--module nodenext` indica ao compilador que deve respeitar a resolução moderna do Node, incluindo uma regra que costuma surpreender no começo: as importações relativas devem escrever a extensão do arquivo que o Node executará.

Por isso um arquivo TypeScript escreve `import { lineaReporte } from "./reporte.js"` embora o arquivo-fonte se chame `reporte.ts`. O TypeScript entende que, depois de compilar, o Node carregará `reporte.js`. Escrever `./reporte` deixa uma ambiguidade que o ESM não resolve como o CommonJS fazia, o sistema de módulos anterior do Node, que resolvia caminhos e exportações com regras diferentes.

O Node 24 LTS também pode executar um arquivo `.ts` diretamente por meio de *type stripping* (remoção de tipos): substitui a sintaxe de tipos por espaços e executa o JavaScript resultante. Não é uma compilação nem uma verificação de tipos; `node archivo.ts` não lê `tsconfig.json` nem aplica `strict`. Além disso, só aceita sintaxe apagável: `enum`, `namespace` com valores e propriedades de parâmetro exigem `--experimental-transform-types`; `.tsx` não é suportado, não admite `.ts` dentro de `node_modules` e os tipos importados devem usar `import type`. Para um script de um único arquivo pode ser cômodo, mas não é o fluxo do `revisor`.

Em particular, o Node executando `.ts` exige extensões `.ts` literais nos `import`, enquanto este projeto escreve `.js` para que o JavaScript emitido esteja correto. Se o Node receber `src/main.ts`, procuraria literalmente `./modelo.js` dentro de `src/` e não o encontraria. Por isso o projeto de vários arquivos é compilado com `tsc` e executado a partir de `dist/main.js`: ali sim existem `modelo.js`, `reporte.js` e os demais módulos que os imports declaram. A opção `erasableSyntaxOnly` pode avisar sobre construções que o Node não conseguiria apagar; não substitui a compilação nem os testes.

Um módulo pode exportar valores que existem na execução, como funções e constantes, e também tipos que só servem ao compilador. A sintaxe `import type` torna visível essa diferença. Se você importa `Estado` apenas para anotar uma variável, o TypeScript elimina essa importação do JavaScript emitido. Se importa `lineaReporte`, o Node precisa carregá-la, porque é uma função que é invocada em tempo de execução.

O programa a seguir tem dois módulos. `modelo.ts` é dono do contrato dos estados e da regra para convertê-los em linhas. O arquivo principal constrói dados do `revisor` e consome a função exportada. Nenhum arquivo depende de uma variável global nem precisa saber como o outro é implementado além da sua exportação pública.

```json fig07_01/package.json
{
  "name": "revisor",
  "private": true,
  "type": "module"
}
```

```json fig07_01/tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src"]
}
```

```ts
// fig07_01/src/modelo.ts
export interface Servicio {
  readonly nombre: string;
  readonly url: string;
  readonly timeoutMs: number;
}

export type EstadoDisponible = {
  servicio: Servicio;
  tipo: "disponible";
  codigoHttp: number;
  duracionMs: number;
};

export type EstadoFalla = {
  servicio: Servicio;
  tipo: "falla";
  detalle: string;
};

export type Estado = EstadoDisponible | EstadoFalla;

export function lineaReporte(estado: Estado): string {
  if (estado.tipo === "disponible") {
    return `${estado.servicio.nombre}: HTTP ${estado.codigoHttp} en ${estado.duracionMs} ms`;
  }

  return `${estado.servicio.nombre}: falla (${estado.detalle})`;
}
```

```ts
// fig07_01/src/main.ts
import { lineaReporte, type Estado } from "./modelo.js";

const catalogo: Estado = {
  servicio: {
    nombre: "catálogo",
    url: "https://catalogo.example",
    timeoutMs: 1500,
  },
  tipo: "disponible",
  codigoHttp: 200,
  duracionMs: 42,
};

const pagos: Estado = {
  servicio: {
    nombre: "pagos",
    url: "https://pagos.example",
    timeoutMs: 3000,
  },
  tipo: "falla",
  detalle: "tiempo límite",
};

console.log(lineaReporte(catalogo));
console.log(lineaReporte(pagos));
```

```bash
$ cd fig07_01
$ npx tsc -p tsconfig.json
$ node dist/main.js
catálogo: HTTP 200 en 42 ms
pagos: falla (tiempo límite)
```

A fronteira do módulo obriga a tomar decisões úteis. `Estado` é exportado porque `revisar.ts`, `reporte.ts`, a API futura e o painel precisam falar do mesmo resultado. Um auxiliar privado que só ajuda `lineaReporte` não precisa ser exportado. Mantê-lo sem `export` reduz a superfície que outros arquivos podem usar por acidente. Se uma função privada mudar de nome ou desaparecer, nenhum módulo externo deveria quebrar por causa disso.

Dentro do `revisor`, evite criar uma dependência circular. Por exemplo, `revisar.ts` pode importar tipos de `modelo.ts`, e uma função de texto em `reporte.ts` pode importar `Estado` de `modelo.ts`. Em contrapartida, `modelo.ts` não deve importar `revisar.ts` para pedir a ele que consulte a rede. O modelo descreve os dados; o coordenador usa esse modelo. Se dois módulos precisam importar um ao outro, normalmente uma responsabilidade está misturada e convém extrair o conceito compartilhado para um terceiro módulo menor.

Um caminho de importação também é parte do contrato. Não renomeie arquivos à mão sem atualizar as importações nem use caminhos absolutos locais que só funcionem na sua máquina. O projeto deve poder ser clonado e executado a partir de qualquer caminho. Os caminhos relativos com `.js` tornam essa dependência explícita e funcionam tanto na pasta de desenvolvimento quanto no JavaScript emitido.

### Organização por responsabilidade: o fluxo do revisor

Os nomes dos módulos devem seguir o fluxo real do programa. O `revisor` recebe configuração externa, valida serviços, coordena consultas, transforma resultados e os apresenta. Essa sequência sugere responsabilidades naturais:

| Módulo | Pergunta que responde | O que não deve fazer |
|---|---|---|
| `modelo.ts` | O que é um serviço e que resultados pode produzir? | Ler JSON, chamar a rede ou imprimir |
| `configuracion.ts` | Os dados externos formam uma lista válida de serviços? | Decidir como um relatório é apresentado |
| `revisar.ts` | Como cada serviço é consultado e cada desfecho é conservado? | Conhecer detalhes de uma tela |
| `reporte.ts` | Como um estado confiável é transformado em saída legível? | Validar JSON ou abrir conexões |
| `main.ts` | Como as peças são conectadas ao iniciar o processo? | Conter regras de negócio longas |

Esta tabela não é uma lei universal. Um projeto pequeno pode ter `modelo.ts` e `reporte.ts` juntos enquanto a relação for clara. Um projeto maior pode dividir configuração de arquivo, variáveis de ambiente e opções HTTP em módulos específicos. O critério não é a quantidade de arquivos; é que uma mudança tenha uma casa óbvia. Se você muda o texto que uma pessoa verá, procura `reporte.ts`. Se muda a regra de um `timeoutMs` válido, procura o validador de configuração.

A lição 6 já separou a validação da entrada desconhecida. Conserve essa separação agora que aparecem módulos. `configuracion.ts` pode exportar `leerServicios(valor: unknown): Resultado<readonly Servicio[]>`. O arquivo `main.ts` pode ler um arquivo com `node:fs/promises`, converter o texto JSON em `unknown`, chamar o validador e só então entregar os serviços a `revisarTodos`. Assim, a parte que toca o disco é pequena e a regra de validação continua sendo uma função que recebe valores e devolve um resultado verificável.

A lição 5 separou de maneira parecida a coordenação de uma consulta concreta. O tipo `Consultar` recebe um `Servicio` e um `AbortSignal`, e devolve uma promise com uma resposta. Em um teste, você pode entregar uma função de consulta controlada. No programa real, `main.ts` poderá construir uma implementação com `fetch`. A injeção de dependências é entregar a uma função a colaboração de que ela precisa, em vez de ela criá-la ou escondê-la lá dentro; aqui evita que um teste de “um código 503 vira uma falha” dependa de um servidor externo.

Uma má organização costuma começar com nomes cômodos. `utils.ts` parece prático porque permite guardar uma função sem decidir a que ela pertence. Depois recebe validadores, conversores, formatadores, constantes e peças de rede. O resultado é um módulo muito importado que não tem uma responsabilidade própria e torna difícil saber que mudanças podem afetá-lo. Se uma função formata um estado, pertence ao relatório. Se normaliza um valor de configuração, pertence à configuração. Se não cabe em nenhuma responsabilidade existente, talvez o domínio precise de um nome novo.

Evite também transformar `main.ts` no novo arquivo gigantesco. Ele deve ser uma composição do programa: obter configuração, validar, pedir uma revisão e imprimir ou iniciar o servidor. Se `main.ts` contém cinquenta linhas de regras para interpretar respostas, extraia essa decisão para o módulo que lhe corresponde. A clareza de `main.ts` serve como um mapa de alto nível: quem o ler deveria conseguir entender o percurso do programa sem precisar memorizar cada detalhe.

### Testes com tabela de casos: uma regra, muitas entradas

Uma tabela de casos é uma coleção de entradas, saídas esperadas e nomes de cenário que compartilha um mesmo corpo de teste. É especialmente útil quando uma função tem muitas alternativas pequenas. Em vez de copiar quatro vezes a preparação, a chamada e a comparação, você escreve uma vez a mecânica e acrescenta linhas que descrevem novos comportamentos.

O nome de cada caso importa. `"caso 1"` não ajuda quando uma falha aparece semanas depois. `"disponible conserva código y duración"` comunica a regra que está sendo protegida. `"falla conserva detalle"` comunica outra. Se a segunda linha quebrar, você sabe se deve revisar o modelo, a função de apresentação ou a expectativa. Uma tabela não substitui o pensamento; torna cada expectativa visível e ampliável.

O Node inclui `node:assert/strict`, uma biblioteca padrão de asserções. `assert.equal(real, esperado)` encerra o programa com um erro se os valores forem diferentes. Nesta figura usamos uma tabela simples e uma saída estável para que você a veja como um programa comum. Em um projeto, o mesmo padrão pode viver dentro de `node:test`, Vitest ou outro executor de testes; a tabela continua sendo a parte que define o comportamento esperado.

Como o arquivo importa um módulo com prefixo `node:`, o comando inclui `--types node`. Desde o TypeScript 6, o compilador não carrega mais automaticamente as declarações do Node ao compilar arquivos isolados. Essa flag apenas informa ao TypeScript os tipos instalados; o Node continua fornecendo `node:assert/strict` durante a execução.

```json fig07_02/package.json
{
  "name": "revisor",
  "private": true,
  "type": "module"
}
```

```json fig07_02/tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "types": ["node"],
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src"]
}
```

```ts
// fig07_02/src/reporte.ts
export interface Servicio {
  readonly nombre: string;
  readonly url: string;
  readonly timeoutMs: number;
}

export type Estado =
  | {
      servicio: Servicio;
      tipo: "disponible";
      codigoHttp: number;
      duracionMs: number;
    }
  | {
      servicio: Servicio;
      tipo: "falla";
      detalle: string;
    };

export function lineaReporte(estado: Estado): string {
  if (estado.tipo === "disponible") {
    return `${estado.servicio.nombre}: HTTP ${estado.codigoHttp} en ${estado.duracionMs} ms`;
  }

  return `${estado.servicio.nombre}: falla (${estado.detalle})`;
}
```

```ts
// fig07_02/src/main.ts
import assert from "node:assert/strict";
import { lineaReporte, type Estado } from "./reporte.js";

const servicio = {
  nombre: "catálogo",
  url: "https://catalogo.example",
  timeoutMs: 1500,
};

const casos: readonly {
  readonly nombre: string;
  readonly entrada: Estado;
  readonly esperada: string;
}[] = [
  {
    nombre: "disponible conserva código y duración",
    entrada: {
      servicio,
      tipo: "disponible",
      codigoHttp: 204,
      duracionMs: 18,
    },
    esperada: "catálogo: HTTP 204 en 18 ms",
  },
  {
    nombre: "falla conserva detalle",
    entrada: {
      servicio,
      tipo: "falla",
      detalle: "conexión rechazada",
    },
    esperada: "catálogo: falla (conexión rechazada)",
  },
];

for (const caso of casos) {
  assert.equal(lineaReporte(caso.entrada), caso.esperada);
  console.log(`ok - ${caso.nombre}`);
}
```

```bash
$ cd fig07_02
$ npx tsc -p tsconfig.json
$ node dist/main.js
ok - disponible conserva código y duración
ok - falla conserva detalle
```

Um teste útil não cobre apenas o caminho feliz. O primeiro caso verifica um estado disponível, mas usa 204 em vez de apenas 200 para confirmar que a função conserva o código que recebeu. O segundo testa a outra alternativa da união discriminada. Se alguém modificar `lineaReporte` e esquecer de tratar as falhas, o segundo caso ficará vermelho. Esse é um sinal melhor que uma porcentagem de cobertura: explica que comportamento deixou de ser cumprido.

Os valores de fronteira também devem ter lugar nas suas tabelas. Se uma função classifica códigos HTTP bem-sucedidos de 200 a 299, não basta testar 200 e 500. Acrescente 199, 200, 299 e 300. Os erros de comparação costumam morar exatamente aí: `<= 300` em vez de `< 300`, ou `> 200` em vez de `>= 200`. Uma tabela permite adicionar esses casos como dados, sem duplicar toda a estrutura de um teste.

Não teste só pela cobertura. Uma função pode ser executada em um teste e continuar sem uma asserção relevante. Por exemplo, um teste que apenas verifica que `lineaReporte` devolve uma string exercita ambos os ramos, mas não detecta que a saída diga `"todo bien"` para qualquer estado. A comparação deve afirmar o detalhe que importa: nome, código, duração ou mensagem de falha.

Dentro do `revisor`, os testes mais rápidos devem se concentrar em funções determinísticas como `leerServicio`, `leerServicios`, `lineaReporte`, classificadores de códigos e conversões de dados. Os testes que usam `fetch`, arquivos ou um servidor local são úteis, mas respondem a outra pergunta: se várias peças se integram corretamente. Comece pelas regras puras; depois acrescente testes de integração deliberados onde uma fronteira justificar.

### Qualidade automática: compilação, lint e formatação

Uma rotina mínima de qualidade deve ser fácil de lembrar e possível de executar antes de entregar uma mudança. Em um projeto Node, o `package.json` pode reunir os comandos para que ninguém precise memorizar opções longas. Um exemplo de scripts para o `revisor` é o seguinte:

```json
{
  "type": "module",
  "scripts": {
    "compilar": "tsc",
    "verificar": "tsc --noEmit",
    "arrancar": "node dist/main.js",
    "probar": "npm run compilar && node --test \"dist/**/*.test.js\"",
    "lint": "eslint src",
    "formato": "prettier --check src"
  }
}
```

`compilar` emite o JavaScript em `dist/`; `verificar` faz a mesma verificação de tipos sem emitir; e `arrancar` executa a entrada emitida. Essa separação é necessária: os testes do Node executam os arquivos JavaScript de `dist/`, por isso `probar` primeiro compila e depois busca `dist/**/*.test.js`. Um diretório fictício como `dist/test` não é um teste: o Node tentaria carregá-lo como módulo e falharia antes de descobrir os casos.

O `tsconfig.json` deve conter as decisões que o projeto repete. Para Node e ESM, uma base razoável inclui `strict`, `module` e `moduleResolution` com valor `nodenext`, além das declarações explícitas do Node. Você não precisa copiar cada opção que existe na internet: acrescente uma opção quando entender que contrato ela impõe.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "strict": true,
    "types": ["node"],
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

O linter não substitui o compilador. O TypeScript sabe, por exemplo, que uma função exige um `Estado`; o ESLint pode avisar sobre uma variável que você declarou e não usou, uma promise que você deixou sem esperar ou um padrão que a equipe decidiu evitar. Configure-o com regras que você consiga explicar. Uma lista enorme de regras copiadas de outro projeto costuma produzir avisos que ninguém atende. É melhor começar com um conjunto pequeno, corrigir os avisos e endurecê-lo só quando a equipe compreender o motivo.

Primeiro instale as ferramentas de desenvolvimento. O TypeScript 7 e o `typescript-eslint` ainda não rodam juntos: o `typescript-eslint` usa a API do TypeScript 6. O projeto conserva o TypeScript 7 para `npx tsc` sob `@typescript/native` e deixa o TypeScript 6 como alias `typescript` para o ESLint, cujo executável adicional fica disponível como `npx tsc6`. Não troque um pelo outro: são dois papéis distintos até que a compatibilidade chegue.

```bash
npm install --save-dev eslint@10.11.0 @eslint/js@10.0.1 typescript-eslint@8.71.0 prettier@3.9.9 @types/node@24 typescript@npm:@typescript/typescript6@^6.0.2 @typescript/native@npm:typescript@^7.0.2
```

O npm escreve essas versões no `package.json` precedidas de `^` (por exemplo `"^10.11.0"`). Para este curso tanto faz: o `package-lock.json` fixa o que foi instalado. Se você prefere que o `package.json` fique com versões exatas, como no exemplo da solução 4, acrescente `--save-exact` ao comando ou remova os `^` à mão.

O ESLint 10 usa um arquivo de configuração plano; sem `eslint.config.js`, `eslint src` termina com um erro informando que não encontrou `eslint.config.*`. Esta configuração mínima combina as regras recomendadas de JavaScript e TypeScript. O Prettier recebe uma decisão explícita de aspas e largura de linha.

```js
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(js.configs.recommended, ...tseslint.configs.recommended);
```

```json
{
  "singleQuote": false,
  "printWidth": 100
}
```

O formatador tampouco substitui uma revisão de design. O Prettier não sabe se `revisarTodos` mora no módulo correto nem se a sua tabela testa uma borda importante. Seu valor está em tirar decisões mecânicas da conversa. Se todo o projeto usa a mesma indentação e a mesma disposição de linhas, uma revisão pode se concentrar em mudanças de comportamento. Execute `prettier --check src` nas verificações automáticas e use `npx prettier --write src` apenas quando quiser aplicar a formatação aos arquivos-fonte.

Não ignore um linter só porque o programa “funciona”. Um aviso de promise não esperada pode significar que o processo termina antes de registrar um resultado. Uma variável não usada pode ser um resto de uma validação que já não acontece. Também não obedeça a cada regra sem pensar: se uma regra não representa uma decisão útil para este projeto, ajuste-a ou elimine-a com uma razão visível. A qualidade automática deve reduzir erros e atrito, não virar ruído.

Em Go, o `gofmt` faz parte natural do fluxo e o `go vet` encontra construções que compilam mas parecem incorretas. No TypeScript, o ecossistema deixa mais escolhas: `tsc`, ESLint, Prettier e o executor de testes são ferramentas distintas. Essa flexibilidade exige uma decisão explícita. Depois de escolhidas, os scripts do projeto dão uma experiência parecida: um conjunto curto de comandos que qualquer pessoa pode executar e que uma integração contínua pode repetir.

## O erro que você vai ver

O TS2305 aparece quando você importa um nome que o módulo não exporta. Com o TypeScript 7.0.2, o `tsc` imprime o diagnóstico a seguir. O módulo existe e o caminho está correto, mas o arquivo só exporta `revisarTodos`; não exporta uma função chamada `revisarUno`.

```ts
// fig07_03/revisor.ts
export function revisarTodos(): string {
  return "revisión terminada";
}
```

```ts
// fig07_03.ts
import { revisarUno } from "./fig07_03/revisor.js";

console.log(revisarUno());
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig07_03.ts
fig07_03.ts(2,10): error TS2305: Module '"./fig07_03/revisor.js"' has no exported member 'revisarUno'.
```

O TS2305 não significa que você deva acrescentar `export` a tudo até o erro desaparecer. Primeiro decida que parte do contrato você precisa. Se o programa deve coordenar uma lista completa, importe `revisarTodos`. Se você realmente precisa revisar um serviço individual, crie e exporte `revisarUno` como uma função com um contrato claro, e conserve `revisarTodos` como o coordenador que a chama para cada serviço.

Outro erro frequente no ESM ocorre ao omitir `.js` em um caminho relativo. O TypeScript com `module: "nodenext"` pode relatar o TS2835 e sugerir uma extensão explícita. A correção não é escrever `.ts`; escreva a extensão `.js` do arquivo emitido. Esse detalhe só parece estranho enquanto você olha o código-fonte. O Node resolverá o JavaScript gerado, e o import deve descrever justamente esse arquivo.

Quando o Node mostra `ERR_MODULE_NOT_FOUND`, a compilação já passou e o problema está na resolução durante a execução. Revise o caminho relativo, as maiúsculas e minúsculas do nome do arquivo e a extensão `.js`. Não resolva esse erro mudando para `require` nem desativando o ESM: o diagnóstico está mostrando uma diferença real entre o nome que você importou e o arquivo que o Node consegue carregar.

Uma falha de teste tem outra leitura. Se `assert.equal` informa que obteve uma string diferente da esperada, não mude a expectativa imediatamente para recuperar o verde. Pergunte primeiro se o requisito mudou ou se o código mudou por acidente. Um teste deve documentar um comportamento acordado; modificá-lo para acomodar qualquer saída elimina justamente o sinal que avisava da mudança.

## O que se faz errado

- **Criar um módulo `utils`, `helpers` ou `common` para tudo o que não tem lugar.** Esses nomes não explicam uma responsabilidade e acabam concentrando dependências sem relação. Dê nome ao conceito dono da função, como `configuracion`, `reporte` ou `revisar`; se você não consegue, talvez falte esclarecer o design antes de mover código.

- **Importar caminhos relativos sem `.js` no ESM.** Pode parecer que o arquivo-fonte deveria ser importado com `.ts` ou sem extensão, mas o Node executa o JavaScript emitido. Use o caminho que o Node resolverá, por exemplo `./modelo.js`, e deixe que o TypeScript relacione esse caminho com o arquivo-fonte.

- **Exportar tudo “por via das dúvidas”.** Cada exportação se torna uma dependência potencial de outros módulos. Quanto mais superfície pública um arquivo tem, mais difícil é mudar seu interior. Exporte os tipos e funções de que outros módulos realmente precisam; mantenha privados os auxiliares de implementação.

- **Fazer testes que dependem de rede, relógio e arquivos para verificar uma regra de texto.** Esses testes são mais lentos, menos determinísticos e mais difíceis de diagnosticar. Separe primeiro a regra pura, teste-a com dados construídos em memória e deixe as fronteiras para testes de integração específicos.

- **Testar um único caso feliz.** Uma função que trata uma união discriminada precisa de pelo menos um caso para cada alternativa importante. As comparações de faixas precisam de valores de fronteira. Um caso isolado pode passar mesmo que o programa falhe para as entradas que realmente distinguem uma regra.

- **Perseguir 100 % de cobertura como meta única.** Cobertura significa que uma linha foi executada, não que uma expectativa importante foi verificada. Use-a para descobrir caminhos que você não considerou, mas revise se cada teste pode falhar quando muda o comportamento que pretende proteger.

- **Usar o linter e o formatador como substitutos de uma revisão.** As ferramentas automáticas encontram classes limitadas de problemas. Não podem decidir se `timeoutMs` tem uma política correta, se uma mensagem de erro ajuda a operar o sistema ou se o módulo escolhido representa bem a responsabilidade.

- **Aplicar formatação manualmente antes de cada revisão.** Se o projeto tem um formatador, deixe-o fazer o trabalho mecânico. As diferenças de estilo misturadas com uma mudança de comportamento dificultam revisar o que de fato mudou.

## Exercícios

### Exercício 1 — Extrair o modelo do revisor

Crie um módulo `modelo.ts` que exporte `Servicio`, `EstadoDisponible`, `EstadoFalla` e `Estado` com os mesmos contratos usados nas lições 3 e 5. Crie um arquivo principal que importe `type Estado` de `./modelo.js`, construa um estado disponível e outro de falha, e os imprima por meio de uma função exportada do módulo.

### Exercício 2 — Uma tabela para classificar códigos

Escreva `clasificarCodigo(codigoHttp: number): "disponible" | "falla"` em um módulo. Crie um teste com tabela de casos para 199, 200, 299, 300 e 503. Cada linha deve ter um nome que descreva a borda ou a regra que verifica. Use `node:assert/strict` e documente o comando de compilação com `--types node`.

### Exercício 3 — Separar a configuração de inicialização

Parta de `leerServicios` da lição 6. Coloque-o em `configuracion.ts`, conserve a entrada como `unknown` e exporte apenas a função de leitura e os tipos de que outro módulo precise. Crie um `main.ts` pequeno que receba um valor já parseado, chame a função e só entregue a lista à revisão se o resultado tiver `ok: true`.

### Exercício 4 — Uma rotina de qualidade

Acrescente os scripts `compilar`, `verificar`, `arrancar`, `probar`, `lint` e `formato` com os contratos desta lição. Inclua `"types": ["node"]`, `"rootDir": "./src"`, `"outDir": "./dist"` e `"sourceMap": true` no `tsconfig.json`. Instale o ESLint, o `typescript-eslint` e o Prettier com os aliases do TypeScript 6 e 7; execute cada script, corrija pelo menos um detalhe de formatação e deixe anotado que pergunta cada comando responde.

## Soluções

### Solução 1

O módulo é dono dos tipos e da apresentação porque ambos descrevem o resultado do domínio. O arquivo consumidor importa o tipo com `import type`, de modo que o Node só precisa carregar a função que existe na execução.

```ts
// modelo.ts
export interface Servicio {
  readonly nombre: string;
  readonly url: string;
  readonly timeoutMs: number;
}

export type Estado =
  | {
      servicio: Servicio;
      tipo: "disponible";
      codigoHttp: number;
      duracionMs: number;
    }
  | {
      servicio: Servicio;
      tipo: "falla";
      detalle: string;
    };

export function resumen(estado: Estado): string {
  if (estado.tipo === "disponible") {
    return `${estado.servicio.nombre}: HTTP ${estado.codigoHttp}`;
  }

  return `${estado.servicio.nombre}: falla (${estado.detalle})`;
}
```

```ts
// main.ts
import { resumen, type Estado } from "./modelo.js";

const estado: Estado = {
  servicio: {
    nombre: "inventario",
    url: "https://inventario.example",
    timeoutMs: 2000,
  },
  tipo: "disponible",
  codigoHttp: 200,
  duracionMs: 31,
};

console.log(resumen(estado));
```

Não é necessário exportar uma constante de exemplo nem funções auxiliares de que apenas `resumen` precisa. O módulo oferece o contrato mínimo de que outro arquivo precisa.

### Solução 2

A tabela torna visíveis os quatro limites relevantes e um caso claramente fora da faixa. A função conserva uma regra simples: disponível inclui de 200 até antes de 300.

```ts
import assert from "node:assert/strict";

function clasificarCodigo(codigoHttp: number): "disponible" | "falla" {
  return codigoHttp >= 200 && codigoHttp < 300 ? "disponible" : "falla";
}

const casos = [
  { nombre: "199 queda debajo del rango", codigoHttp: 199, esperado: "falla" },
  { nombre: "200 inicia el rango", codigoHttp: 200, esperado: "disponible" },
  { nombre: "299 termina el rango", codigoHttp: 299, esperado: "disponible" },
  { nombre: "300 queda fuera del rango", codigoHttp: 300, esperado: "falla" },
  { nombre: "503 es falla del servidor", codigoHttp: 503, esperado: "falla" },
] as const;

for (const caso of casos) {
  assert.equal(clasificarCodigo(caso.codigoHttp), caso.esperado);
}
```

O `as const` conserva os literais de cada expectativa. Não é indispensável para este teste, mas evita que a tabela se alargue para `string` se depois você quiser reutilizar seus valores em uma função com uma união de literais.

### Solução 3

A função que lê a configuração não deve importar `node:fs/promises` nem depender do caminho do arquivo. Seu trabalho é decidir se um valor desconhecido forma uma lista válida. A leitura física do arquivo corresponde a uma camada externa, que pode viver em `main.ts` ou em um módulo pequeno dedicado à fronteira com o disco.

```ts
// configuracion.ts
export type Resultado<T> =
  | { ok: true; valor: T }
  | { ok: false; detalle: string };

export interface Servicio {
  readonly nombre: string;
  readonly url: string;
  readonly timeoutMs: number;
}

function esRegistro(valor: unknown): valor is Record<string, unknown> {
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
```

A solução reutiliza a mesma guarda `esRegistro` e as mesmas regras da lição 6: texto não vazio para nome e URL, e inteiro seguro positivo para `timeoutMs`. A validação conserva uma entrada `unknown` e devolve um contrato confiável antes de iniciar a revisão; `esRegistro` faz o estreitamento com verificações em tempo de execução, e não com uma asserção de tipo, de modo que o compilador e o programa coincidem.

### Solução 4

Os scripts convertem uma rotina oral em uma interface do projeto. Este `revisor` completo conserva `src/main.ts` como única entrada, deixa o teste ao lado da regra e repete em um projeto real as decisões explicadas acima. O modelo não muda de forma entre estes arquivos: cada `Estado` mantém o `Servicio` completo e distingue disponibilidade de falha com `tipo`.

```json fig07_04/package.json
{
  "name": "revisor",
  "private": true,
  "type": "module",
  "scripts": {
    "compilar": "tsc",
    "verificar": "tsc --noEmit",
    "arrancar": "node dist/main.js",
    "probar": "npm run compilar && node --test \"dist/**/*.test.js\"",
    "lint": "eslint src",
    "formato": "prettier --check src"
  },
  "devDependencies": {
    "@eslint/js": "10.0.1",
    "@types/node": "24",
    "@typescript/native": "npm:typescript@^7.0.2",
    "eslint": "10.11.0",
    "prettier": "3.9.9",
    "typescript": "npm:@typescript/typescript6@^6.0.2",
    "typescript-eslint": "8.71.0"
  }
}
```

```json fig07_04/tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "rootDir": "./src",
    "outDir": "./dist",
    "types": ["node"],
    "sourceMap": true
  },
  "include": ["src"]
}
```

```js fig07_04/eslint.config.js
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(js.configs.recommended, ...tseslint.configs.recommended);
```

```json fig07_04/.prettierrc
{
  "singleQuote": false,
  "printWidth": 100
}
```

```ts
// fig07_04/src/modelo.ts
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
// fig07_04/src/configuracion.ts
import type { Servicio } from "./modelo.js";

export type Resultado<T> = { ok: true; valor: T } | { ok: false; detalle: string };

function esRegistro(valor: unknown): valor is Record<string, unknown> {
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
```

```ts
// fig07_04/src/reporte.ts
import type { Estado } from "./modelo.js";

export function lineaReporte(estado: Estado): string {
  if (estado.tipo === "disponible") {
    return `${estado.servicio.nombre}: HTTP ${estado.codigoHttp} en ${estado.duracionMs} ms`;
  }

  return `${estado.servicio.nombre}: falla (${estado.detalle})`;
}
```

```ts
// fig07_04/src/revisar.ts
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

```ts
// fig07_04/src/main.ts
import { leerServicios } from "./configuracion.js";
import { lineaReporte } from "./reporte.js";
import { revisarTodos, type Consultar } from "./revisar.js";

const configuracion = leerServicios([
  { nombre: "catálogo", url: "https://catalogo.example", timeoutMs: 1500 },
  { nombre: "pagos", url: "https://pagos.example", timeoutMs: 3000 },
]);

if (!configuracion.ok) {
  throw new Error(configuracion.detalle);
}

const consultar: Consultar = async (servicio) => {
  if (servicio.nombre === "pagos") {
    throw new Error("conexión rechazada");
  }

  return { codigoHttp: 204, duracionMs: 12 };
};

const estados = await revisarTodos(configuracion.valor, consultar);

for (const estado of estados) {
  console.log(lineaReporte(estado));
}
```

```ts
// fig07_04/src/reporte.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { lineaReporte } from "./reporte.js";

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
```

```bash
$ cd fig07_04
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

✔ disponible conserva código y duración (0.341167ms)
✔ falla conserva detalle (0.057417ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 148.684583
$ npm run arrancar
> arrancar
> node dist/main.js

catálogo: HTTP 204 en 12 ms
pagos: falla (conexión rechazada)
```

`npm run verificar` responde somente sobre os tipos sem criar arquivos; `npm run probar` recompila e executa os testes descobertos em `dist/`; `npm run lint` carrega a configuração plana do ESLint; e `npm run formato` confirma que os arquivos de `src` já respeitam o Prettier. `npm run arrancar` é a pequena verificação da composição completa. Se precisar aplicar a formatação, execute `npx prettier --write src`, revise a mudança e execute `npm run formato` de novo.

## Como sei que consegui

- [ ] `npx tsc --version` imprime `Version 7.0.2` no projeto.
- [ ] `npm run verificar` termina sem diagnóstico e não cria nem atualiza arquivos em `dist/`.
- [ ] `npm run probar` compila, descobre `dist/reporte.test.js` e relata dois testes aprovados.
- [ ] `npm run lint` e `npm run formato` terminam corretamente depois de instalar e configurar suas ferramentas.
- [ ] `npm run arrancar` imprime um estado disponível e um de falha com o projeto compilado.
- [ ] Ao compilar uma importação de um nome não exportado, aparece o TS2305 no nome importado.
- [ ] Meu projeto usa importações relativas com extensão `.js` e tem `"type": "module"` no seu `package.json`.
- [ ] Meu `tsconfig.json` de Node inclui `"types": ["node"]`, `"rootDir": "./src"`, `"outDir": "./dist"` e `"sourceMap": true`.

## Para ler mais

- [TypeScript Handbook: Modules](https://www.typescriptlang.org/docs/handbook/2/modules.html) — documentação oficial sobre `export`, `import`, módulos e organização do código; consultado em 2 de outubro de 2026.

- [Node.js: executar TypeScript](https://nodejs.org/api/typescript.html) — documentação oficial sobre type stripping, sintaxe apagável e limites de executar arquivos `.ts` diretamente; consultado em 2 de outubro de 2026.

- [Node.js: ECMAScript modules](https://nodejs.org/api/esm.html) — documentação oficial sobre ESM no Node e extensões em importações relativas; consultado em 2 de outubro de 2026.

- [Node.js: `node:assert/strict`](https://nodejs.org/api/assert.html) — documentação oficial das asserções estritas usadas para verificar tabelas de casos; consultado em 2 de outubro de 2026.
