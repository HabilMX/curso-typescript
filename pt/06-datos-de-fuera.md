# Lição 6 — Dados que chegam de fora

**Tempo:** 2 × 45 min

**O que você constrói:** validação de configuração e respostas

**O que você aprende:** o tipo não valida em tempo de execução: validar na fronteira; tipos derivados do esquema

## Ao terminar, você vai conseguir

- Distinguir os dados confiáveis dentro do programa dos valores que chegam de um JSON, de uma variável de ambiente ou de uma resposta HTTP.
- Receber dados externos como `unknown` e convertê-los em um contrato interno somente depois de validá-los.
- Escrever guardas de tipo e funções de validação que deem erros úteis sem usar `any` nem asserções para esconder problemas.
- Ler e validar uma lista de serviços a partir de um arquivo JSON antes de iniciar consultas concorrentes.
- Converter variáveis de ambiente, que sempre chegam como texto ou ausência, em configurações numéricas válidas.
- Derivar o tipo interno de um esquema de validação para evitar manter dois contratos que se contradizem.

## O porquê antes do como

Até a lição anterior, o `revisor` já tem uma lista de `Servicio`, pode consultar seus destinos de forma concorrente e converte as falhas esperadas em valores `Estado`. Tudo isso funciona muito bem enquanto cada objeto é construído diretamente em arquivos TypeScript. Se você escreve `{ nombre: "catálogo", url: "https://catalogo.example", timeoutMs: 1500 }`, o compilador pode verificar que o objeto contém as três propriedades e que cada uma tem o tipo prometido.

Um programa real não vive só de objetos escritos por quem programa. A lista de serviços pode vir de um arquivo JSON modificado por alguém da equipe de operações. A porta da API pode vir de uma variável de ambiente configurada ao subir um contêiner. A resposta de um serviço remoto pode trazer um JSON produzido por outra aplicação, com outra versão, outra política de erros ou um defeito temporário. Nos três casos, o programa recebe valores de JavaScript que não passaram pelo compilador deste projeto.

Esta é uma fronteira importante. Dentro do `revisor`, depois de validar, você pode trabalhar com `Servicio`, `Estado` e `Reporte` como contratos conhecidos. Na fronteira, antes de validar, você só sabe que chegou alguma coisa. Pode ser um objeto, um array, `null`, texto, um número ou um objeto que parece correto exceto por uma propriedade. A decisão sensata é tornar explícita essa incerteza: receber `unknown`, inspecionar o valor durante a execução e produzir um dado confiável ou um erro que indique o que precisa ser corrigido.

É frequente pensar que uma anotação do TypeScript resolve esse problema. Se você escreve `const servicio = JSON.parse(texto) as Servicio`, o editor deixa de mostrar avisos e o código seguinte pode ler `servicio.timeoutMs`. Mas nenhuma verificação aconteceu. `as Servicio` pede ao compilador que confie em você; não examina o JSON, não converte uma string em número e não acrescenta uma propriedade ausente. Quando o Node executar o JavaScript emitido, o alias `Servicio` já não existirá.

A diferença se parece com a que existe em Go entre desserializar um JSON e validar um `struct`. O Go pode preencher os campos conhecidos de uma estrutura, mas você ainda precisa decidir se os valores recebidos são aceitáveis: uma URL vazia, uma porta zero ou um limite negativo podem caber nos seus tipos e continuar sendo configurações inválidas. O TypeScript tem uma responsabilidade adicional: antes mesmo de afirmar que um valor tem forma de objeto, precisa verificá-lo. O tipo estático protege as relações do seu código; a validação protege a entrada vinda do mundo exterior.

A fronteira não é um lugar para repetir validações por toda a aplicação. Se dez funções perguntam se `timeoutMs` é número, você acaba com dez versões da mesma regra e dez mensagens diferentes. Se você valida uma vez ao carregar a configuração, o resto recebe `readonly Servicio[]` e se concentra em consultar, coordenar e apresentar resultados. A validação não torna confiáveis os demais serviços remotos; estabelece onde o `revisor` decide que dados pode aceitar como seus.

Também importa distinguir estrutura de regra de negócio. Confirmar que `timeoutMs` é um número elimina uma classe de erros, mas ainda admite `-50`, `NaN` ou `3.14`. Para este projeto, o limite é uma quantidade inteira de milissegundos e deve ser positiva. Confirmar que `url` é uma string também não prova que o destino responda nem que pertença à rede correta; apenas comprova que a configuração contém um texto não vazio que o passo seguinte pode interpretar como URL. Cada camada responde a uma pergunta diferente e nenhuma substitui as demais.

O objetivo da lição não é construir uma biblioteca enorme de validação. É aprender uma ordem de trabalho que se mantém quando o projeto cresce: definir uma regra executável na fronteira, obter dela um valor interno confiável e conservar uma explicação clara quando a entrada não cumpre. Essa ordem vai preparar o `revisor` para a API da lição 8 e para o painel da lição 9, em que tanto o servidor quanto o navegador voltarão a cruzar fronteiras de dados.

## Os conceitos

### Os tipos são apagados; `unknown` conserva a dúvida correta

O TypeScript analisa o código antes de emitir JavaScript. Os aliases, as interfaces, os parâmetros genéricos e as anotações ajudam o compilador, mas não se convertem em verificações automáticas na execução. O Node recebe JavaScript comum: não pode perguntar se um objeto “é um `Servicio`”, porque esse nome não existe como valor durante a execução.

`JSON.parse` converte texto JSON em um valor de JavaScript. A especificação JSON permite que esse valor seja qualquer um dos tipos possíveis de JSON: objeto, array, string, número, booleano ou `null`. Embora você saiba que o arquivo deveria conter serviços, essa expectativa não muda o que chegou. Por isso convém guardar o resultado como `unknown` antes de inspecioná-lo.

```ts
// fig06_01.ts
interface Servicio {
  nombre: string;
  url: string;
  timeoutMs: number;
}

const bruto: unknown = JSON.parse(
  '{"nombre":"catálogo","url":"https://catalogo.example","timeoutMs":"rápido"}',
);

const supuesto = bruto as Servicio;

console.log(typeof supuesto.timeoutMs);
console.log(supuesto.timeoutMs);
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig06_01.ts
$ node fig06_01.js
string
rápido
```

A figura compila porque a asserção ordena ao compilador que trate o valor como `Servicio`. No entanto, a execução mostra a realidade: `timeoutMs` continua sendo uma string. Se uma função posterior fizesse aritmética com esse valor, o JavaScript poderia convertê-lo de maneira inesperada ou produzir `NaN`. O problema não começou na operação aritmética; começou no momento em que se afirmou um contrato sem evidência.

`unknown` não significa que o valor seja inútil. Significa que você ainda não pode ler propriedades nem chamá-lo como função. Essa restrição é útil porque obriga a fazer a verificação no lugar correto. Depois de provar que o valor é um objeto não nulo, você pode revisar suas chaves; depois de provar que uma chave contém um número inteiro positivo, pode usá-la como limite.

Não confunda `unknown` com `any`. `any` desliga a verificação e permite acessar qualquer propriedade como se fosse válida. É cômodo por alguns segundos e caro depois: um erro externo pode viajar silenciosamente por várias funções até aparecer longe de sua origem. `unknown`, em contrapartida, mantém a incerteza visível. É o tipo adequado para JSON, valores de `catch`, mensagens entre processos e dados que chegam de uma rede.

Dentro do `revisor`, a lista configurada é uma fronteira. O arquivo JSON não deve alimentar diretamente `revisarTodos`; primeiro deve passar por uma função que demonstre que existe uma lista de serviços utilizáveis. Depois dessa função, `revisarTodos` pode conservar o contrato da lição 5: recebe uma coleção de `Servicio` e devolve uma `Promise` de estados. Não precisa saber de JSON nem de propriedades escritas errado.

### Guardas de tipo: verificar a forma que o JavaScript realmente tem

Uma guarda de tipo é uma função que faz uma verificação durante a execução e cuja assinatura comunica ao compilador o que você aprendeu se ela devolver `true`. A forma mais simples para começar é verificar se algo é um registro de propriedades. `typeof valor === "object"` não basta, porque em JavaScript `typeof null` também é `"object"`, e porque os arrays são objetos embora não representem a configuração de um serviço.

Uma guarda para registro não valida por si só um `Servicio`. Apenas abre a porta para consultar propriedades de maneira segura. A partir dela você pode pegar `nombre`, `url` e `timeoutMs` como valores `unknown` e validar cada um com suas regras. Separar esses passos evita dar um significado excessivamente amplo a uma verificação pequena.

A figura 06_01 usa uma versão simplificada e mutável de `Servicio` para isolar o risco de uma asserção. A partir da figura 06_02 o modelo recupera suas três propriedades `readonly`, porque a configuração já foi aceita e não deve mudar durante uma revisão.

```ts
// fig06_02.ts
type Resultado<T> =
  | { ok: true; valor: T }
  | { ok: false; detalle: string };

interface Servicio {
  readonly nombre: string;
  readonly url: string;
  readonly timeoutMs: number;
}

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function leerServicio(valor: unknown): Resultado<Servicio> {
  if (!esRegistro(valor)) {
    return { ok: false, detalle: "debe ser un objeto" };
  }

  const { nombre, url, timeoutMs } = valor;

  if (typeof nombre !== "string" || nombre.trim() === "") {
    return { ok: false, detalle: "nombre debe ser texto no vacío" };
  }

  if (typeof url !== "string" || url.trim() === "") {
    return { ok: false, detalle: "url debe ser texto no vacío" };
  }

  if (
    typeof timeoutMs !== "number" ||
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs <= 0
  ) {
    return { ok: false, detalle: "timeoutMs debe ser un entero positivo" };
  }

  return { ok: true, valor: { nombre, url, timeoutMs } };
}

for (const entrada of [
  { nombre: "catálogo", url: "https://catalogo.example", timeoutMs: 1500 },
  { nombre: "pagos", url: "https://pagos.example", timeoutMs: "1500" },
]) {
  const resultado = leerServicio(entrada);

  if (resultado.ok) {
    console.log(`${resultado.valor.nombre}: ${resultado.valor.timeoutMs} ms`);
  } else {
    console.log(`inválido: ${resultado.detalle}`);
  }
}
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig06_02.ts
$ node fig06_02.js
catálogo: 1500 ms
inválido: timeoutMs debe ser un entero positivo
```

A função devolve `Resultado<Servicio>` e não lança uma exceção para uma configuração ruim esperada. Isso permite que quem chama decida se deve interromper a inicialização, mostrar todos os erros ou continuar com uma configuração padrão. Para uma lista de destinos que define o que será revisado, interromper a inicialização com uma explicação costuma ser melhor que iniciar apenas uma parte sem avisar.

A regra de inteiro usa `Number.isSafeInteger`, e não apenas `typeof timeoutMs === "number"`. Em JavaScript, `NaN`, `Infinity` e `2.5` também têm tipo `number`, mas nenhum representa corretamente uma quantidade inteira de milissegundos. A parte `timeoutMs <= 0` expressa uma decisão deste projeto: zero não significa “sem limite”; é uma configuração inválida. Se o produto precisasse representar “sem limite”, deveria ter uma alternativa deliberada, e não aproveitar um número ambíguo.

Dentro do `revisor`, essa mesma função converte um objeto externo em um `Servicio` interno. O tipo `readonly` recupera sua utilidade depois da fronteira: uma vez aceita a configuração, ninguém deveria mudar o nome, a URL nem o limite de uma revisão já iniciada. A guarda não valida que a URL responda. Essa verificação pertence à consulta assíncrona, que pode produzir um `EstadoFalla` mesmo quando a configuração tenha sido perfeitamente válida.

### JSON de configuração: validar o documento completo antes de trabalhar

Um arquivo JSON válido pode conter dados incorretos para a sua aplicação. `JSON.parse` só responde se o texto segue a gramática do JSON; não sabe que você espera um array de serviços nem que seus nomes devem ser distintos. Por exemplo, `{"timeoutMs":"mil"}` é um JSON válido, mas não é uma configuração utilizável.

Convém separar três falhas que costumam se misturar. A primeira é não conseguir ler o arquivo: talvez ele não exista ou o processo não tenha permissão. A segunda é o texto não ser um JSON válido. A terceira é o JSON ser sintaticamente correto, mas não cumprir o contrato do `revisor`. Cada uma requer uma explicação diferente para ser corrigida, embora todas impeçam iniciar a revisão.

O programa a seguir carrega um arquivo ao lado do módulo. Usa `node:fs/promises`, o prefixo exigido para os módulos nativos do Node, e uma URL relativa a `import.meta.url` para não depender do diretório de onde o Node foi invocado. O JSON é recebido como `unknown`; o array é validado elemento por elemento antes de ser devolvido.

Esta figura usa `await` no nível superior do arquivo. Salve-a dentro da pasta `figuras/` criada na lição 1, cujo `package.json` contém `{"type":"module"}`; assim o TypeScript e o Node a tratam como módulo ESM. Sem essa configuração, `await` só seria válido dentro de uma função `async`.

```json fig06_03.servicios.json
[
  {
    "nombre": "catálogo",
    "url": "https://catalogo.example",
    "timeoutMs": 1500
  },
  {
    "nombre": "pagos",
    "url": "https://pagos.example",
    "timeoutMs": 3000
  }
]
```

```ts
// fig06_03.ts
import { readFile } from "node:fs/promises";

type Resultado<T> =
  | { ok: true; valor: T }
  | { ok: false; detalle: string };

interface Servicio {
  readonly nombre: string;
  readonly url: string;
  readonly timeoutMs: number;
}

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function leerServicio(valor: unknown): Resultado<Servicio> {
  if (!esRegistro(valor)) {
    return { ok: false, detalle: "debe ser un objeto" };
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

function leerServicios(valor: unknown): Resultado<readonly Servicio[]> {
  if (!Array.isArray(valor)) {
    return { ok: false, detalle: "la configuración debe ser un arreglo" };
  }

  const servicios: Servicio[] = [];

  for (const [indice, entrada] of valor.entries()) {
    const resultado = leerServicio(entrada);

    if (!resultado.ok) {
      return {
        ok: false,
        detalle: `servicio ${indice + 1}: ${resultado.detalle}`,
      };
    }

    servicios.push(resultado.valor);
  }

  return { ok: true, valor: servicios };
}

const archivo = new URL("./fig06_03.servicios.json", import.meta.url);
const texto = await readFile(archivo, "utf8");
const resultado = leerServicios(JSON.parse(texto) as unknown);

if (resultado.ok) {
  console.log(`configuración: ${resultado.valor.length} servicios`);
} else {
  console.log(`configuración inválida: ${resultado.detalle}`);
}
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext --types node fig06_03.ts
$ node fig06_03.js
configuración: 2 servicios
```

Desde o TypeScript 6, o `@types/node` já não é carregado automaticamente ao compilar um arquivo isolado. Como esta figura importa `node:fs/promises`, `--types node` inclui explicitamente as declarações do Node instaladas e permite que o TypeScript reconheça esse módulo nativo. A flag apenas fornece tipos para a compilação; o Node continua fornecendo o módulo quando o programa é executado.

O `as unknown` no final de `JSON.parse` não afirma que o documento seja válido. Faz o contrário: evita confiar no tipo amplo que a biblioteca expõe e força `leerServicios` a tratá-lo como entrada não verificada. A evidência vem das verificações concretas de `Array.isArray`, `esRegistro`, `typeof` e `Number.isSafeInteger`.

Este exemplo interrompe a validação no primeiro serviço inválido para manter a função curta. Outra política válida é acumular todos os problemas em um array de erros, especialmente se uma pessoa for editar um arquivo grande e convier corrigir tudo de uma vez. A regra importante não muda: o relatório não deve começar até decidir se a configuração completa é aceitável. Silenciar uma entrada inválida e continuar pode deixar serviços sem revisar sem que ninguém perceba.

Também falta uma regra útil para produção: nomes duplicados. A lição 4 já mostrou como detectá-los com `Set`. Essa regra deve ser executada depois de validar a forma de cada serviço, porque só então você sabe que `nombre` é uma string. Primeiro você converte cada entrada externa em um contrato confiável; depois aplica as regras que relacionam vários serviços entre si.

### Variáveis de ambiente: texto, ausência e conversão explícita

As variáveis de ambiente também cruzam uma fronteira. No Node, `process.env.PUERTO` tem tipo `string | undefined`, mesmo que a pessoa que prepara a implantação ache que escreveu um número. O sistema operacional transporta texto; não existe variável de ambiente numérica. Se o valor é `"8080"`, você precisa convertê-lo. Se é `"ocho-mil-ochenta"`, a conversão deve falhar de forma legível.

Não use `Number(valor)` sem uma decisão adicional. `Number("")` produz `0`, `Number(" ")` também produz `0`, e `Number("3.5")` produz um número embora não seja uma porta inteira. Também não use `parseInt` como validação completa: `parseInt("3000ms", 10)` entrega `3000`, aceitando silenciosamente um texto que provavelmente era um erro. Verificar o formato antes de converter mantém o contrato claro.

```ts
// fig06_04.ts
type Resultado<T> =
  | { ok: true; valor: T }
  | { ok: false; detalle: string };

function leerEnteroPositivo(
  nombre: string,
  valor: string | undefined,
  predeterminado: number,
): Resultado<number> {
  if (valor === undefined) {
    return { ok: true, valor: predeterminado };
  }

  if (!/^[1-9]\d*$/.test(valor)) {
    return {
      ok: false,
      detalle: `${nombre} debe ser un entero positivo`,
    };
  }

  const numero = Number(valor);

  if (!Number.isSafeInteger(numero)) {
    return {
      ok: false,
      detalle: `${nombre} está fuera del rango seguro`,
    };
  }

  return { ok: true, valor: numero };
}

const entorno: Record<string, string | undefined> = {
  PUERTO: "8080",
  REVISOR_MAX_SERVICIOS: "muchos",
};

const puerto = leerEnteroPositivo(
  "PUERTO",
  entorno.PUERTO,
  3000,
);
const maximo = leerEnteroPositivo(
  "REVISOR_MAX_SERVICIOS",
  entorno.REVISOR_MAX_SERVICIOS,
  20,
);

console.log(puerto.ok ? `puerto: ${puerto.valor}` : puerto.detalle);
console.log(maximo.ok ? `máximo: ${maximo.valor}` : `máximo inválido: ${maximo.detalle}`);
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig06_04.ts
$ node fig06_04.js
puerto: 8080
máximo inválido: REVISOR_MAX_SERVICIOS debe ser un entero positivo
```

O objeto `entorno` torna o exemplo determinístico. No programa real, o segundo argumento será `process.env.PUERTO`. A função não precisa mudar: continua recebendo uma string ou `undefined`, e devolve um número confiável ou um detalhe. O valor padrão é usado apenas quando a variável está ausente; não deve esconder uma variável presente mas mal escrita. Uma ausência pode ter um valor seguro escolhido pelo projeto; uma configuração explícita e inválida deve pedir correção.

Dentro do `revisor`, a configuração da porta pertence ao servidor da lição 8 e a configuração do limite de serviços pode proteger a inicialização. Não misture essas variáveis com a lista de `Servicio`: a porta descreve como a API escuta; a lista descreve que destinos ela consulta. Ter funções pequenas por categoria permite dar mensagens precisas e evita que uma variável arbitrária acabe como propriedade opcional de um serviço.

A validação de variáveis de ambiente também é um limite de segurança. Nunca imprima o conteúdo de todas as variáveis para depurar uma conversão que falhou: um ambiente pode conter segredos. Para um valor não sensível como uma porta, você pode nomear a variável que falhou. Para uma credencial futura, informe que ela está ausente ou é inválida sem reproduzir o segredo, nem parte dele, em um log ou em uma resposta HTTP.

### Esquemas e tipos derivados: uma única regra para execução e compilação

À medida que aparecem mais entradas, escrever um tipo de um lado e uma validação independente do outro pode duplicar decisões. Você poderia atualizar `Servicio` para acrescentar `equipo` e esquecer de atualizar o validador; o compilador vigiaria as construções internas, mas uma entrada externa poderia chegar sem o novo campo. Um esquema procura reduzir essa distância: é um valor que sabe ler `unknown` durante a execução e que além disso permite derivar seu tipo de saída.

Um esquema não é mágica. Continua precisando de regras explícitas para texto, inteiros, URL e objetos. A diferença é que a função de validação tem um contrato genérico: recebe `unknown` e entrega `Resultado<T>`. O parâmetro `T` descreve o valor que fica disponível depois de validar. Um tipo condicional pode extrair esse `T` do esquema sem escrever uma segunda definição manual.

### Tipos condicionais, `infer` e tipos mapeados, passo a passo

Um **tipo condicional** é uma regra de tipos com a forma `A extends B ? X : Y`: se `A` é compatível com `B`, produz `X`; caso contrário, produz `Y`. `infer` é uma palavra reservada que, dentro dessa comparação, captura uma parte do tipo que o TypeScript consegue deduzir. Um **tipo mapeado** percorre as chaves de outro tipo para construir uma propriedade para cada uma; a forma `[K in keyof T]` significa “para cada chave `K` de `T`”. Os três existem apenas para o compilador: não geram instruções de JavaScript.

Este pequeno exemplo mostra uma peça de cada vez. `Salida` é condicional porque só extrai `T` quando recebe um `Esquema<T>`; `infer T` dá nome a esse tipo extraído. `ValoresDe` é mapeado: conserva `nombre` e `timeoutMs` de `campos`, mas substitui cada esquema por sua saída. A compilação confirma que `servicio` tem ambas as propriedades com o tipo correto antes de o Node imprimir o texto.

```ts
// fig06_07.ts
type Esquema<T> = { ejemplo: T };

type Salida<E> = E extends Esquema<infer T> ? T : never;

type ValoresDe<T extends Record<string, Esquema<unknown>>> = {
  [K in keyof T]: Salida<T[K]>;
};

const texto: Esquema<string> = { ejemplo: "catálogo" };
const entero: Esquema<number> = { ejemplo: 1500 };

const campos = { nombre: texto, timeoutMs: entero };

type ServicioDerivado = ValoresDe<typeof campos>;

const servicio: ServicioDerivado = {
  nombre: "catálogo",
  timeoutMs: 1500,
};

console.log(`${servicio.nombre}: ${servicio.timeoutMs} ms`);
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig06_07.ts
$ node fig06_07.js
catálogo: 1500 ms
```

`Salida<Esquema<string>>` é resolvido como `string`; `Salida<Esquema<number>>`, em `number`. Por isso o tipo mapeado termina como `{ nombre: string; timeoutMs: number }`. Se você trocar `timeoutMs` por texto no objeto final, a compilação falha: essa é a verificação estática que acompanha a saída da figura. Agora você pode ler a forma mais compacta de `Inferir` e de `{ [K in keyof T]: ... }` que o esquema completo usa.

A implementação a seguir é deliberadamente pequena. Ensina a relação entre uma regra executável e o tipo derivado; não pretende substituir uma biblioteca de esquemas madura em um sistema grande. Observe que a única asserção está dentro de `objeto`, depois de cada chave ter sido validada. Fica concentrada na infraestrutura genérica, e não espalhada por quem consome dados externos.

```ts
// fig06_05.ts
type Resultado<T> =
  | { ok: true; valor: T }
  | { ok: false; detalle: string };

type Esquema<T> = {
  leer(valor: unknown): Resultado<T>;
};

type Inferir<E extends Esquema<unknown>> =
  E extends Esquema<infer T> ? T : never;

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

const textoNoVacio: Esquema<string> = {
  leer(valor) {
    if (typeof valor === "string" && valor.trim() !== "") {
      return { ok: true, valor };
    }

    return { ok: false, detalle: "debe ser texto no vacío" };
  },
};

const enteroPositivo: Esquema<number> = {
  leer(valor) {
    if (
      typeof valor === "number" &&
      Number.isSafeInteger(valor) &&
      valor > 0
    ) {
      return { ok: true, valor };
    }

    return { ok: false, detalle: "debe ser entero positivo" };
  },
};

function objeto<T extends Record<string, Esquema<unknown>>>(
  campos: T,
): Esquema<{ [K in keyof T]: Inferir<T[K]> }> {
  return {
    leer(valor) {
      if (!esRegistro(valor)) {
        return { ok: false, detalle: "debe ser un objeto" };
      }

      const salida: Record<string, unknown> = {};

      for (const [clave, esquema] of Object.entries(campos)) {
        const resultado = esquema.leer(valor[clave]);

        if (!resultado.ok) {
          return { ok: false, detalle: `${clave}: ${resultado.detalle}` };
        }

        salida[clave] = resultado.valor;
      }

      return {
        ok: true,
        valor: salida as { [K in keyof T]: Inferir<T[K]> },
      };
    },
  };
}

const esquemaServicio = objeto({
  nombre: textoNoVacio,
  url: textoNoVacio,
  timeoutMs: enteroPositivo,
});

type Servicio = Inferir<typeof esquemaServicio>;

const resultado = esquemaServicio.leer({
  nombre: "catálogo",
  url: "https://catalogo.example",
  timeoutMs: 1500,
});

if (resultado.ok) {
  const servicio: Servicio = resultado.valor;
  console.log(`${servicio.nombre}: ${servicio.timeoutMs} ms`);
}
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig06_05.ts
$ node fig06_05.js
catálogo: 1500 ms
```

`Inferir<typeof esquemaServicio>` não cria uma validação nova. Pega o tipo de saída que o valor `esquemaServicio` já descreve. Se você acrescentar `equipo: textoNoVacio` ao objeto de campos, o tipo derivado ganhará `equipo` e a validação o exigirá ao mesmo tempo. Essa relação reduz uma fonte habitual de contradições entre a definição estática e a verificação em tempo de execução.

Dentro do `revisor`, um esquema pode descrever tanto a configuração de entrada quanto uma resposta HTTP que você espera de um serviço particular. A validação de configuração constrói `Servicio`; a validação de resposta pode construir um contrato específico desse serviço antes de o código de revisão extrair informação útil. Você não deve usar um esquema genérico para fingir que todos os serviços remotos respondem do mesmo jeito. Cada fronteira precisa do contrato que realmente promete e das regras operacionais que o projeto decide aceitar.

## O erro que você vai ver

Com o TypeScript 7.0.2 e `strict`, tentar ler uma propriedade diretamente de um `unknown` produz o TS18046. É o diagnóstico que protege a fronteira: o compilador sabe que você ainda não fez uma verificação em tempo de execução.

```ts
// fig06_06.ts
function nombreDe(valor: unknown): string {
  return valor.nombre;
}
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig06_06.ts
fig06_06.ts(3,10): error TS18046: 'valor' is of type 'unknown'.
```

O TS18046 não se resolve com `valor as { nombre: string }`. Essa asserção apenas muda a opinião do compilador e deixa a execução igualmente exposta. Primeiro verifique que o valor é um registro, pegue a propriedade como `unknown` e verifique que é uma string. Uma guarda como `esRegistro` da figura 06_02 resolve a primeira parte; `typeof valor.nombre === "string"` resolve a segunda.

Outro diagnóstico comum aparece quando você tenta usar uma variável de ambiente como número sem convertê-la. `process.env.PUERTO` pode estar ausente e, mesmo quando existe, continua sendo texto. Se uma função precisa de um `number`, o TypeScript não deve aceitar `string | undefined` como substituto. A correção é escolher uma política: usar um valor padrão para a ausência, rejeitar a inicialização ou converter e validar o texto. Nenhuma dessas decisões se expressa com uma asserção de tipo.

Os erros de JSON têm outra forma porque ocorrem durante a execução. `JSON.parse` lança `SyntaxError` se o arquivo contém uma vírgula a mais, falta uma aspa ou não tem sintaxe JSON válida. Capture esse erro perto da leitura do arquivo e converta-o em uma mensagem de configuração. Não o confunda com um objeto de formato incorreto: um arquivo pode passar pelo `JSON.parse` e ainda falhar depois em `leerServicios`.

## O que se faz errado

- **Usar `as Servicio` sobre um JSON.** A asserção não inspeciona nenhum valor. Pode silenciar o compilador e adiar a falha até uma operação remota ou uma parte do painel que já não tem contexto sobre o arquivo original.

- **Declarar o resultado externo como `any`.** `any` permite que propriedades, chamadas e conversões avancem sem evidência. Em uma fronteira, essa comodidade elimina justamente a verificação de que o programa precisa. Receba `unknown` e reduza o tipo com regras observáveis.

- **Validar apenas com `typeof valor === "object"`.** `null` e os arrays obrigam a tratar casos diferentes. Um objeto também não garante as propriedades exigidas nem seus tipos; é apenas o primeiro passo de uma validação de estrutura.

- **Aceitar números inválidos porque `typeof valor === "number"`.** `NaN`, infinito, frações e valores negativos são números para o JavaScript. As regras de domínio devem decidir qual subconjunto representa um limite, uma porta ou uma duração válida.

- **Converter com `parseInt` e aceitar o resultado sem revisar o texto completo.** `parseInt("3000ms", 10)` aceita um prefixo numérico e descarta o resto. Para configuração, é preferível rejeitar o valor e pedir uma correção explícita.

- **Usar valores padrão para esconder uma variável presente mas mal escrita.** Se `PUERTO=abc`, iniciar silenciosamente em outra porta cria uma diferença entre a intenção e o processo real. O padrão é para a ausência deliberada, não para substituir erros.

- **Repetir a definição estática e o validador sem uma relação clara.** Duas listas de campos podem se separar quando o contrato muda. Um esquema que derive o tipo, ou testes que comparem ambas as regras, mantém visível a obrigação de atualizá-las juntas.

- **Mostrar segredos em erros de configuração.** Indicar o nome de uma variável ausente pode ser útil; imprimir seu conteúdo pode expor credenciais em terminais, logs ou respostas HTTP. Projete as mensagens para corrigir sem revelar informação sensível.

## Exercícios

### Exercício 1 — Um leitor de URL

Escreva `leerUrl(valor: unknown): Resultado<string>`. Deve aceitar somente texto não vazio que possa ser convertido com `new URL(valor)`. Se o texto não for uma URL válida, deve devolver `ok: false` com um detalhe legível. Teste com `https://catalogo.example` e com `no-es-url`.

### Exercício 2 — Lista com nomes únicos

Parta de `leerServicios` da figura 06_03. Depois de validar cada entrada individual, use um `Set<string>` para rejeitar nomes duplicados. O erro deve mencionar o nome repetido. Teste uma lista com duas entradas chamadas `pagos` e confirme que nenhuma lista parcial é entregue ao código de revisão.

### Exercício 3 — Configuração de inicialização

Defina um tipo `ConfiguracionServidor` com `puerto` e `maxServicios`, ambos números inteiros positivos. Escreva `leerConfiguracion(entorno: Record<string, string | undefined>): Resultado<ConfiguracionServidor>`. Use `3000` como padrão para a porta e `20` para o máximo de serviços. Uma variável presente com conteúdo inválido deve produzir um erro, e não ativar o padrão.

### Exercício 4 — Esquema de resposta disponível

Use o padrão `Esquema<T>` e `Inferir` para criar um esquema de uma resposta com `codigoHttp` inteiro positivo e `duracionMs` inteiro não negativo. Derive seu tipo de saída e escreva uma função que receba esse tipo e produza `HTTP 200 en 42 ms`. Explique por que essa função não deve receber diretamente o resultado de `JSON.parse`.

## Soluções

### Solução 1

A função primeiro confirma que recebeu texto e depois delega a sintaxe a `URL`. O construtor pode lançar um erro; por isso, o erro é capturado apenas para converter uma entrada inválida no resultado esperado da validação.

```ts
function leerUrl(valor: unknown): Resultado<string> {
  if (typeof valor !== "string" || valor.trim() === "") {
    return { ok: false, detalle: "url debe ser texto no vacío" };
  }

  try {
    new URL(valor);
    return { ok: true, valor };
  } catch {
    return { ok: false, detalle: "url no tiene un formato válido" };
  }
}
```

Não é necessário que essa função consulte a rede. Uma URL bem formada pode apontar para um destino que não existe; essa é uma falha da revisão assíncrona, não da configuração.

### Solução 2

Os nomes são verificados depois que cada objeto individual produziu um `Servicio`. Assim `servicio.nombre` já é uma string confiável e você não precisa misturar a validação de tipos com a regra de unicidade.

```ts
function sinDuplicados(
  servicios: readonly Servicio[],
): Resultado<readonly Servicio[]> {
  const nombres = new Set<string>();

  for (const servicio of servicios) {
    if (nombres.has(servicio.nombre)) {
      return {
        ok: false,
        detalle: `nombre duplicado: ${servicio.nombre}`,
      };
    }

    nombres.add(servicio.nombre);
  }

  return { ok: true, valor: servicios };
}
```

O carregamento completo pode chamar primeiro `leerServicios` e, se tiver sucesso, passar `resultado.valor` para `sinDuplicados`. Se qualquer um falhar, nenhuma consulta é iniciada.

### Solução 3

A configuração reúne decisões de inicialização que não pertencem a um serviço individual. Cada conversão conserva o nome da variável no detalhe para facilitar a correção.

```ts
type ConfiguracionServidor = {
  puerto: number;
  maxServicios: number;
};

function leerConfiguracion(
  entorno: Record<string, string | undefined>,
): Resultado<ConfiguracionServidor> {
  const puerto = leerEnteroPositivo(
    "PUERTO",
    entorno.PUERTO,
    3000,
  );

  if (!puerto.ok) {
    return puerto;
  }

  const maxServicios = leerEnteroPositivo(
    "REVISOR_MAX_SERVICIOS",
    entorno.REVISOR_MAX_SERVICIOS,
    20,
  );

  if (!maxServicios.ok) {
    return maxServicios;
  }

  return {
    ok: true,
    valor: {
      puerto: puerto.valor,
      maxServicios: maxServicios.valor,
    },
  };
}
```

O valor padrão se aplica apenas no ramo `valor === undefined`. Uma string vazia ou um número negativo percorrem o ramo de erro e obrigam a corrigir o ambiente.

### Solução 4

O tipo derivado só existe depois de validar o objeto. A função de apresentação recebe uma resposta já confiável e não precisa repetir verificações de `unknown`.

```ts
const respuestaDisponible = objeto({
  codigoHttp: enteroPositivo,
  duracionMs: {
    leer(valor: unknown): Resultado<number> {
      if (
        typeof valor === "number" &&
        Number.isSafeInteger(valor) &&
        valor >= 0
      ) {
        return { ok: true, valor };
      }

      return { ok: false, detalle: "debe ser entero no negativo" };
    },
  },
});

type RespuestaDisponible = Inferir<typeof respuestaDisponible>;

function lineaRespuesta(respuesta: RespuestaDisponible): string {
  return `HTTP ${respuesta.codigoHttp} en ${respuesta.duracionMs} ms`;
}
```

`JSON.parse` deve passar primeiro por `respuestaDisponible.leer`. Sem essa validação, o tipo derivado seria apenas uma promessa estática sobre um valor que pode ter outra forma durante a execução.

## Como sei que consegui

- [ ] `npx tsc --version` imprime `Version 7.0.2`.
- [ ] Ao compilar e executar `fig06_01.ts`, aparecem `string` e `rápido`, demonstrando que uma asserção não transforma o JSON.
- [ ] Ao compilar e executar `fig06_02.ts`, aparece um serviço válido e depois o detalhe de que `timeoutMs` deve ser um inteiro positivo.
- [ ] Ao compilar e executar `fig06_03.ts`, aparece exatamente `configuración: 2 servicios`.
- [ ] Ao compilar e executar `fig06_04.ts`, aparecem a porta `8080` e um erro para `REVISOR_MAX_SERVICIOS`.
- [ ] Ao compilar e executar `fig06_07.ts`, aparece `catálogo: 1500 ms`; trocar `timeoutMs` por texto impede a compilação, porque o tipo foi derivado dos esquemas.
- [ ] Ao compilar `fig06_06.ts`, aparece o TS18046 na linha que tenta ler `nombre` a partir de `unknown`.
- [ ] Em `fig06_03.ts`, com `figuras/package.json` configurado como módulo ESM, a compilação e a execução terminam com `configuración: 2 servicios`.

## Para ler mais

- [TypeScript Handbook: Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) — documentação oficial sobre guardas de tipo e redução de `unknown`; consultado em 2 de outubro de 2026.
- [TypeScript Handbook: Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html) — documentação oficial sobre tipos condicionais e inferência com `infer`; consultado em 2 de outubro de 2026.
- [Node.js: `process.env`](https://nodejs.org/api/process.html#processenv) — documentação oficial sobre variáveis de ambiente no Node; consultado em 2 de outubro de 2026.
- [MDN: `JSON.parse()`](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse) — referência de JavaScript sobre a análise de texto JSON e seus erros de sintaxe; consultado em 2 de outubro de 2026.
