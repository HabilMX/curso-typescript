# Lição 4 — Coleções, genéricos e erros

**Tempo:** 2 × 45 min

**O que você constrói:** a lista de serviços e o relatório

**O que você aprende:** arrays, `Map`/`Set`, genéricos, tipos utilitários; erros: exceções vs resultado, `unknown` em `catch`

## Ao terminar, você vai conseguir

- Construir e percorrer uma lista tipada de `Servicio` sem perder a relação entre cada serviço e sua configuração.
- Escolher entre um array, um `Map` e um `Set` conforme a pergunta que o `revisor` precisa responder.
- Escrever uma função genérica que conserve a relação entre o tipo que recebe e o tipo que devolve.
- Usar `Pick`, `Omit`, `Readonly` e `Record` para derivar contratos sem duplicar o modelo.
- Representar uma operação que pode falhar com uma união discriminada de resultado.
- Corrigir um acesso inseguro a um valor `unknown` dentro de `catch` sem usar `any`.

## O porquê antes do como

O modelo da lição anterior definiu o que é um `Servicio` e que formas um `Estado` pode ter. Isso resolveu uma parte importante do problema: cada valor já tem uma forma explícita. No entanto, um revisor de verdade não consulta um único serviço. Ele precisa conservar uma lista de destinos, revisar cada um, reunir seus estados e produzir um relatório que permita responder a perguntas concretas: quantos serviços foram configurados, quais falharam, que resultado corresponde ao catálogo e que nomes foram repetidos acidentalmente.

Em JavaScript é fácil começar com vários valores soltos. Você pode criar `catalogo`, `pagos` e `inventario` como variáveis independentes e depois chamar uma função para cada uma. A abordagem serve para uma demonstração pequena, mas o programa fica frágil assim que a configuração muda. Acrescentar um serviço obriga a procurar em vários lugares; ordenar o relatório exige repetir lógica; e evitar nomes duplicados vira uma regra que ninguém está verificando.

As coleções permitem expressar que os dados formam um conjunto com uma relação concreta. Um array responde “quais são os serviços e em que ordem quero percorrê-los?”. Um `Map` responde “dado este nome, qual é o seu estado?”. Um `Set` responde “já vi este nome?”. As três estruturas podem conter dados relacionados, mas não fazem o mesmo trabalho. Escolher uma estrutura por costume, em vez de pela pergunta que você precisa responder, costuma produzir código mais lento de ler e mais fácil de quebrar.

Também aparece uma dificuldade que não se vê com um único tipo. O `revisor` vai processar arrays de serviços, arrays de estados e talvez arrays de mensagens para o painel. Você poderia escrever uma função diferente para cada array, mas acabaria copiando a mesma lógica. Uma função genérica permite descrever a relação que se conserva mesmo quando o tipo dos elementos muda. Não se trata de substituir todos os tipos por uma letra misteriosa: trata-se de dizer com precisão que o resultado continua sendo do mesmo tipo que a entrada.

Por fim, esta lição precisa falar de falhas antes que a lição 5 acrescente operações assíncronas e consultas reais. Um programa pode falhar porque um serviço não respondeu, porque a configuração tem dados incoerentes ou porque uma função recebeu algo que não esperava. O JavaScript permite lançar quase qualquer valor com `throw`: uma instância de `Error`, uma string, um número ou até um objeto incompleto. O TypeScript estrito parte dessa realidade e trata o valor do `catch` como `unknown`. Essa decisão pode parecer incômoda no começo, mas evita que o próprio código de tratamento de erros falhe ao tentar ler uma propriedade que talvez não exista.

Em Go, uma função costuma devolver um valor e um `error`, e quem chama decide se pode continuar. O JavaScript e o TypeScript também têm exceções: uma operação pode interromper o fluxo normal com `throw`, e outro bloco pode capturá-la com `catch`. Nenhum dos mecanismos é automaticamente melhor. A diferença útil é decidir que tipo de falha cada um representa. Uma exceção serve para um problema excepcional que atravessa várias camadas ou para interoperar com uma biblioteca que já lança erros. Um resultado tipado serve quando falhar é uma possibilidade normal do domínio e quem chama precisa tomar uma decisão visível.

O relatório do `revisor` não deve depender de que uma exceção invisível corte toda a execução. Se pagos falha e catálogo responde, o relatório ainda precisa mostrar os dois fatos. Por isso o resultado de revisar cada serviço será modelado como uma união discriminada: sucesso com um valor, ou falha com um detalhe. A exceção, se aparecer em uma camada inferior, é convertida nesse resultado antes de seguir adiante. Assim o resto do programa trabalha com dados explícitos e o painel pode mostrar um relatório completo.

Essa separação também evita uma falsa promessa. O TypeScript pode verificar que uma função que devolve `Resultado<Estado>` entrega uma das duas alternativas declaradas. Não pode garantir que uma URL exista nem que uma resposta HTTP descreva corretamente a saúde de um serviço. A validação de dados externos chegará na lição 6. Aqui você vai construir as estruturas e os contratos internos que tornarão possível receber, organizar e reportar esses dados sem confundir uma ausência com um sucesso.

## Os conceitos

### Arrays: uma lista ordenada e tipada

Um array do TypeScript usa a mesma estrutura que um array do JavaScript. Conserva uma ordem de inserção, permite percorrer seus elementos e tem um comprimento acessível com `length`. A diferença é que o TypeScript pode descrever que tipo de elementos pertence à lista. `Servicio[]` significa “array cujos elementos são serviços”; não significa “um objeto que por acaso tem algumas propriedades parecidas”.

A ordem é uma propriedade importante. Se a configuração lista catálogo, pagos e inventário nessa ordem, o relatório pode respeitá-la para que quem o lê encontre os resultados onde espera. Um array é apropriado quando você quer percorrer todos os elementos, conservar sua sequência ou transformar cada um com operações como `map`, `filter` e `find`.

```ts
// fig04_01.ts
interface Servicio {
  readonly nombre: string;
  readonly url: string;
  timeoutMs: number;
}

function nombresDe(servicios: readonly Servicio[]): string {
  return servicios.map((servicio) => servicio.nombre).join(", ");
}

const servicios: Servicio[] = [
  {
    nombre: "catálogo",
    url: "https://catalogo.example",
    timeoutMs: 1500,
  },
  {
    nombre: "pagos",
    url: "https://pagos.example",
    timeoutMs: 3000,
  },
];

servicios.push({
  nombre: "inventario",
  url: "https://inventario.example",
  timeoutMs: 2000,
});

console.log(`cantidad: ${servicios.length}`);
console.log(nombresDe(servicios));
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig04_01.ts
$ node fig04_01.js
cantidad: 3
catálogo, pagos, inventario
```

A anotação `Servicio[]` protege tanto a criação quanto as mudanças posteriores. Se você tentasse acrescentar uma string, um objeto sem URL ou um valor com `timeoutMs` do tipo string, o compilador apontaria o problema antes de executar. Isso é especialmente útil porque `push` altera o array existente: você não está criando uma lista nova que possa ser revisada apenas no literal inicial.

Repare no parâmetro de `nombresDe`: é `readonly Servicio[]`, não `Servicio[]`. A função só precisa ler a lista. Declarar o parâmetro como somente leitura comunica essa intenção e evita que, por acidente, a função faça `push`, `pop` ou reatribua uma posição. Não congela o array em tempo de execução; como o `readonly` em uma propriedade, é uma proteção estática. Quem possui a lista decide se ela pode ser modificada; uma função que apenas a consulta recebe uma visão com menos permissões.

Dentro do `revisor`, o array de serviços é a fonte de trabalho. A configuração terá uma lista ordenada de `Servicio`, a lição 5 a percorrerá para iniciar consultas concorrentes e o relatório conservará uma lista de `Estado` para que o painel tenha uma representação fácil de mostrar. Não converta essa lista em um `Map` só porque cada serviço tem nome: você perderia a sequência declarada e obrigaria o código de apresentação a decidir uma ordem posteriormente.

O JavaScript admite posições inexistentes e permite ler além do final de um array. `servicios[10]` produz `undefined` se só há três elementos. O `strictNullChecks` faz com que `null` e `undefined` sejam alternativas explícitas quando um contrato já as declara, como acontece com `find`, mas o `strict` por si só não muda o tipo de um acesso por índice: para o TypeScript, `servicios[10]` continua sendo `Servicio`. Se você quer que cada acesso por índice seja tratado como potencialmente ausente, ative `noUncheckedIndexedAccess`; então o tipo passa a ser `Servicio | undefined` e você deve verificá-lo antes de ler uma propriedade. A figura 04_08 mostra o diagnóstico que essa opção produz. Antes de indexar uma lista que veio de fora, você deve verificar o comprimento dela ou usar uma operação que comunique a ausência, como `find`.

Para isolar as coleções, as figuras 04_01, 04_02 e 04_04 simplificam deliberadamente o modelo final da lição 3: `timeoutMs` é mutável e, na figura 04_02, `Estado.servicio` é apenas o nome como string. No `revisor` montado, `Servicio` conserva suas propriedades de configuração como somente leitura e cada `Estado` conserva o `Servicio` completo; aqui a forma reduzida permite concentrar-se na operação de cada coleção.

Evite também usar `forEach` por reflexo. `forEach` é útil para executar um efeito por elemento, como imprimir uma linha, mas não constrói um resultado e não permite sair cedo de maneira simples. `map` transforma todos os elementos em outro array; `filter` conserva apenas os que cumprem uma condição; `find` obtém o primeiro ou `undefined`. Escolher o método pelo valor que você produz deixa mais evidente o que a função pretende.

### `Map` e `Set`: consultas por chave e pertencimento sem duplicatas

Um `Map<K, V>` associa uma chave do tipo `K` a um valor do tipo `V`. Diferentemente de um objeto comum usado como dicionário, um `Map` expressa que seu propósito é armazenar associações dinâmicas, oferece métodos claros como `set`, `get`, `has` e `delete`, e pode usar chaves que não são strings. Para o `revisor`, a chave natural será o nome do serviço e o valor será o seu estado.

`Map#get` devolve `V | undefined`, mesmo quando o tipo do valor não admite `undefined`. A razão é correta: a chave pode não existir. Não ignore essa união. Um estado ausente significa algo diferente de um estado disponível, e o compilador obriga você a resolver a diferença antes de usar propriedades do resultado.

```ts
// fig04_02.ts
type Estado = {
  readonly servicio: string;
  readonly tipo: "disponible" | "falla";
};

const estados = new Map<string, Estado>();
estados.set("catálogo", { servicio: "catálogo", tipo: "disponible" });
estados.set("pagos", { servicio: "pagos", tipo: "falla" });

const nombres = new Set<string>(["catálogo", "pagos", "catálogo"]);

console.log(`estados: ${estados.size}`);
console.log(`catálogo existe: ${estados.has("catálogo")}`);
console.log(`inventario: ${estados.get("inventario") ?? "sin resultado"}`);
console.log(`nombres únicos: ${[...nombres].join(", ")}`);
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig04_02.ts
$ node fig04_02.js
estados: 2
catálogo existe: true
inventario: sin resultado
nombres únicos: catálogo, pagos
```

O operador `??` significa “use o valor da direita somente se o da esquerda for `null` ou `undefined`”. Aqui ele não pergunta se o estado é verdadeiro ou falso; pergunta se ele não existe. É melhor do que `||` quando um valor válido pode ser `0`, `false` ou uma string vazia. Embora os estados do exemplo sejam objetos e, por isso, sempre valores verdadeiros, convém aprender a distinção desde já.

Um `Set<T>` guarda valores sem repeti-los. Ao adicionar pela segunda vez uma string igual, o conjunto conserva uma única entrada. Isso não ordena os elementos alfabeticamente nem converte maiúsculas em minúsculas: `"Pagos"` e `"pagos"` são strings diferentes. Se o domínio considera esses nomes iguais, você deve normalizá-los deliberadamente antes de adicioná-los. A estrutura não pode adivinhar as regras do negócio.

Dentro do `revisor`, um `Set<string>` é útil para validar que a configuração não repete nomes. O array conserva a lista original e um `Set` é usado como apoio durante a revisão. Se cada nome é adicionado e o tamanho do conjunto não aumenta, você encontrou uma duplicata. Um `Map<string, Estado>` será útil depois de produzir o relatório, se você quiser obter um estado por nome sem percorrer toda a lista.

Não use um `Map` como substituto universal de um array. A ordem de inserção do `Map` é definida, mas isso não significa que ela deva controlar a apresentação de um relatório. Tampouco use um objeto com assinaturas de índice como `{ [nombre: string]: Estado }` só para evitar aprender `Map`. Um objeto simples é excelente quando você conhece suas propriedades de antemão; um `Map` é mais claro quando as chaves aparecem dinamicamente durante a operação.

### Genéricos: conservar informação de tipo ao reutilizar uma função

Uma função genérica usa um parâmetro de tipo, por convenção `T`, para expressar uma relação entre partes da sua assinatura. Não é um valor disponível enquanto o Node executa o programa; como todos os tipos do TypeScript, é apagado ao compilar. Seu trabalho consiste em permitir que o compilador acompanhe o tipo concreto que chega a uma função e o conserve no resultado.

Sem um genérico, uma função que obtém o primeiro elemento de uma lista poderia receber `unknown[]` e devolver `unknown`. Isso obriga quem a chama a inspecionar o resultado outra vez, embora o compilador já soubesse que a lista continha `Servicio`. Se você escreve a função para receber `Servicio[]`, perde a possibilidade de reutilizá-la com `Estado[]` ou outra lista. O genérico une as duas necessidades: funciona com vários tipos e conserva qual foi o tipo escolhido em cada chamada.

```ts
// fig04_03.ts
function primero<T>(valores: readonly T[]): T | undefined {
  return valores[0];
}

const puertos = [443, 8080];
const servicios = ["catálogo", "pagos"];

const primerPuerto = primero(puertos);
const primerServicio = primero(servicios);

console.log(`puerto: ${primerPuerto ?? "ninguno"}`);
console.log(`servicio: ${primerServicio ?? "ninguno"}`);
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig04_03.ts
$ node fig04_03.js
puerto: 443
servicio: catálogo
```

`T` não significa “qualquer coisa sem regras”. Significa “um tipo ainda não decidido, mas consistente dentro desta chamada”. Na primeira chamada, o TypeScript infere `T` como `number`; por isso `primerPuerto` é `number | undefined`. Na segunda, infere `string`; por isso `primerServicio` é `string | undefined`. O `undefined` permanece porque um array vazio não tem primeiro elemento, independentemente do tipo dos seus elementos.

Os genéricos também podem ter restrições. Se uma função precisa acessar `nombre`, não basta escrever `<T>`, porque nem todos os valores têm essa propriedade. Você pode escrever `T extends { nombre: string }` para declarar a capacidade mínima exigida. A restrição não obriga os valores a serem exatamente esse objeto; permite objetos que tenham pelo menos essa propriedade. Isso aproveita a tipagem estrutural que você viu na lição 3.

Dentro do `revisor`, uma função genérica será útil para não duplicar infraestrutura. Por exemplo, o relatório poderá agrupar estados, buscar o primeiro elemento de uma lista ou encapsular um resultado bem-sucedido sem perder o tipo do valor. Não transforme uma função em genérica só porque você pode. Se a operação foi projetada exclusivamente para `Servicio`, usar `Servicio` na assinatura comunica melhor o domínio. O genérico vale quando a lógica realmente funciona igual para vários tipos e a relação de tipos importa para quem recebe o resultado.

Em Go, uma função genérica também declara parâmetros de tipo, embora a sintaxe e algumas regras sejam diferentes. A ideia útil nas duas linguagens é a mesma: você não escreve uma função genérica para evitar pensar nos contratos dela, e sim para expressar que um contrato se repete sem degradar todos os seus valores a uma forma ampla demais.

### Tipos utilitários: derivar contratos do modelo

Um tipo utilitário pega um tipo existente e produz outro tipo durante a compilação. Não altera objetos em tempo de execução. `Pick`, `Omit`, `Readonly` e `Record` são ferramentas incluídas pelo TypeScript para expressar relações frequentes sem copiar manualmente todas as propriedades de um modelo.

Copiar tipos parece inofensivo quando um `Servicio` tem três propriedades. O problema chega ao mudar o modelo. Se você acrescenta `reintentos` a `Servicio` e existem três cópias parciais escritas à mão, essas cópias podem ficar desatualizadas de maneiras diferentes. Derivar o contrato deixa claro que ele depende do original e permite que o compilador aponte mudanças que agora exigem uma decisão.

```ts
// fig04_04.ts
interface Servicio {
  readonly nombre: string;
  readonly url: string;
  timeoutMs: number;
}

type ServicioPublico = Omit<Servicio, "url">;
type CambioTimeout = Pick<Servicio, "timeoutMs">;
type ServiciosPorNombre = Record<string, ServicioPublico>;

const cambio: CambioTimeout = { timeoutMs: 2500 };
const visibles: ServiciosPorNombre = {
  catálogo: { nombre: "catálogo", timeoutMs: cambio.timeoutMs },
  pagos: { nombre: "pagos", timeoutMs: 3000 },
};

console.log(visibles.catálogo.nombre);
console.log(visibles.pagos.timeoutMs);
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig04_04.ts
$ node fig04_04.js
catálogo
3000
```

`Pick<Servicio, "timeoutMs">` conserva apenas as propriedades selecionadas. É adequado para uma mudança que deve trazer exclusivamente o dado que pode ser modificado. `Omit<Servicio, "url">` cria uma visão sem URL, útil se o painel precisa mostrar serviços mas não deve receber essa propriedade. Isso não é uma medida de segurança por si só: o objeto em tempo de execução ainda pode conter uma URL se você o enviar sem transformá-lo. O tipo evita que o código TypeScript a use dentro desse contrato; a camada que constrói a resposta deve decidir que dados serializa.

`Readonly<T>` torna somente leitura as propriedades de primeiro nível de `T`. Use-o quando uma função recebe uma configuração que não deve mudar. Não é profundo: se uma propriedade contém outro objeto, as propriedades internas continuam modificáveis, a menos que você as declare também como `readonly` ou use um tipo projetado para isso. Também não chama `Object.freeze`; não muda o comportamento do JavaScript.

`Record<K, V>` descreve um objeto cujas chaves são `K` e cujos valores são `V`. É especialmente útil para representar uma estrutura serializável que já tem chaves conhecidas por tipo, ou uma tabela que você enviará como JSON. Para uma coleção dinâmica que você administrará com métodos como `has` e `delete`, o `Map` costuma comunicar melhor a intenção. A diferença não é de desempenho automático, e sim de operações e significado.

Dentro do `revisor`, `Omit<Servicio, "url">` pode definir a visão segura que chegará ao painel, `Pick` pode representar uma atualização limitada de timeout e `Record<string, Estado>` pode servir como uma forma de relatório indexada por nome quando o contrato HTTP realmente precisar de um objeto JSON. O modelo central continua sendo `Servicio`; os tipos utilitários são visões derivadas para casos concretos, não substitutos anônimos que escondam o domínio.

### Erros: exceção para interromper, resultado para continuar

Uma exceção muda o fluxo normal. Quando uma função executa `throw`, o JavaScript procura o `catch` mais próximo que possa tratá-la. Se não encontra nenhum, o programa termina com um erro. Esse mecanismo é útil para erros que não podem ser resolvidos localmente ou para APIs que já informam falhas por meio de exceções.

O problema aparece quando a falha é uma alternativa esperada da operação. O `revisor` precisa informar que pagos falhou; não precisa abandonar o relatório inteiro. Se `revisarServicio` lança uma exceção para cada serviço inacessível e ninguém a transforma, o primeiro problema pode impedir que você conheça o estado dos demais. Para resultados esperados, uma união discriminada mantém a decisão no fluxo normal do programa.

```ts
// fig04_05.ts
type Resultado<T> =
  | { ok: true; valor: T }
  | { ok: false; detalle: string };

function dividir(dividendo: number, divisor: number): Resultado<number> {
  if (divisor === 0) {
    return { ok: false, detalle: "el divisor no puede ser cero" };
  }

  return { ok: true, valor: dividendo / divisor };
}

function mostrar(resultado: Resultado<number>): string {
  if (resultado.ok) {
    return `resultado: ${resultado.valor}`;
  }

  return `falla: ${resultado.detalle}`;
}

console.log(mostrar(dividir(12, 3)));
console.log(mostrar(dividir(12, 0)));
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig04_05.ts
$ node fig04_05.js
resultado: 4
falla: el divisor no puede ser cero
```

A propriedade `ok` é o discriminante. Quando o TypeScript vê `if (resultado.ok)`, sabe que dentro desse ramo existe `valor`; no outro ramo sabe que existe `detalle`. Você não precisa escrever propriedades opcionais como `valor?: T` e `detalle?: string`, porque essas propriedades opcionais permitiriam estados ambíguos: os dois dados presentes ou os dois ausentes.

No `revisor`, `Resultado<Estado>` pode representar o resultado interno de uma consulta antes de integrá-lo ao relatório. Se uma biblioteca lança uma exceção de rede, uma camada próxima da operação pode capturá-la, convertê-la em `{ ok: false, detalle }` e permitir que a execução continue. A lição 5 acrescentará promessas e operações concorrentes; a ideia importante já está pronta: uma falha por serviço deve ser informação do relatório, não necessariamente o fim do processo.

Não converta todos os erros em resultados nem todas as alternativas em exceções. Uma configuração inválida na inicialização pode ser uma razão correta para parar o programa, porque não há uma execução confiável a continuar. A falta de resposta de um entre dez serviços, em contrapartida, é exatamente uma das coisas que o relatório deve mostrar. A pergunta não é “que mecanismo parece mais moderno?”, e sim “quem pode se recuperar e que informação deve receber?”.

### `unknown` em `catch`: inspecionar antes de confiar

O JavaScript permite lançar qualquer valor. Embora a convenção saudável seja lançar instâncias de `Error`, código alheio pode fazer `throw "sin red"`, `throw 503` ou `throw { mensaje: "falló" }`. Por isso, com `strict`, o TypeScript trata a variável do `catch` como `unknown`: você ainda não tem evidência de que seja um `Error` nem de que tenha uma propriedade `message`.

A solução não é mudar o tipo para `any`. O `any` desativa as verificações justamente onde os dados são menos confiáveis. A solução é reduzir o `unknown` com uma verificação que de fato é executada. `error instanceof Error` verifica que o valor pertence à hierarquia de `Error`; depois dessa condição, o TypeScript permite ler `message`.

```ts
// fig04_06.ts
function textoError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "falla sin detalle legible";
}

try {
  throw new Error("tiempo límite agotado");
} catch (error) {
  console.log(textoError(error));
}

try {
  throw "servicio no alcanzable";
} catch (error) {
  console.log(textoError(error));
}
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig04_06.ts
$ node fig04_06.js
tiempo límite agotado
servicio no alcanzable
```

A função `textoError` concentra uma política pequena, mas importante: que texto será mostrado quando uma camada inferior lançar algo. O caso final não tenta serializar arbitrariamente um objeto nem revela detalhes potencialmente sensíveis. Em uma aplicação real talvez você guardasse mais contexto em um log interno, mas a mensagem que chega ao relatório ou ao painel deve ser deliberada.

Dentro do `revisor`, as consultas de rede da próxima lição usarão essa conversão perto do `try/catch`. O resultado para o resto do programa será um `EstadoFalla` com um detalhe seguro. Isso reduz o número de lugares que precisam entender exceções e evita que o React, a API e a lógica de relatório implementem três versões diferentes da mesma inspeção.

## O erro que você vai ver

Com o TypeScript 7.0.2 e `strict`, acessar `message` sem verificar o valor capturado produz o TS18046. O erro não diz que as exceções sejam inválidas. Diz que o compilador não consegue provar que o valor capturado tenha uma propriedade `message`, porque o JavaScript permite lançar qualquer valor.

```ts
// fig04_07.ts
function mensaje(error: unknown): string {
  return error.message;
}
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig04_07.ts
fig04_07.ts(3,10): error TS18046: 'error' is of type 'unknown'.
```

A correção não é uma asserção como `error as Error`. Uma asserção apenas obriga o compilador a confiar; não verifica nada enquanto o programa roda. Se alguém lançou uma string, o acesso posterior pode produzir `undefined` ou falhar de outra maneira. Use uma verificação como `error instanceof Error` antes de ler `message`, tal como na figura 04_06.

Também é normal encontrar o TS2322 ao tentar guardar um valor do tipo errado em um array ou `Map` tipado. Por exemplo, se um `Map<string, Estado>` espera um `Estado` cuja propriedade `tipo` só pode ser `"disponible" | "falla"`, a string `"correcto"` não é compatível, embora pareça expressar uma ideia parecida. O diagnóstico significa que o vocabulário do programa está definido em um tipo literal e a nova string não pertence a ele. Corrija o valor para usar o literal combinado ou, se o domínio realmente ganhou um estado novo, modifique a união e trate o novo caso em todas as funções que a usam.

Quando um `Map#get` devolve um valor que pode ser `undefined`, o diagnóstico habitual não é um incômodo do compilador, e sim um sinal de projeto. Uma chave ausente é um caso possível. Decida o que deve acontecer: devolver um resultado de falha, usar um valor padrão explícito, interromper uma operação ou verificar `has` antes de ler. Não use `!` para apagar o `undefined`, a menos que você possa demonstrar localmente que a chave existe e a prova esteja junto ao acesso.

Se você ativou `noUncheckedIndexedAccess` no projeto, o compilador aplica a mesma precaução a um acesso por índice. Essa opção não pertence ao `strict`: adicione-a explicitamente ao `tsconfig.json` quando o projeto indexa arrays ou tabelas com índices que não consegue demonstrar válidos. O resultado é uma verificação adicional que evita tratar como existente um elemento que o JavaScript pode devolver como `undefined`.

```ts
// fig04_08.ts
interface Servicio {
  readonly nombre: string;
  readonly url: string;
  timeoutMs: number;
}

const servicios: Servicio[] = [];
const nombre = servicios[10].nombre;

console.log(nombre);
```
```bash
$ npx tsc --strict --noUncheckedIndexedAccess --target ES2022 --module nodenext fig04_08.ts
fig04_08.ts(9,16): error TS2532: Object is possibly 'undefined'.
```

Com o mesmo arquivo e apenas `strict`, o TypeScript aceita o acesso porque o índice conserva o tipo `Servicio`; ao somar `noUncheckedIndexedAccess`, ele exige tratar `undefined`. Não use essa opção como substituta de validar dados externos: ela só melhora o contrato estático de acessos a coleções que já existem em memória.

## O que se faz errado

Usar `any[]` para “fazer a lista aceitar tudo” elimina o contrato justamente quando a coleção mistura dados de lugares diferentes. Uma lista de serviços não deve aceitar números, strings nem objetos parcialmente formados. Se há um ponto em que você ainda não conhece os elementos, use `unknown[]` e valide cada um na fronteira; se o programa já conhece o contrato, use `Servicio[]`.

Copiar a definição de `Servicio` para criar uma visão do painel parece mais rápido do que usar `Pick` ou `Omit`, mas cria contratos que se afastam com o tempo. O problema não é só o texto repetido: o modelo central pode mudar e as cópias podem conservar uma versão velha sem que o compilador relacione as duas coisas. Derive uma visão quando a relação dela com o modelo for real e use um tipo novo com nome quando ele representar um conceito diferente.

Usar um `Set` para construir o relatório é outro erro frequente. Um conjunto responde se algo pertence ou não pertence; não conserva o estado associado a cada serviço. Se você precisa consultar “que estado pagos teve?”, precisa de um `Map` ou de um array de estados com uma busca. Se precisa conservar a ordem de exibição, conserve também uma lista ordenada.

Lançar exceções para o resultado esperado de cada serviço torna o controle de fluxo difícil de acompanhar. Quem chama precisa adivinhar que operações podem lançar, que erros capturar e quais deixar passar. Para uma falha que deve aparecer no relatório, devolva uma alternativa de resultado ou converta-a em `EstadoFalla` perto da operação que falhou.

Capturar uma exceção e escrever `catch (error) { return error.message; }` supõe uma garantia que o JavaScript não oferece. É especialmente perigoso porque o código de recuperação pode falhar e esconder a causa original. Trate o valor como `unknown`, verifique sua forma e conserve uma mensagem de reserva para valores não reconhecidos.

Por fim, não use `as` nem o operador `!` para silenciar um tipo de que você não gosta. `map.get(nombre)!` afirma que o resultado existe, mas não cria uma entrada no mapa. `valor as Estado` afirma que um valor cumpre o modelo, mas não valida JSON nem uma resposta HTTP. Essas ferramentas têm usos pontuais quando já existe evidência que o compilador não consegue inferir; não substituem uma verificação nem uma decisão de projeto.

## Exercícios

### Exercício 1 — Detectar nomes repetidos

Escreva uma função `nombresDuplicados(servicios: readonly Servicio[]): string[]`. Ela deve percorrer a lista, detectar nomes que apareçam mais de uma vez e devolver cada nome duplicado uma única vez. Use um `Set` para os nomes vistos e outro para os duplicados. Teste a função com catálogo, pagos, catálogo e inventário; a saída deve conter somente `catálogo`.

### Exercício 2 — Encontrar um serviço pelo nome

Escreva `buscarServicio(servicios: readonly Servicio[], nombre: string): Servicio | undefined`. Ela deve devolver o serviço cujo nome coincida exatamente ou `undefined` se não existir. Depois escreva uma linha que mostre a URL encontrada ou o texto `servicio no configurado`. Não use uma asserção de tipo para eliminar o caso `undefined`.

### Exercício 3 — Converter um array em um índice

Escreva uma função genérica `porClave<T extends { nombre: string }>(valores: readonly T[]): Map<string, T>`. Ela deve criar um `Map` cuja chave seja `nombre` e cujo valor seja o objeto original. Teste-a tanto com um array de `Servicio` quanto com um array de objetos que tenham `nombre` e outra propriedade diferente.

### Exercício 4 — Converter uma exceção em um resultado

Defina `Resultado<T>` com as alternativas `ok: true` e `ok: false`. Escreva `ejecutar<T>(operacion: () => T): Resultado<T>` para executar uma operação síncrona. Se a operação devolver um valor, deve produzir sucesso; se lançar qualquer valor, deve devolver uma falha com um detalhe obtido de uma função que receba `unknown`. Teste uma operação que devolva `200` e outra que lance `new Error("sin conexión")`.

## Soluções

### Solução 1

```ts
interface Servicio {
  readonly nombre: string;
  readonly url: string;
  timeoutMs: number;
}

function nombresDuplicados(servicios: readonly Servicio[]): string[] {
  const vistos = new Set<string>();
  const duplicados = new Set<string>();

  for (const servicio of servicios) {
    if (vistos.has(servicio.nombre)) {
      duplicados.add(servicio.nombre);
    }

    vistos.add(servicio.nombre);
  }

  return [...duplicados];
}

const servicios: Servicio[] = [
  { nombre: "catálogo", url: "https://catalogo.example", timeoutMs: 1500 },
  { nombre: "pagos", url: "https://pagos.example", timeoutMs: 3000 },
  { nombre: "catálogo", url: "https://catalogo.example", timeoutMs: 1500 },
  { nombre: "inventario", url: "https://inventario.example", timeoutMs: 2000 },
];

console.log(nombresDuplicados(servicios).join(", "));
```

A função separa duas perguntas. `vistos` responde se o nome já apareceu; `duplicados` evita adicioná-lo várias vezes ao resultado. Se houvesse três entradas chamadas catálogo, o resultado continuaria sendo uma única string.

### Solução 2

```ts
interface Servicio {
  readonly nombre: string;
  readonly url: string;
  timeoutMs: number;
}

function buscarServicio(
  servicios: readonly Servicio[],
  nombre: string,
): Servicio | undefined {
  return servicios.find((servicio) => servicio.nombre === nombre);
}

const servicios: Servicio[] = [
  { nombre: "catálogo", url: "https://catalogo.example", timeoutMs: 1500 },
];

const encontrado = buscarServicio(servicios, "pagos");
console.log(encontrado?.url ?? "servicio no configurado");
```

`find` expressa exatamente o contrato: pode encontrar um elemento ou não encontrar nenhum. O encadeamento opcional `?.` evita ler `url` quando `encontrado` é `undefined`; `??` fornece o texto de reserva.

### Solução 3

```ts
function porClave<T extends { nombre: string }>(
  valores: readonly T[],
): Map<string, T> {
  const indice = new Map<string, T>();

  for (const valor of valores) {
    indice.set(valor.nombre, valor);
  }

  return indice;
}

const servicios = porClave([
  { nombre: "catálogo", timeoutMs: 1500 },
  { nombre: "pagos", timeoutMs: 3000 },
]);

const equipos = porClave([
  { nombre: "operación", turno: "mañana" },
  { nombre: "soporte", turno: "tarde" },
]);

console.log(servicios.get("pagos")?.timeoutMs);
console.log(equipos.get("soporte")?.turno);
```

A restrição exige a propriedade necessária para formar a chave, mas conserva todas as demais propriedades. Por isso, o primeiro `Map` conserva `timeoutMs` e o segundo conserva `turno`.

### Solução 4

```ts
type Resultado<T> =
  | { ok: true; valor: T }
  | { ok: false; detalle: string };

function textoError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === "string" ? error : "falla sin detalle legible";
}

function ejecutar<T>(operacion: () => T): Resultado<T> {
  try {
    return { ok: true, valor: operacion() };
  } catch (error) {
    return { ok: false, detalle: textoError(error) };
  }
}

console.log(ejecutar(() => 200));
console.log(ejecutar(() => {
  throw new Error("sin conexión");
}));
```

A função genérica conserva o tipo que a operação devolve. Se a operação produz um número, o resultado bem-sucedido contém um número; se produzisse um `Estado`, conteria um `Estado`. A exceção não sai de `ejecutar`: é transformada em uma alternativa explícita que quem chama pode mostrar ou combinar com outros resultados.

## Como sei que consegui

- [ ] `npx tsc --version` imprime `Version 7.0.2`.
- [ ] Ao executar `npx tsc --strict --target ES2022 --module nodenext fig04_01.ts` e `node fig04_01.js`, aparece uma quantidade de três serviços e os nomes na ordem catálogo, pagos e inventário.
- [ ] Ao executar `npx tsc --strict --target ES2022 --module nodenext fig04_02.ts` e `node fig04_02.js`, o conjunto imprime dois nomes únicos embora se tenha tentado adicionar catálogo duas vezes.
- [ ] Ao executar `npx tsc --strict --target ES2022 --module nodenext fig04_05.ts` e `node fig04_05.js`, aparecem tanto `resultado: 4` quanto `falla: el divisor no puede ser cero`.
- [ ] Ao executar `npx tsc --strict --target ES2022 --module nodenext fig04_07.ts`, aparece o TS18046 na linha que tenta ler `message` a partir de `unknown`.
- [ ] Ao executar `npx tsc --strict --noUncheckedIndexedAccess --target ES2022 --module nodenext fig04_08.ts`, aparece o TS2532 ao ler uma propriedade do elemento indexado sem verificar `undefined`.

## Para ler mais

- [TypeScript Handbook: Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html) — documentação oficial sobre parâmetros de tipo, inferência e restrições; consultado em 2 de outubro de 2026.
- [TypeScript Handbook: Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html) — documentação oficial de `Pick`, `Omit`, `Readonly`, `Record` e outros tipos utilitários; consultado em 2 de outubro de 2026.
- [TSConfig: useUnknownInCatchVariables](https://www.typescriptlang.org/tsconfig/useUnknownInCatchVariables.html) — documentação oficial sobre o uso de `unknown` em variáveis de `catch`; consultado em 2 de outubro de 2026.
- [TSConfig: noUncheckedIndexedAccess](https://www.typescriptlang.org/tsconfig/noUncheckedIndexedAccess.html) — documentação oficial da verificação adicional para acessos indexados; consultado em 2 de outubro de 2026.
