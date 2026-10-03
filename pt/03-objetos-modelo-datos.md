# Lição 3 — Objetos e o modelo de dados

**Tempo:** 2 × 45 min

**O que você constrói:** o modelo `Servicio` / `Estado`

**O que você aprende:** `type` vs `interface`, tipagem estrutural, `readonly`, uniões discriminadas para estados

## Ao terminar, você vai conseguir

- Definir um objeto `Servicio` com propriedades obrigatórias e explicar que contrato cada uma representa.
- Escolher entre `type` e `interface` ao modelar uma forma de dados ou uma união.
- Explicar por que o TypeScript aceita objetos pela forma deles e não por um rótulo nominal.
- Proteger propriedades que não devem ser reatribuídas com `readonly` e reconhecer o limite disso em tempo de execução.
- Representar resultados corretos e com falha por meio de uma união discriminada.
- Corrigir os diagnósticos TS2540, TS2339 e TS2741 sem desativar o `strict`.

## O porquê antes do como

Até agora o `revisor` trabalhou com valores simples: um nome, uma URL, uma string que descreve um estado. Isso basta para explicar uma função ou conferir que o ambiente compila, mas deixa uma pergunta importante sem resposta: como evitar que os dados que pertencem ao mesmo serviço acabem separados, misturados ou usados com nomes diferentes?

Em JavaScript, você pode guardar as informações de um serviço em várias variáveis soltas:

```ts
const nombre = "catálogo";
const url = "https://catalogo.example";
const timeoutMs = 1500;
```

Não há nada incorreto nessas três linhas. O problema aparece quando há vários serviços. Você teria `nombreCatalogo`, `urlCatalogo`, `timeoutCatalogo`, depois `nombrePagos`, `urlPagos`, `timeoutPagos`, e em seguida precisaria lembrar quais valores correspondem entre si. O JavaScript não distingue por conta própria o nome de um serviço da URL de outro. Uma função pode receber três argumentos na ordem errada e, se todos forem strings ou números compatíveis, o erro pode passar despercebido.

O objeto resolve a primeira parte do problema: agrupa dados que descrevem uma mesma coisa. Em vez de transportar três valores desconectados, você transporta um `Servicio`. O nome das propriedades deixa visível o que cada valor representa, e o compilador pode conferir que o objeto traz todos os dados de que o programa precisa.

Mas um objeto sozinho ainda não expressa todas as regras do domínio. O `revisor` não conhece apenas serviços configurados: também produz resultados. Um resultado disponível tem um código HTTP e uma duração; um resultado com falha talvez não tenha código HTTP, mas tem um detalhe da falha. Se você modela os dois resultados como um único objeto cheio de propriedades opcionais, a lógica acaba cheia de perguntas ambíguas: “o código falta porque a rede falhou ou porque ninguém o atribuiu?”, “posso imprimir `detalle` mesmo que o estado seja disponível?”, “o que significa que os dois campos existam ao mesmo tempo?”.

A lição trata de transformar essas perguntas em contratos visíveis. `interface` e `type` permitem nomear formas de objeto. A tipagem estrutural permite que uma função aceite um valor porque ele tem as propriedades de que ela precisa, e não porque venha de uma classe ou tenha declarado que pertence a uma hierarquia. `readonly` comunica que certa parte de uma configuração não deve mudar depois de criada. As uniões discriminadas permitem descrever estados mutuamente excludentes e obrigam a tratar cada caminho antes de acessar dados específicos.

Em Go, um `struct` agrupa campos sob um tipo com nome. O TypeScript também usa objetos para agrupar dados, mas se apoia em uma diferença importante: seus tipos são verificados antes de executar e apagados ao emitir JavaScript. `interface Servicio` não cria uma classe, não constrói objetos e não existe para o Node quando o programa roda. É uma descrição estática da forma que os objetos devem ter dentro do código TypeScript.

Essa diferença explica duas consequências. A primeira é positiva: você pode aplicar um contrato a objetos comuns do JavaScript sem reescrevê-los como classes nem fazê-los herdar de uma base comum. A segunda exige cuidado: não basta escrever um tipo para validar um JSON, uma variável de ambiente ou uma resposta HTTP. A validação dessas fronteiras chegará na lição 6. Aqui você vai modelar os valores que já são confiáveis dentro do programa.

O objetivo não é encher o projeto de tipos longos. É tornar explícitas as decisões que mudam o comportamento do `revisor`: o que um serviço precisa para ser revisável, que dados não devem ser alterados durante uma revisão e que informação existe em cada resultado possível. Quando essas decisões ficam no tipo, o compilador pode detectar combinações impossíveis antes que o painel ou a API tentem usá-las.

## Os conceitos

### Objetos: uma coisa com dados que andam juntos

Um objeto JavaScript reúne pares de propriedade e valor. As chaves criam o objeto; cada propriedade tem um nome e um valor. Você pode ler uma propriedade com ponto, como `servicio.nombre`, ou com colchetes, como `servicio["nombre"]`. O TypeScript parte desse mesmo mecanismo do JavaScript e acrescenta a possibilidade de descrever que propriedades o programa espera.

A diferença entre “um objeto que hoje traz estas propriedades” e “um objeto que o programa reconhece como `Servicio`” é importante. O primeiro pode crescer, mudar ou chegar incompleto. O segundo é um contrato: deve ter as propriedades declaradas, e cada uma deve conter um valor do tipo indicado. O compilador não revisa uma rede nem consulta uma URL; ele confere, sim, que um objeto literal escrito no programa cumpra a forma prometida.

```ts
// fig03_01.ts
type Servicio = {
  nombre: string;
  url: string;
  timeoutMs: number;
};

function etiqueta(servicio: Servicio): string {
  return `${servicio.nombre} -> ${servicio.url}`;
}

const catalogo: Servicio = {
  nombre: "catálogo",
  url: "https://catalogo.example",
  timeoutMs: 1500,
};

console.log(etiqueta(catalogo));
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig03_01.ts
$ node fig03_01.js
catálogo -> https://catalogo.example
```

A função não recebe três parâmetros cuja relação você precisa lembrar. Recebe um único `Servicio`, e o tipo documenta que essa unidade tem `nombre`, `url` e `timeoutMs`. Também fica mais fácil estender o contrato de forma consciente. Se mais adiante o programa precisar de uma política de novas tentativas, você pode acrescentar `reintentos` ao tipo e deixar que o TypeScript aponte os lugares que agora precisam decidir o valor dela.

Dentro do `revisor`, o objeto de configuração deve descrever o serviço, não o resultado de consultá-lo. Um `Servicio` é estável enquanto dura uma execução: identifica o que se quer revisar e com que limite. O resultado será representado por outro tipo chamado `Estado`. Separar as duas ideias evita um objeto confuso em que uma URL configurada, um código HTTP observado e uma mensagem de falha se misturam como se fossem o mesmo tipo de dado.

```ts
// fig03_02.ts
interface Servicio {
  nombre: string;
  url: string;
  timeoutMs: number;
}

function prepararConsulta(servicio: Servicio): string {
  return `${servicio.nombre}: límite de ${servicio.timeoutMs} ms`;
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

for (const servicio of servicios) {
  console.log(prepararConsulta(servicio));
}
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig03_02.ts
$ node fig03_02.js
catálogo: límite de 1500 ms
pagos: límite de 3000 ms
```

Não transforme cada dado relacionado em uma classe por costume. Para a maioria dos valores do `revisor`, um objeto com um tipo bem escolhido é suficiente. As classes acrescentam comportamento de execução, construtores, protótipos e, às vezes, herança. Nada disso é necessário para expressar que um serviço tem nome, URL e limite. Um objeto comum com um contrato claro costuma ser mais direto e mais fácil de converter para JSON.

Também não use objetos como sacos sem forma, com propriedades inventadas na hora. Uma anotação como `Record<string, unknown>` serve quando você realmente não conhece as chaves, mas um serviço tem, sim, um vocabulário conhecido. Se você aceita qualquer chave para algo que tem três propriedades concretas, perde a ajuda que o tipo poderia dar.

### `type` e `interface`: duas ferramentas próximas, não dois lados

Um alias criado com `type` dá nome a qualquer tipo. Pode nomear um objeto, uma união, um literal, um array ou uma combinação de outros tipos. Uma interface descreve sobretudo a forma de um objeto: propriedades, métodos e relações que ela pode estender. Para uma forma simples de dados, os dois parecem quase iguais.

```ts
// fig03_03.ts
interface Punto {
  x: number;
  y: number;
}

type Etiqueta = string;

function describir(punto: Punto, etiqueta: Etiqueta): string {
  return `${etiqueta}: ${punto.x},${punto.y}`;
}

console.log(describir({ x: 4, y: 7 }, "origen de prueba"));
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig03_03.ts
$ node fig03_03.js
origen de prueba: 4,7
```

A escolha prática para este curso é simples. Use `interface` para entidades com forma de objeto que representam contratos extensíveis do programa, como `Servicio`. Use `type` para uniões, composições e nomes de tipos que não são necessariamente objetos, como `Estado`, `"disponible" | "falla"` ou `string | undefined`. Não é uma lei do compilador: os dois podem descrever muitos objetos. É uma convenção para que quem lê o código veja de imediato se está diante de uma entidade ou de uma combinação de possibilidades.

Há diferenças que convém conhecer sem transformá-las em uma discussão religiosa. Uma interface pode estender outra com `extends` e pode ser declarada mais de uma vez; o TypeScript combina declarações de interface com o mesmo nome. Essa combinação, chamada *declaration merging*, é útil principalmente ao ampliar declarações de uma biblioteca. Um alias `type` não é reaberto dessa maneira: se você o declara duas vezes no mesmo escopo, é um erro. Em compensação, o `type` pode representar diretamente uma união, algo que uma interface não consegue fazer.

Não declare duas vezes uma interface de domínio só porque o compilador permite combiná-la. Se uma parte do projeto acrescenta `timeoutMs` e outra acrescenta `equipo`, o contrato final fica repartido entre arquivos e custa descobrir de onde saiu cada obrigação. Para o `revisor`, cada entidade do domínio terá uma declaração principal, localizada junto aos demais tipos compartilhados.

Evite também deduzir uma diferença inexistente: `interface` não faz os objetos serem mais rápidos, não gera validação e não cria uma instância especial. No JavaScript emitido, as duas declarações desaparecem. A escolha serve para comunicar a intenção e ajudar o compilador, não para modificar o comportamento do Node.

Dentro do `revisor`, `Servicio` usa uma interface porque expressa a forma estável de uma configuração. `Estado`, por sua vez, será um alias de uma união porque sua função é declarar alternativas excludentes. Ler `type Estado = EstadoDisponible | EstadoFalla` comunica uma ideia que uma interface única não consegue expressar sozinha: um resultado sempre pertence a uma alternativa concreta.

```ts
// fig03_04.ts
interface Servicio {
  readonly nombre: string;
  readonly url: string;
  timeoutMs: number;
}

type EstadoInicial = {
  servicio: Servicio;
  tipo: "pendiente";
};

function presentarInicio(estado: EstadoInicial): string {
  return `${estado.servicio.nombre}: pendiente`;
}

const estado: EstadoInicial = {
  servicio: {
    nombre: "catálogo",
    url: "https://catalogo.example",
    timeoutMs: 1500,
  },
  tipo: "pendiente",
};

console.log(presentarInicio(estado));
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig03_04.ts
$ node fig03_04.js
catálogo: pendiente
```

O tipo `EstadoInicial` ainda tem uma única alternativa porque o revisor ainda não consultou nada. Mais abaixo você vai ampliar o modelo para descrever resultados disponíveis e com falha. O importante é que os nomes não sejam reciclados para ideias diferentes: `Servicio` descreve a entrada da consulta; `Estado` descreve o que a consulta observou.

Em `fig03_04`, `timeoutMs` ainda é ajustável para mostrar uma configuração durante sua normalização; a partir de `fig03_07` o modelo muda e as três propriedades de `Servicio` passam a ser `readonly`, porque ele já representa a configuração definitiva de uma consulta.

### `readonly`: proteger uma referência, não congelar o mundo

O modificador `readonly` proíbe reatribuir uma propriedade a partir de um lugar onde o TypeScript conhece esse contrato. É útil para dados de identidade e de configuração que não deveriam mudar durante a operação. No `revisor`, mudar `nombre` ou `url` no meio de uma revisão dificultaria a interpretação do relatório: você poderia iniciar a consulta para catálogo e terminar imprimindo que revisou pagos.

```ts
// fig03_05.ts
interface Registro {
  readonly id: string;
  cliente: {
    nombre: string;
  };
}

const registro: Registro = {
  id: "catalogo",
  cliente: { nombre: "catálogo" },
};

registro.cliente.nombre = "catálogo público";

console.log(`${registro.id}: ${registro.cliente.nombre}`);
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig03_05.ts
$ node fig03_05.js
catalogo: catálogo público
```

O exemplo mostra um detalhe essencial: `readonly` é superficial. Ele impede reatribuir `registro.id` e também impediria substituir por completo `registro.cliente` se essa propriedade fosse `readonly`. Não impede modificar as propriedades internas de `cliente`, porque `cliente.nombre` não foi declarado como somente leitura. Não confunda “uma propriedade não pode apontar para outro objeto” com “o objeto para o qual ela aponta é imutável”.

Isso se parece com ter um rótulo fixo em uma pasta. Você não pode trocar a pasta associada ao rótulo, mas pode editar uma folha dentro dela, se as regras dela permitirem. Se você precisa que toda uma estrutura seja imutável, terá de expressar `readonly` nos níveis relevantes, usar um utilitário como `Readonly<T>` ou projetar operações que construam valores novos. Essa decisão depende do domínio; não é consequência automática de pôr uma palavra na frente de uma propriedade.

`readonly` também não existe como barreira de execução. O TypeScript o apaga ao compilar. Se um JavaScript externo obtém uma referência ao mesmo objeto, ou se alguém usa uma asserção para driblar o contrato, o Node não bloqueará a mudança por conta própria. Para impedir mudanças durante a execução existe `Object.freeze`, embora ele também seja superficial e tenha outras implicações. Nesta etapa, `readonly` serve para expressar uma regra de projeto e obter diagnósticos antes de executar.

Com o TypeScript 7.0.2, o arquivo a seguir imprime este erro se você tentar modificar uma propriedade declarada como somente leitura.

```ts
// fig03_06.ts
interface Registro {
  readonly id: string;
}

const registro: Registro = { id: "catalogo" };

registro.id = "pagos";
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig03_06.ts
fig03_06.ts(8,10): error TS2540: Cannot assign to 'id' because it is a read-only property.
```

Dentro do `revisor`, marque como `readonly` as propriedades que identificam o que será consultado: `nombre` e `url`. Não marque tudo automaticamente. O limite `timeoutMs` poderia ser ajustável por uma função que normaliza a configuração antes de iniciar as consultas; depois dessa fronteira, você poderia construir um `Servicio` definitivo com valores imutáveis. A pergunta útil é “quem pode mudar este dado e em que momento?”, e não “quantas propriedades posso congelar?”.

```ts
// fig03_07.ts
interface Servicio {
  readonly nombre: string;
  readonly url: string;
  readonly timeoutMs: number;
}

function destinoDe(servicio: Servicio): string {
  return `${servicio.nombre}: ${servicio.url} (${servicio.timeoutMs} ms)`;
}

const pagos: Servicio = {
  nombre: "pagos",
  url: "https://pagos.example",
  timeoutMs: 3000,
};

console.log(destinoDe(pagos));
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig03_07.ts
$ node fig03_07.js
pagos: https://pagos.example (3000 ms)
```

A função `destinoDe` só precisa ler o serviço, então pode aceitar o contrato de somente leitura. Isso comunica a quem a chama que a função não deve mudar o destino da consulta nem alterar seus limites. Se uma função precisa construir uma versão modificada, é preferível que devolva um objeto novo com a modificação explícita, em vez de mutar silenciosamente a configuração que outras partes do programa continuam usando.

### Tipagem estrutural: importa a forma de que você precisa

O TypeScript tem tipagem estrutural. Em termos práticos, se um valor tem as propriedades requeridas com tipos compatíveis, ele pode ser usado onde essa forma é pedida. Não precisa declarar que “implementa” a interface nem pertencer a uma família de classes. Essa ideia se parece com as interfaces do Go: um valor é aceitável porque satisfaz o que a função precisa, não porque carregue um rótulo especial.

```ts
// fig03_08.ts
interface ConNombre {
  nombre: string;
}

function saludar(valor: ConNombre): string {
  return `revisando ${valor.nombre}`;
}

const servicioCompleto = {
  nombre: "catálogo",
  url: "https://catalogo.example",
  timeoutMs: 1500,
};

console.log(saludar(servicioCompleto));
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig03_08.ts
$ node fig03_08.js
revisando catálogo
```

`servicioCompleto` tem propriedades adicionais, mas isso não impede passá-lo a `saludar`. A função só prometeu ler `nombre`; exigir URL e tempo limite seria acrescentar uma dependência de que ela não precisa. Essa capacidade permite projetar funções pequenas e contratos pequenos.

No entanto, a tipagem estrutural não significa que você deva fazer todos os contratos o menor possível. Uma função que inicia uma consulta HTTP precisa, sim, de URL e de limite; o parâmetro dela deve ser `Servicio`, não apenas `ConNombre`. O princípio é pedir exatamente o que você usa, nem menos nem mais. Pedir menos pode esconder uma dependência real; pedir mais amarra funções simples a detalhes que não lhes dizem respeito.

Há uma proteção adicional para objetos literais escritos diretamente em uma chamada ou atribuição. Se você escreve `saludar({ nombre: "catálogo", nombreVisible: "Catálogo" })`, o TypeScript pode avisar que `nombreVisible` não pertence a `ConNombre`. Essa verificação de propriedades em excesso detecta erros de digitação frequentes. Não contradiz o exemplo anterior: um valor já guardado em uma variável pode ter mais propriedades e continuar cumprindo uma forma menor.

Dentro do `revisor`, um resumo pode precisar apenas do nome de um serviço, enquanto a operação de consulta precisa da configuração completa. Não é preciso criar uma hierarquia de classes para essa diferença. Basta descrever cada contrato de acordo com o seu consumidor.

```ts
// fig03_09.ts
interface ConNombre {
  nombre: string;
}

interface Servicio extends ConNombre {
  readonly url: string;
  readonly timeoutMs: number;
}

function encabezado(servicio: ConNombre): string {
  return `Servicio: ${servicio.nombre}`;
}

const catalogo: Servicio = {
  nombre: "catálogo",
  url: "https://catalogo.example",
  timeoutMs: 1500,
};

console.log(encabezado(catalogo));
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig03_09.ts
$ node fig03_09.js
Servicio: catálogo
```

`Servicio extends ConNombre` reutiliza uma forma porque todo serviço tem nome. Ainda assim, `encabezado` não precisa conhecer `Servicio`; depende da forma menor que consome. Essa separação será útil quando a API e o painel compartilharem tipos: cada função poderá importar o contrato de que precisa sem receber um objeto mais acoplado do que o necessário.

Evite usar a tipagem estrutural como licença para misturar conceitos diferentes só porque, por acidente, têm a mesma forma. Dois objetos com `{ nombre: string }` são compatíveis ainda que um represente um serviço e o outro uma pessoa responsável. Se o domínio exige distingui-los mesmo quando compartilham estrutura, você precisará de um projeto mais específico. Para este curso, os nomes das propriedades e tipos de domínio claros bastam; as técnicas de marcas nominais ficam reservadas para casos em que o risco justifique essa complexidade.

### Uniões discriminadas: cada estado traz os seus próprios dados

Uma união declara que um valor pode ser uma entre várias alternativas. Você já usou uniões de literais como `"disponible" | "falla"`. Uma união discriminada vai um passo além: cada alternativa é um objeto que compartilha uma propriedade literal, chamada discriminante, mas contém dados próprios. O discriminante permite que o TypeScript reduza o tipo quando você verifica o valor dele.

Para o `revisor`, o discriminante será `tipo`. Neste primeiro exemplo mínimo, um estado disponível traz `codigoHttp` e um estado com falha traz `detalle`. No modelo completo da figura seguinte, `duracionMs` é acrescentado ao caso disponível. Não são dados opcionais de um objeto genérico; são dados que existem pelo tipo de resultado que ocorreu.

```ts
// fig03_10.ts
type EstadoDisponible = {
  tipo: "disponible";
  codigoHttp: number;
};

type EstadoFalla = {
  tipo: "falla";
  detalle: string;
};

type Estado = EstadoDisponible | EstadoFalla;

function descripcion(estado: Estado): string {
  if (estado.tipo === "disponible") {
    return `HTTP ${estado.codigoHttp}`;
  }

  return `falla: ${estado.detalle}`;
}

console.log(descripcion({ tipo: "disponible", codigoHttp: 204 }));
console.log(descripcion({ tipo: "falla", detalle: "tiempo agotado" }));
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig03_10.ts
$ node fig03_10.js
HTTP 204
falla: tiempo agotado
```

Dentro do `if`, o TypeScript sabe que `estado` é `EstadoDisponible`, porque só essa alternativa pode ter `tipo: "disponible"`. Depois do `if`, ele sabe que restou `EstadoFalla`, porque a união tinha exatamente duas alternativas. Essa redução se chama *narrowing* (estreitamento de tipo). Não é uma conversão de dados: o objeto já tinha uma forma concreta; a condição permite que o compilador determine qual é.

O projeto evita combinações sem significado. Com um tipo fraco como este:

```ts
type EstadoDebil = {
  tipo: "disponible" | "falla";
  codigoHttp?: number;
  detalle?: string;
};
```

você poderia criar um estado disponível sem código, uma falha sem detalhe ou um estado disponível que além disso tenha o detalhe de uma falha. Todas essas combinações compilariam, porque o tipo admite propriedades opcionais sem relacioná-las a `tipo`. A união discriminada incorpora a relação ao contrato.

Dentro do revisor, o estado completo conserva o serviço junto com o resultado. Isso torna possível imprimir um relatório sem reconstruir que serviço produziu cada dado. Observe que cada variante repete `servicio`; mais adiante você poderá extrair essa parte comum se isso melhorar a clareza, mas repetir algumas propriedades é preferível a esconder um modelo difícil de ler.

```json fig03_11/package.json
{
  "name": "revisor",
  "private": true,
  "type": "module",
  "scripts": {
    "compilar": "tsc",
    "verificar": "tsc --noEmit",
    "arrancar": "node dist/main.js"
  }
}
```
```json fig03_11/tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "nodenext",
    "rootDir": "./src",
    "outDir": "./dist",
    "types": ["node"],
    "sourceMap": true
  },
  "include": ["src"]
}
```
```ts
// fig03_11/src/modelo.ts
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
// fig03_11/src/main.ts
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
  detalle: "tiempo agotado",
};

console.log(lineaReporte(catalogo));
console.log(lineaReporte(pagos));
```
```bash
$ cd fig03_11
$ npm run compilar
> compilar
> tsc
$ npm run arrancar
> arrancar
> node dist/main.js

catálogo: HTTP 200 en 42 ms
pagos: falla (tiempo agotado)
```

O import usa `type Estado` porque só importa informação para o compilador. O TypeScript elimina essa importação de tipo do JavaScript emitido; `lineaReporte`, por sua vez, é uma função real e é de fato importada para que o Node possa executá-la. A extensão `.js` no caminho relativo continua sendo obrigatória porque o Node resolverá o arquivo emitido.

Não escreva condições baseadas na presença de uma propriedade quando você já tem um discriminante claro. Perguntar `if ("codigoHttp" in estado)` pode funcionar, mas descreve um detalhe acidental da representação. Perguntar `if (estado.tipo === "disponible")` expressa a regra do domínio: você está tratando o caso disponível. O código fica mais fácil de ler, e o TypeScript pode reduzir o tipo de forma direta.

Quando você acrescentar uma terceira alternativa, por exemplo `"cancelado"`, as funções que tratam os estados devem decidir o que fazer com ela. Uma guarda de exaustividade torna verificável essa obrigação: no `default` de um `switch`, você atribui o estado restante a uma variável `never`. `never` é o tipo que representa um valor impossível; se todas as alternativas já foram tratadas, o TypeScript aceita essa atribuição. Esse atrito é uma vantagem. Um estado novo não deveria aparecer silenciosamente no painel como se fosse uma falha conhecida; a guarda permite que o compilador aponte cada função que precisa acrescentar um ramo.

O programa a seguir acrescenta `EstadoCancelado`, mas deixa o `switch` intacto. Com o TypeScript 7.0.2, o `tsc` imprime o TS2322 porque no `default` ainda resta um `EstadoCancelado`, que não pode ser atribuído a `never`.

```ts
// fig03_14.ts
type EstadoDisponible = {
  tipo: "disponible";
  codigoHttp: number;
};

type EstadoFalla = {
  tipo: "falla";
  detalle: string;
};

type EstadoCancelado = {
  tipo: "cancelado";
  motivo: string;
};

type Estado = EstadoDisponible | EstadoFalla | EstadoCancelado;

function descripcion(estado: Estado): string {
  switch (estado.tipo) {
    case "disponible":
      return `HTTP ${estado.codigoHttp}`;
    case "falla":
      return `falla: ${estado.detalle}`;
    default: {
      const sinAtender: never = estado;
      return sinAtender;
    }
  }
}
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig03_14.ts
fig03_14.ts(26,13): error TS2322: Type 'EstadoCancelado' is not assignable to type 'never'.
```

## O erro que você vai ver

O TS2540 aparece quando você tenta reatribuir uma propriedade `readonly`, como aconteceu em `fig03_06.ts`. O compilador não está dizendo que o objeto seja impossível de usar; está apontando uma operação concreta que contradiz o contrato. A correção certa depende da intenção: se o identificador realmente não deve mudar, crie um objeto novo com o novo valor; se ele devia poder mudar durante uma etapa de normalização, use um tipo mutável somente dentro dessa etapa e construa depois o valor definitivo.

Outro diagnóstico frequente com uniões discriminadas é o TS2339. Ocorre quando você tenta ler uma propriedade que não existe em todas as alternativas sem verificar antes o discriminante.

```ts
// fig03_12.ts
type EstadoDisponible = {
  tipo: "disponible";
  codigoHttp: number;
};

type EstadoFalla = {
  tipo: "falla";
  detalle: string;
};

type Estado = EstadoDisponible | EstadoFalla;

function codigo(estado: Estado): number {
  return estado.codigoHttp;
}
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig03_12.ts
fig03_12.ts(15,17): error TS2339: Property 'codigoHttp' does not exist on type 'Estado'.
  Property 'codigoHttp' does not exist on type 'EstadoFalla'.
```

O TS2339 significa que a propriedade não é garantida pelo tipo atual. `codigoHttp` existe para `EstadoDisponible`, mas não para `EstadoFalla`. Não use uma asserção como `estado as EstadoDisponible` para esconder o diagnóstico: se o resultado de fato é uma falha, essa promessa seria falsa. Primeiro verifique `estado.tipo === "disponible"`; só dentro desse ramo o código HTTP está disponível.

O TS2741 aparece ao construir um objeto que omite uma propriedade obrigatória. É particularmente útil ao mudar o modelo, porque aponta todas as construções que já não cumprem o contrato.

```ts
// fig03_13.ts
interface Servicio {
  nombre: string;
  url: string;
  timeoutMs: number;
}

const catalogo: Servicio = {
  nombre: "catálogo",
  url: "https://catalogo.example",
};
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig03_13.ts
fig03_13.ts(8,7): error TS2741: Property 'timeoutMs' is missing in type '{ nombre: string; url: string; }' but required in type 'Servicio'.
```

Não corrija o TS2741 acrescentando valores inventados como `timeoutMs: 0` sem decidir o que significa zero. Pode ser um valor válido, pode significar “sem tempo limite” ou pode ser uma configuração perigosa. O diagnóstico não pede apenas uma propriedade; pede que você resolva uma decisão do domínio. Se o tempo limite deve ser obrigatório, forneça um valor escolhido conscientemente. Se de fato pode faltar, modele essa ausência e trate-a antes de iniciar uma consulta.

## O que se faz errado

- **Guardar um serviço em variáveis soltas.** Enquanto há um único serviço, parece mais curto. Com vários, os valores se misturam e as assinaturas de funções ficam longas e frágeis. Um objeto `Servicio` conserva juntos os dados que descrevem uma mesma configuração.

- **Escolher `type` ou `interface` como regra absoluta.** Os dois servem para muitos objetos. Usar `interface` para entidades de objeto e `type` para uniões é uma convenção útil; discutir qual é universalmente superior distrai da pergunta importante: que forma o programa deve admitir.

- **Usar `readonly` como se fosse segurança de execução.** O modificador só existe durante a verificação de tipos e é superficial. Não valida entradas externas, não congela objetos aninhados e não impede que um JavaScript sem tipos mude uma referência compartilhada.

- **Declarar todas as propriedades opcionais em um estado único.** Um tipo com `codigoHttp?: number` e `detalle?: string` admite combinações contraditórias. Uma união discriminada expressa que propriedades existem em cada alternativa e obriga a verificar o caso antes de usá-lo.

- **Verificar propriedades acidentais em vez do discriminante.** `if ("detalle" in estado)` depende de como o objeto está representado hoje. `if (estado.tipo === "falla")` expressa a decisão do domínio e deixa mais clara a redução de tipo.

- **Usar `as EstadoDisponible` para tirar o TS2339.** Uma asserção não converte uma falha em um resultado disponível. Se o valor vem de uma união, o caminho seguro é estreitá-lo com o discriminante. Se vem de fora do programa, deve ser validado primeiro.

- **Modelar `Servicio` e `Estado` como se fossem a mesma entidade.** O serviço representa a intenção de consultar uma URL; o estado representa o que aconteceu ao tentar. Mantê-los separados evita que uma resposta observada mude acidentalmente a configuração que a originou.

## Exercícios

### Exercício 1 — Um serviço completo

Defina uma interface `Servicio` com `nombre`, `url` e `timeoutMs`, todos obrigatórios. Crie dois serviços, `catálogo` e `pagos`, e uma função `etiqueta` que receba um `Servicio` e imprima o nome e a URL dele. Compile com `strict`; depois elimine `timeoutMs` de um dos objetos e explique o diagnóstico que aparece.

### Exercício 2 — Configuração que não muda

Modifique `Servicio` para que `nombre`, `url` e `timeoutMs` sejam `readonly`. Tente reatribuir `url` depois de criar um serviço e confirme o TS2540. Depois escreva uma função `conTimeout(servicio, timeoutMs)` que devolva um novo objeto `Servicio` com o limite alterado, sem mutar o original.

### Exercício 3 — Relatório de resultados

Defina `EstadoDisponible` com `servicio`, `tipo: "disponible"`, `codigoHttp` e `duracionMs`. Defina `EstadoFalla` com `servicio`, `tipo: "falla"` e `detalle`. Crie `type Estado` como união das duas alternativas e uma função `lineaReporte` que produza uma linha diferente para cada caso. Teste pelo menos um resultado de cada tipo.

### Exercício 4 — Um estado novo obriga a decidir

Acrescente `EstadoCancelado` com `tipo: "cancelado"` e `motivo`. Inclua-o em `Estado`. Reescreva `lineaReporte` como um `switch` com um `default` que atribua o estado a uma variável `never`. Primeiro deixe de fora o caso `"cancelado"` e confirme o TS2322; depois acrescente o ramo dele para que também o mostre. Identifique as funções que têm essa guarda de exaustividade e explique por que isso é preferível a que um cancelamento apareça como uma falha genérica.

## Soluções

### Solução 1

A interface deve agrupar os três dados necessários para iniciar uma consulta. Ao apagar `timeoutMs`, o TypeScript produz o TS2741 porque a configuração deixou de cumprir o contrato. O diagnóstico está correto: o programa ainda precisa decidir quanto tempo pode esperar antes de dar uma consulta por falha.

```ts
interface Servicio {
  nombre: string;
  url: string;
  timeoutMs: number;
}

function etiqueta(servicio: Servicio): string {
  return `${servicio.nombre}: ${servicio.url}`;
}
```

### Solução 2

`readonly` impede atribuir à propriedade existente, mas criar um valor novo é válido. A função devolve uma cópia com o novo limite; o operador spread conserva as demais propriedades.

```ts
function conTimeout(servicio: Servicio, timeoutMs: number): Servicio {
  return {
    ...servicio,
    timeoutMs,
  };
}
```

O objeto original não muda. Essa propriedade é valiosa quando o mesmo `Servicio` é compartilhado entre o código que monta o relatório e o código que executa a consulta.

### Solução 3

A solução precisa perguntar pelo discriminante antes de acessar dados particulares de uma alternativa. Dentro de cada ramo, o TypeScript reduz o tipo automaticamente.

```ts
function lineaReporte(estado: Estado): string {
  if (estado.tipo === "disponible") {
    return `${estado.servicio.nombre}: HTTP ${estado.codigoHttp} en ${estado.duracionMs} ms`;
  }

  return `${estado.servicio.nombre}: falla (${estado.detalle})`;
}
```

Não é preciso perguntar se `codigoHttp` existe: a comparação com `tipo` já prova que o valor é um `EstadoDisponible`.

### Solução 4

A nova alternativa deve ser adicionada explicitamente à união e à função que a apresenta.

```ts
type EstadoCancelado = {
  servicio: Servicio;
  tipo: "cancelado";
  motivo: string;
};
```

Depois, `lineaReporte` precisa de um ramo para `"cancelado"` e de uma guarda de exaustividade no fim do `switch`.

```ts
function lineaReporte(estado: Estado): string {
  switch (estado.tipo) {
    case "disponible":
      return `${estado.servicio.nombre}: HTTP ${estado.codigoHttp} en ${estado.duracionMs} ms`;
    case "falla":
      return `${estado.servicio.nombre}: falla (${estado.detalle})`;
    case "cancelado":
      return `${estado.servicio.nombre}: cancelado (${estado.motivo})`;
    default: {
      const sinAtender: never = estado;
      return sinAtender;
    }
  }
}
```

Com os três ramos, `estado` já é impossível no `default`, de modo que a atribuição a `never` compila. Se você acrescentar outra alternativa a `Estado` e esquecer o `case` dela, o TS2322 apontará esta função. Isso permite diferenciar um cancelamento intencional de uma falha de rede e obriga a atualizar as funções que de fato escolheram uma guarda de exaustividade; uma função sem essa guarda não pode prometer que o compilador a apontará.

## Como sei que consegui

- [ ] `npx tsc --version` imprime `Version 7.0.2`.
- [ ] `node --version` começa com `v24`.
- [ ] Depois de criar a estrutura de `fig03_11`, `cd fig03_11 && npm run compilar && npm run arrancar` imprime exatamente:

```text
catálogo: HTTP 200 en 42 ms
pagos: falla (tiempo agotado)
```

- [ ] Ao compilar `fig03_06.ts` com `npx tsc --strict --target ES2022 --module nodenext fig03_06.ts`, você obtém o TS2540 e não tenta executá-lo como se tivesse compilado.
- [ ] Ao compilar `fig03_12.ts` com `npx tsc --strict --target ES2022 --module nodenext fig03_12.ts`, você obtém o TS2339 e consegue explicar por que `codigoHttp` só pode ser lido depois de verificar `tipo`.
- [ ] Ao compilar `fig03_14.ts` com `npx tsc --strict --target ES2022 --module nodenext fig03_14.ts`, você obtém o TS2322; acrescenta o `case "cancelado"` e a guarda `never` volta a compilar sem `any` nem asserções.
- [ ] Você consegue explicar que `readonly` protege a reatribuição durante a verificação do TypeScript, mas não congela por si só um objeto no Node.

## Para ler mais

- [TypeScript Handbook: Object Types](https://www.typescriptlang.org/docs/handbook/2/objects.html) — documentação oficial sobre objetos, interfaces, propriedades `readonly` e compatibilidade estrutural; consultado em 2 de outubro de 2026.

- [TypeScript Handbook: Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#interfaces) — documentação oficial sobre interfaces, aliases e suas diferenças práticas; consultado em 2 de outubro de 2026.

- [TypeScript Handbook: Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions) — documentação oficial sobre redução de tipos e uniões discriminadas; consultado em 2 de outubro de 2026.

- [MDN: Object.freeze()](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze) — referência sobre a diferença entre uma restrição estática e congelar objetos durante a execução; consultado em 2 de outubro de 2026.
