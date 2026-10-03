# Lição 5 — Assincronia: que revise tudo ao mesmo tempo

**Tempo:** 2 × 45 min

**O que você constrói:** o `revisor` concorrente

**O que você aprende:** *event loop*, promises, `async/await`, `Promise.all` vs `allSettled`, `AbortController` e tempos limite

## Ao terminar, você vai conseguir

- Explicar a ordem de execução entre código síncrono, microtarefas de promises e tarefas como temporizadores.
- Escrever uma função `async` cujo contrato de saída seja `Promise<Estado>`.
- Executar consultas de vários serviços de forma concorrente e conservar no relatório a ordem da configuração.
- Escolher entre `Promise.all` e `Promise.allSettled` conforme a política de falhas do relatório.
- Aplicar um tempo limite com `AbortController`, propagar seu sinal e diferenciar um cancelamento de outra falha.
- Corrigir o TS2322 ao transformar os resultados de `Promise.allSettled` em estados do domínio.

## O porquê antes do como

Até a lição anterior, o `revisor` já sabe o que é um `Servicio` e como representar um `Estado`: um resultado disponível traz o código HTTP e a duração; uma falha traz um detalhe. No entanto, as funções que escrevemos até agora poderiam consultar cada serviço um depois do outro. Essa ordem é fácil de imaginar, mas é uma decisão cara quando a operação principal consiste em esperar uma resposta de rede.

Suponha que existam três serviços: catálogo, pagos e inventário. Se cada consulta leva aproximadamente um segundo e você as faz em série, o relatório termina aproximadamente três segundos depois. Enquanto o programa espera o catálogo, ele não precisa ocupar a CPU para continuar esperando. Mesmo assim, uma implementação sequencial decide não iniciar pagos até que o catálogo termine, e não iniciar inventário até que pagos termine. A espera se acumula embora as três consultas sejam independentes.

A concorrência aproveita justamente essa independência. O `revisor` pode iniciar as três consultas, deixar que o Node atenda outros eventos enquanto as respostas chegam e reunir os resultados no final. Isso não significa que o programa execute três instruções de JavaScript simultaneamente na mesma thread. Significa que ele pode ter várias operações pendentes, normalmente de entrada e saída, sem ficar bloqueado esperando uma por uma. Se a consulta mais lenta leva um segundo, o relatório concorrente leva perto desse segundo, mais o pequeno trabalho de organizar os resultados.

Essa diferença se parece com a concorrência do Go, mas a ferramenta mental não é a mesma. Em Go você pode lançar goroutines e coordená-las com canais, grupos de espera e contextos. No Node, o código JavaScript comum de um processo roda principalmente em uma thread, e o sistema de execução coordena as operações assíncronas por meio do *event loop*, de promises e de filas de trabalho. Você não precisa administrar threads para a maioria das consultas HTTP; precisa expressar o que acontece quando uma operação termina, falha ou é cancelada.

A palavra “concorrente” também não significa “sem limite”. Iniciar tudo ao mesmo tempo pode ser correto para uma lista pequena de serviços independentes, mas seria irresponsável usá-lo sem pensar diante de milhares de destinos, de um banco de dados com poucas conexões ou de um provedor que impõe limites de requisições. Nesta lição o conjunto é a lista controlada do `revisor`. Mais adiante, quando o projeto receber configuração e atender HTTP, você poderá decidir um limite de concorrência com dados reais.

O segundo problema é mais importante que a velocidade: uma falha não deveria impedir você de conhecer as demais. Se pagos não responde, o relatório continua útil se disser que o catálogo está disponível e que o inventário esgotou o tempo limite. Um relatório de saúde normalmente não precisa da política “se uma consulta falha, descarte todos os resultados”; precisa registrar cada resultado separadamente. Essa política determina se você usará `Promise.all`, `Promise.allSettled` ou uma combinação das duas.

Por fim, esperar sem limite é outra classe de erro. Um serviço remoto pode ficar lento, uma conexão pode perder pacotes e um destino pode aceitar a conexão sem terminar sua resposta. Se o `revisor` não define um limite, uma única consulta pode deixar pendente toda a rodada. O `timeoutMs` de `Servicio`, que antes era apenas parte do modelo, passa a ser uma regra que deve afetar a execução. `AbortController` é o mecanismo padrão para comunicar: “esta operação não deve mais continuar”.

O objetivo da lição não é decorar a palavra `await`. É projetar um contrato de revisão que possa terminar de três maneiras claras: disponível, falha normal ou falha por tempo limite. Quando essa decisão aparece no tipo e na função que coordena as promises, o relatório continua completo mesmo quando uma parte do sistema está em apuros.

## Os conceitos

### O *event loop*: terminar uma instrução antes de atender a próxima coisa pendente

O JavaScript executa primeiro o código síncrono que tem à frente. Se uma função chama `console.log`, a impressão acontece antes de o programa continuar com a linha seguinte. Quando o código inicia uma operação assíncrona, como um temporizador, uma leitura de arquivo ou uma consulta de rede, ele registra uma continuação para depois e permite que a thread continue trabalhando. Não fica girando nem bloqueia o processo perguntando repetidamente se a resposta já chegou.

O *event loop* é o mecanismo que coordena essas continuações. Quando a pilha de chamadas fica livre, o Node pode pegar trabalho de suas filas e executar o próximo bloco de JavaScript. As promises resolvidas agendam microtarefas; os temporizadores agendam tarefas posteriores. A consequência visível é que uma microtarefa pendente é atendida antes de um temporizador já pronto, mesmo que o temporizador tenha sido registrado antes.

```ts
// fig05_01.ts
console.log("inicio síncrono");

setTimeout(() => {
  console.log("tarea de temporizador");
}, 0);

Promise.resolve().then(() => {
  console.log("microtarea de promesa");
});

console.log("fin síncrono");
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig05_01.ts
$ node fig05_01.js
inicio síncrono
fin síncrono
microtarea de promesa
tarea de temporizador
```

O `0` do temporizador não quer dizer “execute agora”. Quer dizer “não execute antes de terminar pelo menos esta volta do trabalho atual”. Por isso `fin síncrono` aparece antes. A continuação de `Promise.resolve().then(...)` também não é executada dentro da mesma linha que a criou: fica pendente como microtarefa e é atendida depois do código síncrono, antes de passar para a tarefa do temporizador.

Não transforme essa ordem em uma fórmula para controlar o programa com precisão de relógio. A ordem entre microtarefas e tarefas é, sim, uma regra útil; a duração concreta de uma consulta de rede, de um temporizador ou de uma operação do sistema operacional não é. Um programa correto não depende de uma resposta chegar “em menos de dez milissegundos” no seu computador. Depende de reagir corretamente quando a resposta chegar, falhar ou for cancelada.

Dentro do `revisor`, uma consulta HTTP inicia um trabalho que continuará fora do código JavaScript imediato. Quando a função chama `fetch`, ela não obtém o corpo da resposta de forma síncrona. Obtém uma promise e permite que o processo continue iniciando outras consultas. Quando uma resposta está pronta, a continuação associada a essa promise entra no trabalho pendente que o *event loop* poderá atender.

Isso explica uma diferença importante em relação a uma função comum. Uma função síncrona devolve um valor pronto, como `string` ou `Estado`. Uma função que precisa esperar uma rede devolve uma promise desse valor. O trabalho não está completo ao retornar da chamada; está representado por um objeto que promete um resultado futuro.

### Promises e `async`/`await`: tornar visível que um resultado vai chegar depois

Uma `Promise<T>` representa uma operação que eventualmente termina com um valor do tipo `T` ou termina rejeitada com um motivo. A promise não garante que tudo deu certo: garante que haverá um desfecho. Uma promise pode estar pendente, cumprida ou rejeitada. Se está cumprida, contém o valor esperado; se está rejeitada, expressa que a operação não conseguiu produzi-lo.

A palavra `async` muda o contrato de uma função. Se uma função está marcada como `async`, ela sempre devolve uma promise, mesmo quando dentro você escreve `return "listo"`. Nesse caso seu tipo é `Promise<string>`, não `string`. `await` espera o desfecho de uma promise dentro de uma função `async`; se ela é cumprida, produz seu valor. Se é rejeitada, `await` lança esse motivo como uma exceção naquele ponto.

As figuras 05_02 a 05_07 usam `await` no nível superior. Execute-as dentro da pasta `figuras/` que você criou na lição 1, cujo `package.json` contém `{ "type": "module" }`; assim o `--module nodenext` as trata como módulos ESM. Sem essa configuração, o TypeScript rejeita o `await` de nível superior.

```ts
// fig05_02.ts
async function obtenerEtiqueta(): Promise<string> {
  const nombre = await Promise.resolve("catálogo");
  return `revisando ${nombre}`;
}

const etiqueta = await obtenerEtiqueta();
console.log(etiqueta);
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig05_02.ts
$ node fig05_02.js
revisando catálogo
```

O `await` não transforma uma operação assíncrona em síncrona. Ele apenas permite escrever a continuação de uma forma parecida com código sequencial. Enquanto `obtenerEtiqueta` espera a promise, a função fica suspensa; ela não detém o *event loop* nem impede que outras operações pendentes avancem. Quando a promise é cumprida, a função retoma sua execução e resolve a própria promise com a string final.

Uma confusão comum é pensar que `await` deve ser usado em toda chamada a uma função assíncrona. Ele deve ser usado quando você precisa do valor antes de continuar naquele ramo. Se você quer primeiro iniciar várias consultas e depois esperar por todas, colocar `await` dentro de cada volta de um laço as torna sequenciais. A posição do `await` descreve uma dependência: se a operação seguinte depende do resultado anterior, espere; se não depende, inicie-a e coordene-a depois.

Dentro do `revisor`, o contrato natural de uma revisão individual é `Promise<Estado>`. A função não pode devolver um `Estado` pronto imediatamente porque ainda não sabe se o serviço vai responder. Em vez disso, ela promete entregar um estado quando a consulta terminar ou quando converter uma falha em um resultado do domínio.

```ts
// fig05_03.ts
interface Servicio {
  readonly nombre: string;
}

type Estado = {
  servicio: Servicio;
  tipo: "disponible";
};

async function revisarUno(servicio: Servicio): Promise<Estado> {
  await Promise.resolve();
  return {
    servicio,
    tipo: "disponible",
  };
}

const estado = await revisarUno({ nombre: "catálogo" });
console.log(`${estado.servicio.nombre}: ${estado.tipo}`);
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig05_03.ts
$ node fig05_03.js
catálogo: disponible
```

A anotação `Promise<Estado>` importa porque documenta a fronteira temporal da função. Quem chama `revisarUno` sabe que não pode ler `estado.tipo` diretamente da chamada. Precisa usar `await`, `then` ou entregar a promise a um coordenador. O TypeScript não sabe quanto tempo uma rede vai levar, mas pode impedir que você confunda uma promise pendente com o estado que ela produzirá.

Em Go, uma função que consulta um serviço pode devolver um valor e um `error` depois que a goroutine ou a função termina. No TypeScript, uma função assíncrona expressa essa espera dentro de `Promise`. As duas opções obrigam a modelar a falha; a diferença é que no TypeScript o resultado futuro é parte explícita do tipo de retorno.

### `Promise.all`: iniciar tudo e esperar o conjunto

`Promise.all` recebe um iterável de promises e devolve uma nova promise. Ela é cumprida quando todas as promises são cumpridas, com um array de valores na mesma ordem da entrada. Isso último é útil para o `revisor`: as respostas podem terminar em qualquer ordem, mas o relatório pode conservar a ordem em que a pessoa configurou os serviços.

Se uma das promises é rejeitada, `Promise.all` é rejeitada assim que conhece essa rejeição. As demais operações não são canceladas automaticamente; podem continuar trabalhando. O que muda é o resultado da promise coordenadora: já não haverá um array completo de valores. Essa política é apropriada quando cada parte é indispensável, por exemplo ao carregar três arquivos necessários para montar uma única configuração válida.

```ts
// fig05_04.ts
async function consultar(nombre: string): Promise<string> {
  return Promise.resolve(`${nombre}: disponible`);
}

const servicios = ["catálogo", "pagos", "inventario"];
const resultados = await Promise.all(servicios.map(consultar));

for (const resultado of resultados) {
  console.log(resultado);
}
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig05_04.ts
$ node fig05_04.js
catálogo: disponible
pagos: disponible
inventario: disponible
```

O `map(consultar)` chama `consultar` uma vez para cada nome sem esperar dentro da volta. O resultado é um array de promises, e `Promise.all` espera o conjunto. Se você escrever isto:

```ts
for (const servicio of servicios) {
  const resultado = await consultar(servicio);
  console.log(resultado);
}
```

as consultas aconteceriam uma por uma. Nem sempre isso é incorreto: seria adequado se a segunda consulta precisasse de um identificador obtido pela primeira. Mas, para serviços independentes, seria uma espera acumulada sem benefício.

Dentro do `revisor`, `Promise.all` pode, sim, ser a ferramenta correta, mesmo que cada serviço possa falhar. A chave é converter cada falha individual em um valor `EstadoFalla` dentro de `revisarUno`. Então a promise individual não é rejeitada por uma falha prevista: é cumprida com um estado que descreve essa falha. O coordenador pode usar `Promise.all` porque todos os caminhos normais produzem um elemento do relatório.

Essa separação esclarece responsabilidades. `revisarUno` decide como traduzir uma exceção de rede, um cancelamento ou uma resposta inválida para `EstadoFalla`. `revisarTodos` apenas coordena uma coleção de `Promise<Estado>`. O relatório recebe sempre uma lista de estados e não precisa conhecer exceções técnicas de cada serviço.

### `Promise.allSettled`: conservar cada desfecho antes de decidir o que significa

`Promise.allSettled` também espera o conjunto completo, mas não é rejeitada se uma promise individual falha. Devolve um array de objetos discriminados. Cada objeto tem `status: "fulfilled"` e `value`, ou `status: "rejected"` e `reason`. É uma ferramenta útil quando a coordenação precisa observar todos os desfechos técnicos, mesmo que algumas operações não tenham chegado a produzir um valor.

```ts
// fig05_05.ts
function tareas(): Promise<string>[] {
  return [
    Promise.resolve("catálogo"),
    Promise.reject(new Error("conexión rechazada")),
    Promise.resolve("inventario"),
  ];
}

try {
  await Promise.all(tareas());
} catch (error: unknown) {
  if (error instanceof Error) {
    console.log(`Promise.all: ${error.message}`);
  }
}

const resultados = await Promise.allSettled(tareas());

for (const resultado of resultados) {
  if (resultado.status === "fulfilled") {
    console.log(`${resultado.value}: disponible`);
  } else if (resultado.reason instanceof Error) {
    console.log(`pagos: falla (${resultado.reason.message})`);
  }
}
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig05_05.ts
$ node fig05_05.js
Promise.all: conexión rechazada
catálogo: disponible
pagos: falla (conexión rechazada)
inventario: disponible
```

A segunda coleção de tarefas é intencional. Uma promise já tem um desfecho; ela não “reinicia” ao ser esperada de novo. A função `tareas` cria um conjunto novo para demonstrar separadamente a política de `all` e a de `allSettled`.

Observe também o *narrowing*. O TypeScript não permite ler `resultado.value` sem verificar que `status` é `"fulfilled"`, porque os resultados rejeitados não têm essa propriedade. De forma equivalente, `reason` pertence ao caso rejeitado. É o mesmo princípio das uniões discriminadas da lição 3, aplicado a um tipo da biblioteca padrão.

`Promise.allSettled` não é automaticamente melhor. Tem um custo conceitual: agora o coordenador conhece detalhes de promises que talvez devessem ter sido convertidas antes para o vocabulário do domínio. Para o `revisor`, use-a se você realmente precisar distinguir entre “a função de revisão produziu um estado” e “a própria função teve uma falha inesperada”. Se todas as falhas esperadas já são transformadas em `EstadoFalla`, `Promise.all` torna o contrato menor e mais direto.

Em Go, uma coleção de goroutines pode enviar cada resultado por um canal, e o coordenador decide se interrompe no primeiro erro ou espera todos. `Promise.all` e `Promise.allSettled` oferecem políticas equivalentes para uma coleção de operações assíncronas. Nenhuma substitui o projeto do resultado: você precisa decidir se o erro é um dado do relatório ou uma condição que invalida toda a operação.

### `AbortController` e tempos limite: cancelar é uma decisão explícita

Um tempo limite não é uma promessa de que uma operação vai terminar rápido. É uma decisão de parar de esperá-la quando ela cruza um limite. Para aplicar essa decisão você precisa de duas peças: algo que agende o cancelamento e uma operação que escute o sinal de cancelamento. `AbortController` produz um `AbortSignal`; a função coordenadora conserva o controlador e entrega o sinal à operação.

Quando você chama `controller.abort(razon)`, `signal.aborted` passa a `true` e os consumidores do sinal recebem o evento de cancelamento. APIs como `fetch` aceitam `signal` para interromper uma requisição pendente. Suas próprias funções assíncronas também podem aceitar o sinal e rejeitar sua promise quando houver cancelamento.

```ts
// fig05_06.ts
function esperarCancelacion(signal: AbortSignal): Promise<void> {
  return new Promise((_resolver, rechazar) => {
    signal.addEventListener(
      "abort",
      () => rechazar(signal.reason),
      { once: true },
    );
  });
}

async function conLimite(): Promise<void> {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => {
    controlador.abort(new Error("tiempo límite"));
  }, 0);

  try {
    await esperarCancelacion(controlador.signal);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.log(error.message);
    }
  } finally {
    clearTimeout(temporizador);
  }
}

await conLimite();
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig05_06.ts
$ node fig05_06.js
tiempo límite
```

O `finally` não é decoração. Se a consulta termina antes do tempo limite, você precisa limpar o temporizador para que ele não cancele uma operação que já terminou nem mantenha trabalho desnecessário pendente. Do mesmo modo, não crie um único controlador para todos os serviços se cada `timeoutMs` é independente. Um cancelamento do inventário não deve abortar o catálogo por acidente.

O motivo do aborto merece virar um detalhe legível. Um `AbortSignal` comunica que algo foi cancelado, mas o relatório precisa decidir se foi por limite, por encerramento ordenado ou por um cancelamento solicitado de outra parte. Nesta lição, um cancelamento por limite é convertido em `EstadoFalla` com `detalle: "tiempo límite"`; mais adiante o modelo pode acrescentar uma variante específica se o domínio precisar diferenciá-la visualmente.

Dentro do `revisor`, o sinal atravessa o contrato da função que faz a consulta. É importante não escondê-lo dentro de uma variável global nem criá-lo em um lugar que a função de consulta não consiga observar. Quem inicia a revisão possui o controlador; quem faz o trabalho cancelável recebe o sinal.

```ts
// fig05_07.ts
interface Servicio {
  readonly nombre: string;
  readonly timeoutMs: number;
}

type EstadoDisponible = {
  servicio: Servicio;
  tipo: "disponible";
  codigoHttp: number;
  duracionMs: number;
};

type EstadoFalla = {
  servicio: Servicio;
  tipo: "falla";
  detalle: string;
};

type Estado = EstadoDisponible | EstadoFalla;

type Consultar = (
  servicio: Servicio,
  signal: AbortSignal,
) => Promise<{ codigoHttp: number; duracionMs: number }>;

function esperarAbort(signal: AbortSignal): Promise<never> {
  return new Promise((_resolver, rechazar) => {
    signal.addEventListener(
      "abort",
      () => rechazar(signal.reason),
      { once: true },
    );
  });
}

const consultarDePrueba: Consultar = async (servicio, signal) => {
  if (servicio.nombre === "catálogo") {
    return { codigoHttp: 200, duracionMs: 0 };
  }

  if (servicio.nombre === "pagos") {
    throw new Error("conexión rechazada");
  }

  return esperarAbort(signal);
};

async function revisarUno(
  servicio: Servicio,
  consultar: Consultar,
): Promise<Estado> {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => {
    controlador.abort(new Error("tiempo límite"));
  }, servicio.timeoutMs);

  try {
    const respuesta = await consultar(servicio, controlador.signal);
    return {
      servicio,
      tipo: "disponible",
      codigoHttp: respuesta.codigoHttp,
      duracionMs: respuesta.duracionMs,
    };
  } catch (error: unknown) {
    return {
      servicio,
      tipo: "falla",
      detalle: error instanceof Error ? error.message : "falla desconocida",
    };
  } finally {
    clearTimeout(temporizador);
  }
}

async function revisarTodos(
  servicios: readonly Servicio[],
  consultar: Consultar,
): Promise<Estado[]> {
  return Promise.all(
    servicios.map((servicio) => revisarUno(servicio, consultar)),
  );
}

function lineaReporte(estado: Estado): string {
  if (estado.tipo === "disponible") {
    return `${estado.servicio.nombre}: HTTP ${estado.codigoHttp}`;
  }

  return `${estado.servicio.nombre}: falla (${estado.detalle})`;
}

const estados = await revisarTodos(
  [
    { nombre: "catálogo", timeoutMs: 100 },
    { nombre: "pagos", timeoutMs: 100 },
    { nombre: "inventario", timeoutMs: 0 },
  ],
  consultarDePrueba,
);

for (const estado of estados) {
  console.log(lineaReporte(estado));
}
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig05_07.ts
$ node fig05_07.js
catálogo: HTTP 200
pagos: falla (conexión rechazada)
inventario: falla (tiempo límite)
```

O exemplo usa uma função de consulta substituível para separar a coordenação dos detalhes de transporte. Não abre conexões reais nem mede durações reais; por isso a consulta de teste devolve `duracionMs: 0` e esse dado não aparece na saída. Aqui `Servicio` é deliberadamente simplificado para `nombre` e `timeoutMs`: ainda não precisa de `url`. O contrato `Consultar` já entrega tanto `codigoHttp` quanto `duracionMs`, para que a implementação posterior possa medir uma consulta HTTP real e a lição 8 possa conectar o transporte sem mudar o contrato do relatório. A política concorrente não muda: cada serviço recebe seu próprio sinal, traduz seu desfecho para `Estado` e o coordenador espera todas as revisões.

## O erro que você vai ver

`Promise.allSettled` não devolve diretamente o tipo de valor das promises. Devolve `PromiseSettledResult<T>[]`, porque precisa representar tanto cumprimentos quanto rejeições. Se você tentar atribuí-lo a `Estado[]`, o TypeScript produz o TS2322.

```ts
// fig05_08.ts
type Estado = {
  tipo: "disponible";
};

async function revisar(): Promise<Estado[]> {
  const tareas: Promise<Estado>[] = [];
  const resultados: Estado[] = await Promise.allSettled(tareas);
  return resultados;
}
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig05_08.ts
fig05_08.ts(8,9): error TS2322: Type 'PromiseSettledResult<Estado>[]' is not assignable to type 'Estado[]'.
  Type 'PromiseSettledResult<Estado>' is not assignable to type 'Estado'.
    Property 'tipo' is missing in type 'PromiseFulfilledResult<Estado>' but required in type 'Estado'.
```

O TS2322 significa que você está tentando atribuir um tipo a outro incompatível. Com o TypeScript 7.0.2, o diagnóstico aponta primeiro que até o caso cumprido é um envoltório `PromiseFulfilledResult<Estado>` e não um `Estado`: falta diretamente `tipo`. O caso rejeitado tem, em vez disso, `status` e `reason`. A solução não é uma asserção como `as Estado[]`, porque isso apagaria a decisão que ainda falta. Você precisa percorrer os resultados, verificar `status` e converter cada caso no estado que corresponda.

```ts
const resultados = await Promise.allSettled(tareas);

return resultados.map((resultado, indice): Estado => {
  if (resultado.status === "fulfilled") {
    return resultado.value;
  }

  return {
    servicio: servicios[indice],
    tipo: "falla",
    detalle: "la revisión no terminó",
  };
});
```

Essa solução obriga a decidir qual serviço corresponde ao resultado rejeitado. Por isso convém preservar o array de `servicios` e não depender da ordem de término. Também mostra por que, quando `revisarUno` já converte suas próprias falhas em `EstadoFalla`, pode ser mais claro usar `Promise.all`: o resultado coordenado já tem o tipo final do relatório.

Outro erro frequente não tem código de TypeScript: esquecer de capturar a rejeição de uma promise. No Node, uma rejeição não tratada pode encerrar o processo ou produzir um aviso, conforme o modo de execução. Não resolva isso acrescentando um `catch(() => {})` que apaga a informação. Capture o motivo e converta-o em uma falha que o relatório possa explicar, ou lance-o de novo se ele realmente deve interromper toda a rodada.

## O que se faz errado

- **Colocar `await` dentro de um laço para operações independentes.** O código parece organizado, mas cada consulta espera a anterior. Primeiro crie o array de promises e depois use `Promise.all` ou `Promise.allSettled` para coordená-las.

- **Usar `Promise.all` esperando um relatório parcial automático.** `Promise.all` rejeita na primeira rejeição observada. As outras operações podem continuar vivas, mas seu resultado deixa de estar disponível por meio dessa promise coordenadora. Use `allSettled` ou converta a falha individual em `EstadoFalla`.

- **Usar `Promise.allSettled` por costume.** Pode esconder que uma função individual não definiu corretamente seu contrato de erro. Se toda revisão deve terminar como `Estado`, traduza o erro em `revisarUno` e use `Promise.all` para expressar que o conjunto sempre produz estados.

- **Confundir concorrência com paralelismo.** Várias requisições podem estar pendentes ao mesmo tempo sem que o JavaScript execute várias partes da sua função simultaneamente. O benefício vem de não bloquear a thread enquanto você espera entrada e saída, não de uma promessa de mais CPU.

- **Esperar com `setTimeout` para “dar tempo” a uma promise.** Um temporizador não prova que uma operação terminou nem sincroniza corretamente os resultados. Espere a promise que representa o trabalho; use um temporizador apenas como parte explícita de um tempo limite.

- **Criar um `AbortController` e não passar `signal` para a operação.** Chamar `abort()` não detém magicamente qualquer código. A operação precisa aceitar e observar o sinal, como `fetch` ou uma função própria que registra o evento `abort`.

- **Não limpar o temporizador no `finally`.** Se a operação termina cedo, o temporizador continua pendente e pode abortar depois ou manter o processo vivo. `clearTimeout` deve ser executado tanto em caso de sucesso quanto de falha.

- **Converter qualquer erro em texto com uma asserção.** No `catch`, o valor é `unknown` com `strict`. Verifique `error instanceof Error` antes de ler `message`; para outros valores, use um detalhe seguro e decidido conscientemente.

- **Medir a duração com valores inventados em produção.** O exemplo usa `0` para que sua saída seja determinística. A implementação real deve medir em volta da operação e decidir que unidade e precisão `duracionMs` terá.

## Exercícios

### Exercício 1 — Duas consultas sem espera acumulada

Escreva `consultar(nombre): Promise<string>` usando `Promise.resolve`. Receba os nomes `catálogo`, `pagos` e `inventario`, inicie as três consultas com `map` e use `Promise.all` para imprimir o resultado de cada uma na ordem da lista. Depois reescreva o programa com um `for...of` e `await` dentro do laço; explique por que essa segunda versão seria sequencial se a função fizesse uma consulta de rede real.

### Exercício 2 — Um relatório que conserva as falhas

Crie três tarefas: uma cumprida para o catálogo, uma rejeitada com `new Error("sin conexión")` para pagos e uma cumprida para o inventário. Use `Promise.allSettled` para convertê-las em um array de `Estado`. Cada resultado deve ter `tipo: "disponible"` ou `tipo: "falla"` e conservar o nome do serviço. Não use `as Estado[]`.

### Exercício 3 — Tempo limite por serviço

Defina `Consultar` como `(servicio: Servicio, signal: AbortSignal) => Promise<{ codigoHttp: number; duracionMs: number }>` e use-o em `revisarUno(servicio, consultar)`. Acrescente um `AbortController`, um temporizador baseado em `servicio.timeoutMs` e um bloco `finally` que limpe o temporizador. Escreva uma consulta de teste que seja resolvida para o catálogo e espere o sinal de aborto para o inventário. O relatório deve mostrar o catálogo disponível e o inventário com uma falha cujo detalhe seja `tiempo límite`.

### Exercício 4 — Política do coordenador

Implemente dois coordenadores para a mesma lista de serviços. O primeiro deve usar `Promise.all` sobre uma versão de `revisarUno` que sempre converte falhas previstas em `EstadoFalla`. O segundo deve usar `Promise.allSettled` sobre uma função que pode ser rejeitada. Descreva, em um parágrafo, qual você usaria para o relatório principal do `revisor` e que condição concreta faria você escolher o outro.

## Soluções

### Solução 1

A parte essencial é separar o início das operações da espera pelos seus valores. `map` produz todas as promises antes de `Promise.all` esperar o array completo.

```ts
async function consultar(nombre: string): Promise<string> {
  return Promise.resolve(`${nombre}: disponible`);
}

const nombres = ["catálogo", "pagos", "inventario"];
const resultados = await Promise.all(nombres.map(consultar));

for (const resultado of resultados) {
  console.log(resultado);
}
```

Com uma rede real, `await consultar(nombre)` dentro do laço impediria iniciar pagos enquanto o catálogo continua pendente. O resultado poderia parecer igual, mas o tempo total acumularia as esperas.

### Solução 2

A solução deve reduzir cada `PromiseSettledResult` com seu discriminante `status`. O array `servicios` conserva o serviço associado a cada posição.

```ts
const estados = resultados.map((resultado, indice): Estado => {
  const servicio = servicios[indice];

  if (resultado.status === "fulfilled") {
    return {
      servicio,
      tipo: "disponible",
      codigoHttp: resultado.value.codigoHttp,
      duracionMs: resultado.value.duracionMs,
    };
  }

  return {
    servicio,
    tipo: "falla",
    detalle:
      resultado.reason instanceof Error
        ? resultado.reason.message
        : "falla desconocida",
  };
});
```

Não existe uma conversão automática de resultado rejeitado para `EstadoFalla`. Essa tradução é uma decisão do domínio e deve ficar escrita.

### Solução 3

Cada chamada precisa do seu próprio controlador e do seu próprio temporizador. O sinal é entregue à função que pode ser cancelada; o bloco `finally` limpa o recurso temporário em qualquer caminho.

```ts
async function revisarUno(
  servicio: Servicio,
  consultar: Consultar,
): Promise<Estado> {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => {
    controlador.abort(new Error("tiempo límite"));
  }, servicio.timeoutMs);

  try {
    const respuesta = await consultar(servicio, controlador.signal);
    return {
      servicio,
      tipo: "disponible",
      codigoHttp: respuesta.codigoHttp,
      duracionMs: respuesta.duracionMs,
    };
  } catch (error: unknown) {
    return {
      servicio,
      tipo: "falla",
      detalle: error instanceof Error ? error.message : "falla desconocida",
    };
  } finally {
    clearTimeout(temporizador);
  }
}
```

A função devolve um `Estado` mesmo quando a consulta não responde. Isso permite que o coordenador do relatório use `Promise.all` sem perder os demais resultados.

### Solução 4

Para o relatório principal eu usaria `Promise.all` sobre revisões que convertem falhas previstas em `EstadoFalla`. O resultado tem um contrato uniforme: uma revisão para cada serviço configurado, na mesma ordem, sem exceções técnicas que o painel precise interpretar.

Eu usaria `Promise.allSettled` quando uma camada inferior pudesse rejeitar por motivos que ainda precisam de diagnóstico separado, por exemplo um lote de tarefas de inicialização em que preciso registrar quais nem sequer chegaram a criar um estado. Nesse caso, o coordenador deve transformar explicitamente cada rejeição antes de entregar dados ao restante do programa.

## Como sei que consegui

- [ ] `node --version` começa com `v24`.
- [ ] `npx tsc --version` imprime `Version 7.0.2`.
- [ ] Ao compilar e executar `fig05_01.ts`, as linhas aparecem nesta ordem: código síncrono inicial, código síncrono final, microtarefa de promise e tarefa de temporizador.
- [ ] Ao compilar e executar `fig05_05.ts`, aparece uma falha de pagos sem impedir que catálogo e inventário sejam impressos como disponíveis.
- [ ] Ao compilar e executar `fig05_07.ts`, a saída contém exatamente uma linha para catálogo, pagos e inventário, com a falha de tempo limite para o inventário.
- [ ] Ao compilar `fig05_08.ts`, você obtém o TS2322 na atribuição de `Promise.allSettled` a `Estado[]` e consegue explicar por que uma asserção não é uma correção.
- [ ] Você consegue apontar onde o `AbortSignal` de uma revisão é criado, onde é propagado e onde é consumido.

## Para ler mais

- [TypeScript Handbook: More on Functions](https://www.typescriptlang.org/docs/handbook/2/functions.html) — documentação oficial sobre contratos de funções e tipos de retorno; consultado em 2 de outubro de 2026.

- [Node.js: `AbortController` e `AbortSignal`](https://nodejs.org/api/globals.html#class-abortcontroller) — documentação oficial das APIs globais de cancelamento no Node; consultado em 2 de outubro de 2026.

- [MDN: `Promise.allSettled()`](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled) — referência dos resultados cumpridos e rejeitados de uma coleção de promises; consultado em 2 de outubro de 2026.

- [MDN: Modelo de execução do JavaScript](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Reference/Execution_model) — explicação do *event loop*, da pilha de chamadas e das filas de trabalho; consultado em 2 de outubro de 2026.
