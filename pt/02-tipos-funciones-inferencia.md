# Lição 2 — Tipos, funções e inferência

**Tempo:** 90 min (ou 2 × 45)

**O que você constrói:** as funções base do `revisor`

**O que você aprende:** primitivos, inferência, uniões e literais, *narrowing*, `null`/`undefined` com `strictNullChecks`

## Ao terminar, você vai conseguir

- Declarar valores `string`, `number` e `boolean`, e explicar quando o TypeScript consegue inferir o tipo deles.
- Escrever funções com parâmetros e retornos tipados para separar regras do `revisor`.
- Modelar valores que podem ter mais de uma forma por meio de uniões e literais.
- Reduzir uma união com `typeof`, comparações e verificações explícitas antes de usar um valor.
- Diferenciar `null` de `undefined` e tratar ambos sem desativar o `strictNullChecks`.
- Ler e corrigir os diagnósticos TS2345, TS2322, TS18048 e TS2339.
- Compilar e executar funções determinísticas do `revisor` com `strict`.

## O porquê antes do como

O `revisor` vai acabar consultando vários serviços, reunindo resultados e mostrando-os em uma API e em um painel web. Antes de chegar a HTTP, promessas ou React, ele precisa de uma camada pequena, mas importante: funções que transformem dados simples em decisões legíveis. Elas receberão um nome, uma duração, um código HTTP ou um detalhe de falha, e devolverão uma classificação ou uma linha de relatório.

Em JavaScript, você poderia escrever essas funções sem descrever nenhum tipo. O programa executaria uma chamada como `clasificarDuracion("rápido")` até tentar comparar o texto com um número. O erro apareceria durante a execução, talvez longe da linha em que o argumento incorreto foi passado. Se o ramo que contém o problema não for executado durante um teste manual, o erro pode ficar escondido até que um dado real o ative.

O TypeScript muda o momento em que você recebe essa informação. Uma função pode declarar que espera um número de milissegundos e devolve uma string. O compilador então revisa cada chamada conhecida: se alguém passar texto, ele marca a contradição antes de emitir o JavaScript. O tipo não torna a regra de negócio automaticamente correta; você ainda precisa decidir se 500 ms é rápido ou lento. O que ele faz é garantir que a regra receba o tipo de dado para o qual foi escrita.

Essa diferença parece pequena quando há uma única função e dois valores. Torna-se decisiva quando o programa cresce. Uma função com um nome claro e uma assinatura precisa é uma fronteira: quem a chama sabe o que deve entregar, quem a mantém sabe o que pode assumir lá dentro, e o compilador confere que as duas partes coincidem. Em Go, os parâmetros e os retornos também fazem parte da assinatura. O TypeScript conserva essa disciplina, embora seus tipos sejam apagados antes de o Node executar o arquivo.

A lição anterior deixou o ambiente pronto e mostrou que o TypeScript emite JavaScript. Esta lição começa a usar essa verificação de maneira útil. Você não vai anotar um tipo em cada caractere nem transformar o código em uma parede de sintaxe. Vai deixar o compilador inferir o óbvio e escrever contratos onde a intenção precisa ficar visível: limites de uma função, alternativas possíveis e ausências que o programa deve tratar.

O primeiro risco do `revisor` não é uma rede lenta; é perder significado. Um texto como `"200"` pode parecer um código HTTP, mas continua sendo texto. Um valor `undefined` pode significar que ninguém forneceu um detalhe, que uma propriedade não existe ou que uma função não devolveu nada. Um valor `"disponible"` parece uma string comum até você torná-lo parte de um conjunto fechado de estados. Os tipos servem para conservar esses significados enquanto os valores passam de uma função para outra.

Você não precisa aprender cada tipo do TypeScript hoje. Na verdade, tentar decorar todos antes de escrever funções produz uma ideia equivocada: a de que programar com tipos consiste em preencher formulários sintáticos. A ordem útil é outra. Primeiro você identifica que valores o problema tem. Depois define o que entra e o que sai de uma operação. Por último, torna explícitas as dúvidas que ainda não podem ser resolvidas com um único tipo.

O `revisor` usará objetos `Servicio` e `Estado` na próxima lição. Aqui ainda não convém antecipar esse modelo completo. Você vai trabalhar com os componentes dele: o nome de um serviço, uma duração, um código e um detalhe. Assim você aprende o que significa uma assinatura sem misturá-la com propriedades, interfaces ou uniões discriminadas. Quando esses tipos compostos aparecerem, você vai reconhecer que são feitos das mesmas peças que pratica hoje.

## Os conceitos

### Primitivos, anotações e inferência

Os valores mais frequentes do `revisor` começam como primitivos do JavaScript. Um nome ou uma URL são `string`; um limite ou uma duração são `number`; uma decisão de sim ou não é `boolean`. Escreva os nomes em minúsculas: `string`, `number` e `boolean`. `String`, `Number` e `Boolean` existem como construtores e como tipos de objetos envoltórios, mas não são a forma habitual de anotar valores comuns.

O JavaScript não distingue entre inteiro e decimal como o Go faz. No TypeScript, `443`, `1500` e `42.5` são `number`. Essa decisão vem do modelo numérico do JavaScript: um código HTTP, uma porta e uma duração podem compartilhar o tipo básico embora tenham significados diferentes. Mais adiante, nomes claros, objetos e validações ajudarão a conservar o contexto. Por ora, não declare um suposto `int`: ele não existe como tipo primitivo do TypeScript.

Uma anotação vai depois do nome: `const timeoutMs: number = 1500`. Não é obrigatório escrevê-la quando o valor inicial já expressa o tipo. Em `const timeoutMs = 1500`, o TypeScript infere que o valor é um número. A inferência não é um palpite que só acontece no editor; faz parte da revisão do programa. O compilador observa o inicializador e conserva informação suficiente para verificar os usos posteriores.

```ts
// fig02_01.ts
const nombre = "catálogo";
const timeoutMs: number = 1500;
const usaHttps = true;

console.log(`${nombre}: ${timeoutMs} ms; HTTPS: ${usaHttps}`);
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig02_01.ts
$ node fig02_01.js
catálogo: 1500 ms; HTTPS: true
```

A anotação de `timeoutMs` é válida, mas a linha também teria compilado sem `: number`. Não escreva anotações repetitivas só porque elas existem. Se o valor e o nome deixam a intenção clara, a inferência reduz o ruído sem perder segurança. Já uma anotação é especialmente útil em uma assinatura pública, em um retorno que você quer manter estável ou onde o valor inicial não comunica o contrato completo.

`const` e `let` têm a ver com se uma variável pode ser reatribuída, não com o TypeScript verificar tipos. Use `const` por padrão quando o nome continuar apontando para o mesmo valor. Use `let` quando a variável precisar receber outro valor mais adiante. Evite `var`: ele tem regras de escopo antigas e dificulta acompanhar onde um valor pode mudar.

```ts
// fig02_02.ts
let pendientes = 2;
pendientes = pendientes - 1;

const mensaje = pendientes === 0 ? "sin pendientes" : `${pendientes} pendiente`;

console.log(mensaje);
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig02_02.ts
$ node fig02_02.js
1 pendiente
```

No `revisor`, as configurações que não mudam durante uma execução normalmente serão expressas com `const`. Uma duração calculada, um código HTTP recebido ou um contador local poderiam usar `let` se a lógica precisar atualizá-los. A pergunta não é “qual palavra eu uso mais?”, e sim “este nome deve apontar para outro valor?”. Escolher `const` sempre que possível reduz os caminhos possíveis de mudança e facilita a leitura de uma função.

A inferência também tem limites saudáveis. Se você declara `let estado = "pendiente"`, o TypeScript costuma inferir `string`, e não apenas o literal `"pendiente"`, porque `let` permite reatribuir. Se você declara `const estado = "pendiente"`, o valor não muda e pode conservar uma informação mais específica. Essa diferença será útil ao modelar literais. Não force a precisão em cada variável local; use-a quando o conjunto de alternativas tiver significado para o domínio.

Dentro do `revisor`, você não precisa declarar uma variável separada para cada dado se ele só é usado uma vez. Uma função pode receber um valor e devolver outro imediatamente. Declare nomes quando ajudarem a ler a regra, não para simular que cada passo exige armazenamento. Um nome como `limiteRapidoMs` explica uma decisão; um nome como `x` obriga a procurar sua origem toda vez.

### Funções: contratos que entram e saem

Uma função recebe valores, executa uma regra e pode devolver um resultado. Em JavaScript, essa estrutura já existe. O TypeScript acrescenta a possibilidade de descrever os parâmetros e o retorno dela. A assinatura `function clasificarDuracion(duracionMs: number): string` diz três coisas: a função se chama `clasificarDuracion`, espera um número e produz uma string.

Os tipos dos parâmetros são contratos com as chamadas. Dentro da função, `duracionMs` pode ser usado como número. Fora dela, uma chamada deve fornecer um número. O tipo de retorno é um contrato na outra direção: quem chama pode tratar o resultado como uma string. Essa informação permite que o editor ofereça operações adequadas e que o compilador encontre incompatibilidades antes de executar.

```ts
// fig02_03.ts
function duplicar(valor: number): number {
  return valor * 2;
}

const resultado = duplicar(21);

console.log(resultado);
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig02_03.ts
$ node fig02_03.js
42
```

O retorno `: number` neste exemplo poderia ser inferido, porque `valor * 2` produz um número. Ainda assim, é razoável escrever o retorno em funções que representam regras do programa. A assinatura se torna uma leitura rápida da intenção e evita que uma edição posterior mude acidentalmente o que a função promete devolver. Não é uma obrigação absoluta: em funções locais muito curtas, deixar o TypeScript inferir o retorno pode ser mais claro.

Uma função que só realiza um efeito, por exemplo imprimir uma linha, pode declarar o retorno `void`. `void` não significa exatamente que não exista um valor em JavaScript; significa que quem chama não deve depender de um resultado útil. No `revisor`, convém separar as funções que calculam texto das que o imprimem. A primeira pode ser testada com entradas e saídas precisas; a segunda se limita a apresentar esse resultado.

```ts
// fig02_04.ts
function clasificarDuracion(duracionMs: number): string {
  if (duracionMs <= 500) {
    return "rápido";
  }

  return "lento";
}

function imprimirClasificacion(nombre: string, duracionMs: number): void {
  console.log(`${nombre}: ${clasificarDuracion(duracionMs)}`);
}

imprimirClasificacion("catálogo", 420);
imprimirClasificacion("pagos", 850);
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig02_04.ts
$ node fig02_04.js
catálogo: rápido
pagos: lento
```

A decisão de que 500 ms seja o limite não vem do tipo. É uma regra deste exemplo. O TypeScript verifica que a comparação recebe um número e que os caminhos devolvem strings; não pode decidir por você que limiar representa um serviço aceitável. Essa fronteira é importante: os tipos protegem a forma de uma decisão, enquanto testes, observação e requisitos definem se a decisão é a correta.

Uma assinatura com vários parâmetros pode ser apropriada enquanto os valores forem poucos e tiverem significados distintos. `formatearLinea(nombre, duracionMs)` é fácil de ler. Quando os parâmetros começam a ser numerosos, opcionais ou fáceis de trocar entre si, um objeto com nomes de propriedades será melhor. Essa transição chega na próxima lição com `Servicio`. Não se adiante criando objetos anônimos para uma função que só precisa de um número e de um texto.

As funções também ajudam a evitar duplicação. Se cada parte do programa decide por conta própria que duração é rápida, mais cedo ou mais tarde vão aparecer limites diferentes. Centralizar a regra em `clasificarDuracion` não torna o programa mágico, mas deixa uma única decisão a revisar quando o critério mudar. O painel, a API e os testes poderão usar a mesma função ou uma regra equivalente bem definida.

Em Go, a assinatura de uma função exige tipos explícitos para parâmetros e retornos. O TypeScript é mais flexível porque pode inferir parte dessa informação, mas você não perde nada ao usar tipos nos limites importantes. A diferença útil é que o TypeScript trabalha sobre os valores do JavaScript e permite uniões muito expressivas; a disciplina continua sendo a mesma: uma função pequena deve dizer o que precisa e o que garante.

### Uniões e literais: representar alternativas reais

Uma união expressa que um valor pode pertencer a uma entre várias alternativas. Escreve-se com `|`: `string | number` significa “uma string ou um número”. Não significa “ambos ao mesmo tempo”, nem que você possa usar livremente todas as operações dos dois tipos. Significa que, antes de usar uma operação exclusiva de uma alternativa, você terá de saber qual delas tem em mãos.

Os literais permitem ser mais preciso do que um tipo amplo. `"disponible"` é uma string concreta; `"disponible" | "falla"` é um conjunto fechado de duas strings concretas. Essa precisão é útil quando um texto não é uma mensagem qualquer, e sim uma categoria do domínio. O estado de uma revisão não deveria aceitar `"tal vez"` por acidente se o programa só entende disponível ou falha.

```ts
// fig02_05.ts
type Prioridad = "normal" | "urgente";

function etiquetaPrioridad(prioridad: Prioridad): string {
  return prioridad === "urgente" ? "atención inmediata" : "seguimiento normal";
}

console.log(etiquetaPrioridad("normal"));
console.log(etiquetaPrioridad("urgente"));
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig02_05.ts
$ node fig02_05.js
seguimiento normal
atención inmediata
```

O nome `Prioridad` não cria um valor durante a execução; é um alias de tipo. O JavaScript emitido só conserva a função, as comparações e as strings. Ainda assim, durante a compilação ele impede uma chamada como `etiquetaPrioridad("crítica")` até que você decida explicitamente incorporar essa alternativa ao contrato.

Os literais não são uma decoração para cada texto. Se uma variável guarda uma mensagem livre escrita por uma pessoa, normalmente ela deve ser `string`. Se guarda um valor de controle que modifica a lógica, um literal ou uma união de literais torna visíveis as opções permitidas. A pergunta útil é: “aceito qualquer texto ou só categorias conhecidas?”.

Dentro do `revisor`, uma classificação inicial pode ser uma união de literais antes de se tornar o modelo mais completo de `Estado`. A função a seguir recebe um código HTTP e produz uma categoria limitada. Não pretende substituir todas as regras do HTTP; apenas deixa claro que o relatório inicial distingue dois resultados observáveis.

```ts
// fig02_06.ts
type ResultadoBasico = "disponible" | "falla";

function resultadoDesdeCodigo(codigoHttp: number): ResultadoBasico {
  if (codigoHttp >= 200 && codigoHttp < 400) {
    return "disponible";
  }

  return "falla";
}

console.log(resultadoDesdeCodigo(204));
console.log(resultadoDesdeCodigo(503));
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig02_06.ts
$ node fig02_06.js
disponible
falla
```

A faixa escolhida é uma simplificação deliberada para esta etapa. Mais adiante o `revisor` precisará distinguir falhas de rede, tempos esgotados, códigos de insucesso e respostas válidas. O ganho atual é aprender a expressar que uma função não devolve uma string arbitrária. Suas saídas possíveis estão nomeadas e são finitas.

Não confunda uma união com uma lista de valores que o programa deve percorrer. `string | number` descreve uma possibilidade de tipo; não cria um array. Também não é um convite para transformar tudo em uniões. Se uma função sempre recebe um número, declarar `number | string` só para aceitar mais casos a torna mais difícil de usar. Amplie um contrato quando a realidade do domínio exigir alternativas, não para evitar decidir que dado deve chegar.

### *Narrowing*: usar uma alternativa só depois de verificá-la

Quando uma função recebe uma união, o TypeScript precisa ser conservador. Se ela recebe `string | number`, pode aplicar operações que as duas alternativas compartilhem, mas não `toUpperCase`, porque os números não têm esse método. A solução não é uma asserção nem `any`: é verificar o valor com uma condição que também seria necessária em JavaScript.

A redução de tipo, ou *narrowing* (estreitamento de tipo), acontece quando o TypeScript entende que um ramo elimina alternativas. `typeof valor === "string"` reduz `string | number` a `string` dentro desse ramo. Fora dele, ou no ramo contrário, o tipo se ajusta de acordo com a condição. O programa se torna seguro porque a verificação em tempo de execução e o conhecimento estático expressam a mesma decisão.

```ts
// fig02_07.ts
function mostrarPuerto(puerto: number | string): string {
  if (typeof puerto === "string") {
    return `puerto configurado: ${puerto}`;
  }

  return `puerto numérico: ${puerto}`;
}

console.log(mostrarPuerto(443));
console.log(mostrarPuerto("8080"));
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig02_07.ts
$ node fig02_07.js
puerto numérico: 443
puerto configurado: 8080
```

Neste exemplo, as duas alternativas acabam interpoladas como texto, então o código pode parecer desnecessário. O propósito dele é mostrar onde cada forma fica disponível. Se você precisasse aplicar `puerto.padStart(4, "0")`, só poderia fazê-lo dentro do ramo da string. Se precisasse compará-lo numericamente com um limite, faria sentido tratar o ramo numérico ou converter e validar o texto de maneira explícita.

A igualdade com um literal também reduz tipos. Se `resultado` é `"disponible" | "falla"`, a condição `resultado === "disponible"` permite que o TypeScript trate o valor como o literal `"disponible"` dentro do ramo. Isso pode parecer redundante porque as duas alternativas são strings, mas se torna essencial quando cada alternativa traz dados diferentes em uma união discriminada. Essa construção chegará na lição 3.

Dentro do `revisor`, uma função pode aceitar uma duração que ainda não está disponível. Se ela existe, classifica a duração; se não, devolve um texto que explique a ausência. A verificação não serve só para acalmar o compilador: define o que uma pessoa deve ver quando o programa não tem uma medição.

```ts
// fig02_08.ts
function resumenDuracion(duracionMs: number | undefined): string {
  if (duracionMs === undefined) {
    return "sin duración registrada";
  }

  return duracionMs <= 500 ? `${duracionMs} ms: rápido` : `${duracionMs} ms: lento`;
}

console.log(resumenDuracion(320));
console.log(resumenDuracion(undefined));
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig02_08.ts
$ node fig02_08.js
320 ms: rápido
sin duración registrada
```

Não invente uma duração como `0` para evitar tratar `undefined`. Zero pode ser uma medição real, uma duração impossível ou um valor de marcação, dependendo do sistema. Trocar “não há dado” por um número mistura dois significados diferentes e deixa que uma condição posterior tire uma conclusão equivocada. Uma união obriga a nomear a ausência e a decidir o que fazer com ela.

Evite também uma condição baseada na veracidade de um número quando o que você precisa verificar é a ausência. `if (!duracionMs)` trata `0`, `NaN`, `null` e `undefined` como falsos. Se a pergunta é “a duração está ausente?”, escreva `duracionMs === undefined` ou a verificação exata que represente a sua regra. As condições de veracidade são úteis, mas não substituem uma decisão precisa sobre valores válidos.

### `null`, `undefined` e `strictNullChecks`

O JavaScript tem dois valores frequentes para expressar ausência: `undefined` e `null`. `undefined` aparece, por exemplo, ao ler uma propriedade inexistente, omitir um argumento opcional ou terminar uma função sem `return`. `null` costuma ser um valor atribuído intencionalmente para dizer que não há resultado. A linguagem não impõe uma diferença universal; o projeto deve escolher convenções que comuniquem a intenção.

Com o `strictNullChecks` ativo, `null` e `undefined` não podem ser usados onde se espera uma `string`, um `number` ou outro tipo não anulável. Para admiti-los, você deve escrevê-lo: `string | undefined`, `string | null` ou `string | null | undefined`. Essa exigência não é burocracia. Faz o contrato revelar que uma função pode não ter uma resposta e obriga a tratar essa possibilidade antes de chamar métodos ou ler propriedades.

```ts
// fig02_09.ts
function detalleVisible(detalle: string | null): string {
  if (detalle === null) {
    return "sin detalle";
  }

  return detalle.toUpperCase();
}

console.log(detalleVisible("tiempo agotado"));
console.log(detalleVisible(null));
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig02_09.ts
$ node fig02_09.js
TIEMPO AGOTADO
sin detalle
```

Não há uma regra geral que diga que `null` é sempre melhor do que `undefined`. Para um parâmetro opcional de uma função, `undefined` costuma se encaixar no comportamento normal do JavaScript: se quem chama omite o argumento, o valor é `undefined`. Para um dado cuja fonte comunica explicitamente “não existe”, `null` pode ser uma boa representação. O importante é não usar ambos como sinônimos sem motivo, porque você obriga cada consumidor a tratar duas formas da mesma ausência.

O `revisor` usará `undefined` quando uma função local não recebeu uma duração ou não gerou um detalhe. Quando uma futura API receber JSON, terá de validar se o campo está ausente, se vale `null` ou se contém outro tipo. Essas fronteiras externas são estudadas na lição 6. Por ora, os tipos só descrevem valores internos que você já decidiu representar de certa forma.

```ts
// fig02_10.ts
function lineaDeFalla(nombre: string, detalle: string | undefined): string {
  if (detalle === undefined) {
    return `${nombre}: falla sin detalle`;
  }

  return `${nombre}: falla (${detalle})`;
}

console.log(lineaDeFalla("pagos", "tiempo agotado"));
console.log(lineaDeFalla("catálogo", undefined));
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig02_10.ts
$ node fig02_10.js
pagos: falla (tiempo agotado)
catálogo: falla sin detalle
```

O `strictNullChecks` não protege você contra dados externos por si só. Um JSON pode afirmar qualquer coisa e uma asserção como `as string` pode mentir para o compilador. A proteção dessa opção começa quando um valor tem um tipo confiável dentro do programa: evita que você esqueça que ele pode faltar. A validação que converte entradas desconhecidas em dados confiáveis exige verificações em tempo de execução e chegará mais adiante.

Em Go, um valor zero pode ocultar uma ausência se não for modelado com cuidado: uma string vazia e o número zero podem ser valores válidos ou sinais de que não houve dado. O TypeScript torna a ausência visível com uniões. Isso não elimina a necessidade de projetar uma convenção, mas dificulta ignorar uma possibilidade que a assinatura já declarou.

## O erro que você vai ver

O TS2345 aparece quando um argumento não coincide com o tipo de um parâmetro. Com o TypeScript 7.0.2, o `tsc` imprime o diagnóstico a seguir. A função espera um `number`, mas a chamada entrega uma string entre aspas.

```ts
// fig02_11.ts

function etiquetaPuerto(puerto: number): string { return `puerto ${puerto}`; }

console.log(etiquetaPuerto("443"));
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig02_11.ts
fig02_11.ts(5,28): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
```

O TS2345 não significa que o TypeScript não consiga trabalhar com o valor. Significa que esta chamada contradiz o contrato desta função. A correção depende da intenção. Se 443 é uma porta conhecida escrita no código, tire as aspas: `etiquetaPuerto(443)`. Se o valor chegou como texto da configuração, não o converta com uma asserção; valide e transforme o dado na fronteira antes de entregá-lo a uma função que exige um número.

O TS2322 aparece quando você tenta atribuir um tipo incompatível a uma variável, propriedade ou retorno tipado. É o mesmo problema de compatibilidade, mas visto em uma atribuição em vez de em uma chamada. Por exemplo, `const timeoutMs: number = "1500"` produz o TS2322 porque o lado esquerdo exige um número e o lado direito oferece uma string. Leia os dois lados do diagnóstico antes de mudar o código: com frequência ele revela uma decisão de domínio que ainda não está clara.

O TS18048 aparece quando você usa um valor que pode ser `undefined` como se sempre existisse. O arquivo a seguir não compila porque `toUpperCase` só pode ser chamado sobre uma string presente.

```ts
// fig02_12.ts

function detalleEnMayusculas(detalle: string | undefined): string {
  return detalle.toUpperCase();
}
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig02_12.ts
fig02_12.ts(4,10): error TS18048: 'detalle' is possibly 'undefined'.
```

A correção não é desativar o `strictNullChecks` nem escrever `detalle!` para calar o diagnóstico. Primeiro você deve decidir o que a ausência representa. Se não há detalhe, talvez o relatório deva dizer `"sin detalle"`. Se um detalhe é obrigatório, então a assinatura deve ser `detalle: string` e quem chama deve fornecer um. Se a ausência é válida, verifique-a antes de usar o valor:

```ts
function detalleEnMayusculasSeguro(detalle: string | undefined): string {
  if (detalle === undefined) {
    return "SIN DETALLE";
  }

  return detalle.toUpperCase();
}
```

O TS2339 costuma aparecer ao tentar usar uma operação que não existe em todos os membros de uma união. Por exemplo, `valor.toUpperCase()` não é válido se `valor` é `string | number`, porque um número não tem esse método. Use `typeof valor === "string"` antes de aplicar uma operação exclusiva de strings. A verificação não é um trâmite para o compilador: é o ramo de execução que impede o Node de tentar chamar um método inexistente.

Quando aparecer um desses diagnósticos, evite procurar primeiro uma conversão ou uma asserção. Faça três perguntas: que valor existe de fato nesse ponto, que valor a função ou variável espera, e se a diferença reflete um dado inválido ou uma alternativa válida que falta modelar. Essa sequência costuma encontrar o problema mais perto da causa do que uma correção rápida que só faz o código TSxxxx desaparecer.

## O que se faz errado

- **Anotar cada variável mesmo que o inicializador já seja claro.** `const nombre: string = "catálogo"` não é incorreto, mas repetir informação em cada linha esconde as anotações que de fato expressam uma decisão. Deixe o TypeScript inferir valores locais evidentes; anote assinaturas, contratos e pontos onde o tipo precisa ficar explícito.

- **Usar `any` para fazer um erro de tipos sumir.** O `any` desativa verificações justamente onde o TypeScript poderia detectar uma integração incorreta. Se um dado de fora ainda não tem forma conhecida, ele será `unknown` até ser validado. Se um dado interno tem alternativas válidas, use uma união e reduza-a.

- **Aceitar `string | number` quando o domínio precisa de um número.** Uma união ampla pode parecer flexível, mas obriga cada função a tratar dois casos. Se uma porta deve ser numérica dentro do `revisor`, converta-a e valide-a uma vez, na entrada; depois use `number` no resto do programa.

- **Usar `as` ou `!` para esconder o TS18048.** Uma asserção não torna presente um valor ausente. `detalle!` pode compilar, mas o Node continuará falhando se o valor era `undefined`. Modele a ausência, verifique-a e defina o resultado que cada caso deve produzir.

- **Representar a ausência com `0`, `""` ou `false` sem defini-lo.** Esses valores podem ser dados válidos. Se `0` significa “não houve medição”, você já não conseguirá distingui-lo de uma medição real de zero. Use `undefined` ou `null` quando a ausência fizer parte do contrato e conserve os valores válidos para o seu significado próprio.

- **Confundir uma união com permissão para ignorar alternativas.** Se uma assinatura declara `string | undefined`, toda pessoa que a use deve decidir o que acontece quando não há string. A união não faz o valor ser uma string; torna visível que o programa tem dois caminhos.

- **Escrever regras de classificação repetidas.** Se uma parte considera rápido um serviço de 500 ms e outra usa 300 ms, o relatório perde consistência. Nomeie e centralize a regra em uma função pequena. Quando o critério mudar, haverá uma decisão explícita a atualizar e testar.

## Exercícios

### Exercício 1 — Classificar uma duração

Escreva `clasificarDuracion(duracionMs: number): "rápido" | "lento"`. Defina que uma duração de 500 ms ou menos é `"rápido"` e uma maior é `"lento"`. Invoque a função com 500 e 501, imprima as duas saídas e confirme que uma chamada com `"500"` produz o TS2345.

### Exercício 2 — Uma linha de base para o revisor

Escreva `lineaBase(nombre: string, codigoHttp: number, duracionMs: number): string`. Ela deve usar `clasificarDuracion` e devolver uma linha como `catálogo: HTTP 200, rápido`. Execute a função com catálogo, código 200 e duração 320. Depois tente passar `"200"` como código e explique por que o compilador o rejeita.

### Exercício 3 — Detalhes que podem faltar

Escreva `lineaDeFalla(nombre: string, detalle: string | undefined): string`. Se existir um detalhe, deve produzir `nombre: falla (detalle)`; se não existir, deve produzir `nombre: falla sin detalle`. Teste os dois casos sem usar `any`, `as` nem o operador `!`.

### Exercício 4 — Um literal obriga a decidir

Defina `type ResultadoBasico = "disponible" | "falla"`. Escreva `resultadoDesdeCodigo(codigoHttp: number): ResultadoBasico` para classificar os códigos de 200 a 399 como disponíveis e os demais como falha. Depois crie `etiquetaResultado(resultado: ResultadoBasico): string`, que devolva um texto diferente para cada alternativa. Tente chamá-la com `"pendiente"` e explique o diagnóstico.

## Soluções

### Solução 1

O retorno é uma união de literais porque a função não deve produzir qualquer string. A comparação inclui 500, por isso se usa `<=`.

```ts
type Clasificacion = "rápido" | "lento";

function clasificarDuracion(duracionMs: number): Clasificacion {
  return duracionMs <= 500 ? "rápido" : "lento";
}
```

Uma chamada como `clasificarDuracion("500")` produz o TS2345. As aspas fazem o valor ser `string`, enquanto a função foi escrita para comparar números.

### Solução 2

A função recebe três valores simples porque esta etapa ainda não introduz o objeto `Servicio`. A função de classificação evita duplicar a regra dos 500 ms.

```ts
function lineaBase(nombre: string, codigoHttp: number, duracionMs: number): string {
  const clasificacion = clasificarDuracion(duracionMs);
  return `${nombre}: HTTP ${codigoHttp}, ${clasificacion}`;
}
```

A chamada correta é `lineaBase("catálogo", 200, 320)`. Usar `"200"` contradiz o contrato: um código HTTP é manipulado como número dentro desta função.

### Solução 3

A comparação exata com `undefined` reduz o tipo a `string` no segundo retorno. Assim, `detalle.toUpperCase()` ou qualquer outra operação de string seria segura dentro desse ramo.

```ts
function lineaDeFalla(nombre: string, detalle: string | undefined): string {
  if (detalle === undefined) {
    return `${nombre}: falla sin detalle`;
  }

  return `${nombre}: falla (${detalle})`;
}
```

A ausência não é disfarçada de string vazia. O relatório conserva a diferença entre receber uma mensagem e não recebê-la.

### Solução 4

A união de literais restringe tanto o que a função classificadora devolve quanto o que a função de apresentação aceita.

```ts
type ResultadoBasico = "disponible" | "falla";

function resultadoDesdeCodigo(codigoHttp: number): ResultadoBasico {
  return codigoHttp >= 200 && codigoHttp < 400 ? "disponible" : "falla";
}

function etiquetaResultado(resultado: ResultadoBasico): string {
  if (resultado === "disponible") {
    return "el servicio respondió";
  }

  return "el servicio necesita atención";
}
```

`etiquetaResultado("pendiente")` produz o TS2345 porque `"pendiente"` não pertence ao conjunto declarado. Se o programa realmente precisa dessa alternativa, você deve adicioná-la ao tipo e atualizar as funções que a tratam.

## Como sei que consegui

- [ ] `npx tsc --version` imprime `Version 7.0.2`.
- [ ] Cada figura que compila nesta lição termina sem diagnósticos com `--strict --target ES2022 --module nodenext`.
- [ ] `fig02_04.ts` imprime exatamente `catálogo: rápido` e `pagos: lento`.
- [ ] `fig02_08.ts` imprime uma classificação para 320 ms e `sin duración registrada` para `undefined`.
- [ ] Ao compilar `fig02_11.ts`, você obtém o TS2345 e não executa o arquivo como se tivesse compilado.
- [ ] Ao compilar `fig02_12.ts`, você obtém o TS18048 e consegue corrigi-lo com uma verificação explícita de `undefined`.
- [ ] Você consegue escrever uma função que devolva `"disponible" | "falla"` sem aceitar uma terceira string por acidente.
- [ ] Você consegue explicar por que o `strictNullChecks` obriga a tratar uma ausência em vez de convertê-la em `0`, `""` ou `false`.

## Para ler mais

- [TypeScript Handbook: Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html) — documentação oficial sobre primitivos, anotações, inferência, funções, uniões e literais. Consultado em 2 de outubro de 2026.

- [TypeScript Handbook: More on Functions](https://www.typescriptlang.org/docs/handbook/2/functions.html) — documentação oficial sobre assinaturas, parâmetros, retornos, inferência e funções que não devolvem um valor útil. Consultado em 2 de outubro de 2026.

- [TypeScript TSConfig: `strictNullChecks`](https://www.typescriptlang.org/tsconfig/strictNullChecks.html) — documentação oficial sobre o tratamento separado de `null` e `undefined` no modo estrito. Consultado em 2 de outubro de 2026.

- [MDN: operador `null`](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Reference/Operators/null) — referência sobre `null` em JavaScript e sua diferença prática em relação a outros valores ausentes. Consultado em 2 de outubro de 2026.
