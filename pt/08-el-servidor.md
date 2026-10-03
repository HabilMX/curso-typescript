# Lição 8 — O servidor

**Tempo:** 2 × 45 min

**O que você constrói:** a API HTTP do `revisor`

**O que você aprende:** servidor HTTP, rotas tipadas, JSON, configuração, log, encerramento ordenado

## Ao terminar, você vai conseguir

- Criar um servidor HTTP do Node que escute conexões, responda a uma requisição e se encerre sem deixar recursos abertos.
- Modelar as rotas conhecidas como uma união do TypeScript e responder de forma explícita aos caminhos que não existem e aos métodos que você não admite.
- Enviar respostas JSON com o código de status e o cabeçalho `content-type` corretos, e publicar um contrato que não vaze dados internos.
- Ler a variável de ambiente `PUERTO` como texto não confiável e validá-la antes de entregá-la ao servidor.
- Registrar eventos operacionais sem misturar o log com as regras de negócio nem com as respostas ao cliente.
- Encerrar o servidor de forma ordenada ao receber `SIGTERM` ou `SIGINT`, esperando as requisições que já estavam em andamento.
- Montar o `revisor` das lições anteriores em um processo que consulta destinos reais e responde `GET /api/estados`.

## O porquê antes do como

Até a lição anterior, o `revisor` já sabe fazer um trabalho útil. Tem um modelo `Servicio`, representa cada desfecho com uma união discriminada `Estado`, consulta vários destinos ao mesmo tempo com `revisarTodos`, valida sua configuração antes de usá-la e está organizado em módulos com testes. Mas tudo isso vive dentro de um processo que você inicia e lê pelo terminal. É útil para desenvolver, e tem uma limitação importante: qualquer outro programa que quisesse conhecer o relatório teria que executar o `revisor` por conta própria, interpretar texto pensado para pessoas ou importar módulos internos de um projeto alheio.

Uma API HTTP muda essa fronteira. Em vez de pedir a cada consumidor que saiba ler arquivos, disparar consultas e ordenar resultados, o processo do `revisor` conserva essa responsabilidade e oferece uma operação pública: “me dê o estado atual”. Uma **API** (interface de programação de aplicações) é justamente isso: um conjunto de operações que um programa oferece a outros programas, com um contrato que diz o que se pode pedir e o que se recebe em troca. Um painel web, o da lição 9, poderá solicitar essa informação a partir de um navegador. Um alerta, uma integração de implantação ou uma ferramenta de suporte também poderiam fazê-lo. A API não substitui a lógica que você já construiu: coloca-a atrás de uma porta com um contrato visível.

O HTTP é uma conversa simples entre dois participantes. Um cliente envia uma requisição com um método (`GET`, `POST`…), uma rota, cabeçalhos e, às vezes, um corpo. O servidor decide como atendê-la e devolve uma resposta com um código de status, cabeçalhos e um corpo. No caso mais simples, um cliente solicita `GET /salud`, o servidor responde `200` e o corpo `ok`. No caso do `revisor`, um cliente solicitará `GET /api/estados` e receberá um JSON com o resultado de revisar todos os serviços naquele momento.

A palavra “servidor” pode parecer maior do que é. Você não precisa de uma conta, de um serviço externo nem de uma biblioteca adicional para começar: o Node inclui o módulo `node:http`, que aceita conexões TCP, as converte em objetos de requisição e resposta e executa uma função para cada requisição. Um framework web pode economizar código quando um projeto tem muitas rotas, validadores e *middleware* (funções intermediárias que processam uma requisição antes ou depois do tratador final), mas convém entender primeiro o contrato básico que esse framework administra. Se você não sabe quando um cabeçalho é escrito, o que acontece com uma rota desconhecida ou como o processo é encerrado, trocar de sintaxe não elimina o problema; apenas o esconde.

Convém também distinguir duas direções de comunicação. A lição 5 deixou preparado o tipo `Consultar`, que descreve como o `revisor` pergunta por um serviço alheio; nesta lição você escreverá a primeira implementação real desse tipo, com `fetch`. E o `revisor` será, além disso, um servidor HTTP para seus próprios consumidores. Ambos os papéis usam códigos HTTP, URLs e corpos de resposta, mas suas responsabilidades são opostas. Como cliente, o `revisor` traduz respostas remotas e falhas de rede em um `Estado`. Como servidor, traduz seus `Estado` internos em uma resposta estável que outras pessoas e programas possam consumir sem conhecer suas entranhas.

O tipo do TypeScript ajuda especialmente nesta camada porque uma API reúne várias decisões pequenas que em JavaScript costumam ficar implícitas. Que rotas existem? Que forma tem a resposta de cada uma? Que configuração é válida para iniciar? Que eventos são registrados? O que acontece ao receber um sinal de encerramento? Um tipo não detém uma conexão nem protege por si só a porta de um processo, mas torna visíveis os contratos que você deve manter enquanto o programa cresce.

O servidor tampouco deve virar uma segunda aplicação que duplica tudo. A validação de arquivos continua pertencendo a `configuracion.ts`. A consulta concorrente continua pertencendo a `revisar.ts`. A apresentação para pessoas continua pertencendo a `reporte.ts`. O servidor é uma camada externa: interpreta uma requisição, chama as funções do domínio e adapta o resultado ao HTTP. Essa separação permite que uma mesma revisão alimente a API, o console e o painel sem que cada consumidor reinvente as regras de disponibilidade.

O Go oferece uma comparação útil. Com `net/http`, o Go também permite registrar uma função que atende requisições e iniciar um servidor a partir da biblioteca padrão. O Node segue uma ideia semelhante: um processo escuta, uma função recebe requisição e resposta, e o programa decide rotas, códigos e encerramento. A diferença está em como a espera é expressa. Em Go é comum que uma função de encerramento devolva um `error`; no Node muitas operações de rede se expressam com eventos ou *callbacks* que você envolve em uma promise para poder usar `await`, como fará nesta lição.

Antes de escrever rotas, adote uma ideia operacional: um servidor não é uma função que “termina e pronto”. Ele vive enquanto escuta conexões, por isso seus limites importam mais que em um programa curto. Deve ter configuração validada antes de abrir a porta, registrar os acontecimentos que ajudam a diagnosticá-lo e encerrar-se de maneira deliberada quando o sistema precisa pará-lo. Se essas decisões ficam para o final, aparecem como processos que não terminam, portas ocupadas ou registros que não explicam por que uma requisição falhou.

Esta lição conserva a estrutura que você fixou nas lições 1 e 7: a entrada única é `src/main.ts`, que o `tsc` compila para `dist/main.js`; o `rootDir` é `./src` e o `outDir` é `./dist`; e os scripts se chamam `compilar`, `verificar`, `arrancar`, `probar`, `lint` e `formato`. Nenhuma dependência nova é instalada: `node:http` e `fetch` vêm com o Node. O que muda são os arquivos de `src/`: são acrescentados `contrato.ts`, `consulta.ts`, `archivo.ts`, `bitacora.ts` e `servidor.ts`, e `main.ts` é reescrito para que, em vez de imprimir um relatório de exemplo, inicie um servidor.

## Os conceitos

### Um servidor HTTP: escutar não é responder

`createServer` constrói um objeto servidor. Esse objeto ainda não ocupa nenhuma porta nem recebe tráfego. Para começar a escutar você precisa chamar `listen`. Cada vez que chegar uma requisição, o Node invocará a função que você entregou a `createServer` com dois objetos: `IncomingMessage`, que representa a requisição, e `ServerResponse`, que representa a resposta que você vai construir.

A separação importa porque criar, escutar e responder são fases distintas. Você pode construir o servidor sem iniciá-lo para testar seu tratador. Pode escolher uma porta na configuração antes de abri-la. E pode parar o servidor depois de usá-lo. Se você junta tudo em uma chamada longa e sem nomes, fica mais difícil ver qual operação falhou: se não foi possível ler a configuração, se a porta estava ocupada ou se a rota respondeu mal.

Uma resposta HTTP mínima tem duas partes relevantes. O código de status comunica o resultado geral: `200` indica sucesso, `404` indica que o recurso solicitado não existe e `500` representa uma falha do servidor. O corpo contém o detalhe que o cliente pode ler. Os cabeçalhos indicam como interpretar esse corpo; para texto, `text/plain; charset=utf-8` declara tanto o tipo de conteúdo quanto a codificação dos caracteres.

O programa a seguir cria uma rota de saúde. Usa a porta `0`, que pede ao sistema operacional que escolha uma disponível. Isso evita depender de a porta 3000, 8080 ou outra porta fixa estar livre na sua máquina. O programa obtém a porta escolhida apenas para que seu próprio `fetch` possa fazer uma requisição; não a imprime, porque essa escolha varia entre execuções. Como usa `await` no nível superior, execute-o dentro da pasta `figuras/` que você preparou na lição 1, cujo `package.json` declara `"type": "module"`.

```ts
// fig08_01.ts
import { createServer } from "node:http";

function cerrar(servidor: ReturnType<typeof createServer>): Promise<void> {
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

const servidor = createServer((solicitud, respuesta) => {
  if (solicitud.url === "/salud") {
    respuesta.writeHead(200, {
      "content-type": "text/plain; charset=utf-8",
    });
    respuesta.end("ok");
    return;
  }

  respuesta.writeHead(404, {
    "content-type": "text/plain; charset=utf-8",
  });
  respuesta.end("no encontrado");
});

await new Promise<void>((resolve) => {
  servidor.listen(0, "127.0.0.1", resolve);
});

const direccion = servidor.address();

if (direccion === null || typeof direccion === "string") {
  throw new Error("el servidor no entregó una dirección TCP");
}

const puerto = direccion.port;
const respuesta = await fetch(`http://127.0.0.1:${puerto}/salud`);

console.log(`${respuesta.status} ${await respuesta.text()}`);

await cerrar(servidor);
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext --types node fig08_01.ts
$ node fig08_01.js
200 ok
```

O prefixo `node:` identifica módulos próprios do Node e evita confundi-los com um pacote instalado pelo projeto. Como o programa importa um módulo do Node, o comando inclui `--types node`: o TypeScript precisa dessas declarações para conhecer `createServer` e as propriedades das requisições, e o Node fornece o comportamento real ao executar o JavaScript.

`respuesta.end(...)` é decisivo. Escreve o corpo final e sinaliza que a resposta terminou. Se você esquecer de terminá-la, o cliente pode ficar esperando mesmo que o servidor já tenha calculado seu conteúdo. Também é boa prática usar `return` depois de uma resposta que encerra um ramo: não é necessário para o HTTP funcionar, mas evita que o código posterior tente escrever uma segunda resposta na mesma conexão.

Observe também como a porta é obtida. `servidor.address()` devolve `string | AddressInfo | null`: uma string se o servidor escuta em um socket Unix, um objeto com a porta se escuta em TCP e `null` se ainda não escuta. A figura descarta os dois casos que não lhe servem com uma verificação explícita e lança um erro se ocorrerem. Essa verificação faz o trabalho que uma asserção de tipo apenas fingiria: depois dela, o TypeScript sabe que `direccion` é um `AddressInfo` e que `direccion.port` existe, sem que você precise prometer nada a ele.

Dentro do `revisor`, `/salud` não precisa consultar todos os serviços nem ler o relatório completo. Sua pergunta é menor: “o processo HTTP está vivo e pode responder?”. Essa distinção é útil na operação. Se `/salud` não responde, o problema pode ser o processo, a porta ou a rede local. Se `/salud` responde mas `/api/estados` informa falhas, o processo funciona e o problema está nos serviços revisados ou em sua consulta. Não declare disponível toda a plataforma apenas porque o servidor responde `200`: uma rota de saúde verifica a vida do processo, e o relatório de estados representa o resultado de destinos externos. São perguntas diferentes e devem conservar nomes e respostas diferentes.

### Rotas tipadas: a URL externa não é uma união confiável

Uma rota recebida por HTTP chega como texto. Qualquer cliente pode pedir `/api/estados`, `/api/estado`, `/API/ESTADOS`, `/borrar-todo` ou uma rota com parâmetros inesperados. O tipo de `solicitud.url` reflete essa realidade: é `string | undefined`. Você não pode declarar que essa entrada externa já é uma das suas rotas só porque gostaria que fosse.

A operação correta tem dois passos. Primeiro você analisa o texto externo e o converte em uma representação interna. Depois, o resto do tratador trabalha com uma união limitada. É o mesmo padrão de fronteira da lição 6: de fora chega um valor amplo; depois de validar e classificar, o domínio recebe alternativas conhecidas.

A união `Ruta` não muda o que uma pessoa pode digitar na barra do navegador. Mas evita que o resto do programa trate uma rota desconhecida como se fosse válida. Se você acrescentar uma rota futura, o TypeScript pode ajudar a encontrar os pontos em que você deve decidir seu código de status, seu corpo e seu formato de resposta; no projeto final isso será feito com a guarda de exaustividade com `never` que você viu na lição 3. Nesta figura os estados estão escritos à mão dentro do arquivo para que o programa seja executável sozinho; no projeto virão de `revisarTodos`.

```ts
// fig08_02.ts
import { createServer } from "node:http";

interface Servicio {
  readonly nombre: string;
  readonly url: string;
  readonly timeoutMs: number;
}

type Estado =
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

type Ruta =
  | { readonly tipo: "salud" }
  | { readonly tipo: "estados" }
  | { readonly tipo: "no-encontrada" };

function reconocerRuta(url: string | undefined): Ruta {
  const ruta = new URL(url ?? "/", "http://revisor.local").pathname;

  if (ruta === "/salud") {
    return { tipo: "salud" };
  }

  if (ruta === "/api/estados") {
    return { tipo: "estados" };
  }

  return { tipo: "no-encontrada" };
}

function cerrar(servidor: ReturnType<typeof createServer>): Promise<void> {
  return new Promise((resolve, reject) => {
    servidor.close((error) => (error === undefined ? resolve() : reject(error)));
  });
}

const estados: readonly Estado[] = [
  {
    servicio: {
      nombre: "catálogo",
      url: "https://catalogo.example",
      timeoutMs: 1500,
    },
    tipo: "disponible",
    codigoHttp: 200,
    duracionMs: 42,
  },
  {
    servicio: {
      nombre: "pagos",
      url: "https://pagos.example",
      timeoutMs: 3000,
    },
    tipo: "falla",
    detalle: "tiempo límite",
  },
];

const servidor = createServer((solicitud, respuesta) => {
  const ruta = reconocerRuta(solicitud.url);

  if (ruta.tipo === "salud") {
    respuesta.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    respuesta.end("ok");
    return;
  }

  if (ruta.tipo === "estados") {
    respuesta.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    respuesta.end(JSON.stringify({ estados }));
    return;
  }

  respuesta.writeHead(404, { "content-type": "application/json; charset=utf-8" });
  respuesta.end(JSON.stringify({ detalle: "ruta no encontrada" }));
});

await new Promise<void>((resolve) => {
  servidor.listen(0, "127.0.0.1", resolve);
});

const direccion = servidor.address();

if (direccion === null || typeof direccion === "string") {
  throw new Error("el servidor no entregó una dirección TCP");
}

const puerto = direccion.port;
const estadosRespuesta = await fetch(`http://127.0.0.1:${puerto}/api/estados`);
const desconocidaRespuesta = await fetch(`http://127.0.0.1:${puerto}/api/no-existe`);

console.log(await estadosRespuesta.text());
console.log(`${desconocidaRespuesta.status} ${await desconocidaRespuesta.text()}`);

await cerrar(servidor);
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext --types node fig08_02.ts
$ node fig08_02.js
{"estados":[{"servicio":{"nombre":"catálogo","url":"https://catalogo.example","timeoutMs":1500},"tipo":"disponible","codigoHttp":200,"duracionMs":42},{"servicio":{"nombre":"pagos","url":"https://pagos.example","timeoutMs":3000},"tipo":"falla","detalle":"tiempo límite"}]}
404 {"detalle":"ruta no encontrada"}
```

`new URL` separa a rota de outros componentes de uma URL, como a query string e o fragmento. Assim, `/api/estados?orden=nombre` continua reconhecendo a mesma rota base mesmo que mais adiante você decida interpretar o parâmetro `orden`. Não compare texto com uma URL completa se só lhe interessa o `pathname`: uma query string acrescentada por um cliente mudaria o texto embora o recurso seja o mesmo. O segundo argumento de `new URL` é uma base fictícia, `http://revisor.local`, que só existe para que o construtor aceite rotas relativas como `/salud`; nunca é usada para se conectar a nada.

Observe que `Ruta` usa uma união discriminada. O campo `tipo` cumpre a mesma função que em `Estado`: permite que o TypeScript reduza o tipo dentro de cada ramo. Uma rota de saúde não precisa dos estados. Uma rota não encontrada não deve devolver por acidente a coleção interna. À medida que você acrescenta rotas, essa estrutura mantém juntas a decisão de reconhecimento e a decisão de resposta.

Um `404` não é uma exceção nem um texto opcional. É a resposta correta quando o processo existe mas não oferece o recurso solicitado. Responder `200` com uma frase que diz “não encontrado” obriga cada cliente a inventar regras para interpretar o corpo. Os códigos HTTP já comunicam essa categoria de resultado; use-os para que navegadores, ferramentas e o painel compartilhem o mesmo idioma.

A figura anterior também contém um defeito de propósito, e convém que você o veja agora. Seu JSON inclui, para cada estado, o `servicio` completo: sua `url` e seu `timeoutMs`. Isso é cômodo para quem programa, porque é exatamente o objeto que já existe em memória, e é um erro para uma API: você acabou de publicar o endereço dos seus serviços internos e cada mudança no modelo mudará a resposta sem que ninguém o tenha decidido. A próxima seção corrige isso.

### JSON e contrato público: o que sai não é o que há dentro

JSON é um formato de dados, não uma prova de que os dados estão corretos. `JSON.stringify` converte objetos do `revisor` em texto para uma resposta HTTP. Do outro lado, `respuesta.json()` converte texto JSON em um valor que o cliente deve tratar como externo até validá-lo. A diferença se parece com a da lição 6: o servidor conhece seus `Estado`; o painel da próxima lição receberá JSON e terá que decidir se a resposta cumpre o contrato que espera.

O cabeçalho `content-type: application/json; charset=utf-8` faz parte desse acordo. Muitos clientes podem adivinhar que um corpo é JSON pelo primeiro caractere, mas não deveriam precisar fazê-lo. O cabeçalho declara que formato é enviado e permite que ferramentas HTTP, navegadores e bibliotecas o tratem corretamente. Não envie JSON com `text/plain` só porque ele fica bem em um terminal.

O que importa mais é a forma. O modelo interno, `Estado`, conserva o `Servicio` completo porque `revisarTodos` precisa relacionar cada resultado com sua configuração. O contrato público é outra coisa: é o que uma pessoa ou um programa alheio precisa saber, e nada mais. Por isso o projeto cria `src/contrato.ts` com dois tipos, `EstadoPublico` e `ReportePublico`. `EstadoPublico` também é uma união discriminada por `tipo`, mas em vez de `servicio: Servicio` leva apenas o `nombre`. Não há `url`, não há `timeoutMs`. E uma função, `aReportePublico`, em `reporte.ts`, constrói cada objeto público campo por campo. Construí-lo assim, em vez de copiar o `Estado` e remover propriedades, tem uma vantagem que se aprecia com o tempo: se amanhã `Servicio` ganhar um token, uma conta ou uma política de novas tentativas, a API não o publica por acidente, porque a resposta só contém o que alguém escreveu ali de propósito.

O mesmo arquivo leva uma terceira peça, `esReportePublico(valor: unknown): valor is ReportePublico`, que verifica em tempo de execução que um valor desconhecido tem essa forma. Parece que sobra no servidor, que é quem produz o JSON. Não sobra, por duas razões. Primeiro, os testes desta lição a usam para ler a resposta da API sem aceitar às cegas o que `respuesta.json()` devolve. Segundo, o painel da lição 9 consome exatamente este contrato a partir do navegador, e ali sim é uma fronteira de rede: o arquivo `contrato.ts` não importa nada do Node, de modo que pode viajar tal qual para o navegador junto com o painel. É o primeiro tipo compartilhado entre o servidor e a tela, e compartilha as duas coisas que devem viajar juntas: a forma e a maneira de verificá-la.

Também evita publicar detalhes que não fazem parte do contrato. O JSON de `/api/estados` pode incluir `nombre`, `tipo`, código, duração ou detalhe porque são dados úteis do relatório. Não deve devolver variáveis de ambiente, caminhos de arquivos locais, cabeçalhos de requisições nem mensagens técnicas cruas por comodidade. Uma API pública conserva dados mínimos, deliberados e documentados. Essa regra se estende ao `detalle` de uma falha: esse texto chega ao cliente, por isso o projeto o constrói com um vocabulário curto e controlado (“tiempo límite agotado”, “conexión rechazada”, “HTTP 503”) em vez de reenviar a mensagem original de uma exceção de rede, que poderia revelar endereços ou caminhos.

### Configuração: a porta é texto, não um número

A configuração segue o mesmo princípio de fronteira. `process.env.PUERTO` vem do ambiente e não é um número seguro: o Node entrega sempre uma string, mesmo que quem faz a implantação tenha escrito `PUERTO=8080`. Pode estar ausente, ter espaços, conter `ochenta`, ser `0`, ser decimal ou superar a faixa válida de portas. Convertê-lo com `Number(...)` sem revisar o resultado empurra o problema até `listen`, onde a mensagem depende do sistema operacional e é menos clara para quem configurou o processo.

A lição 6 já lhe deu a ferramenta: `leerEnteroPositivo(nombre, valor, predeterminado)`, que verifica o formato com uma expressão regular antes de converter, usa o padrão apenas quando a variável está ausente e rejeita um valor presente porém inválido. Aqui ela é acrescentada a `configuracion.ts`, tal qual, e sobre ela se constrói `leerPuerto`, que adiciona a regra própria das portas: não podem passar de 65535. A figura seguinte reúne as duas funções e as testa com cinco entradas, incluindo a ausência da variável.

```ts
// fig08_03.ts
type Resultado<T> = { ok: true; valor: T } | { ok: false; detalle: string };

function leerEnteroPositivo(
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

function leerPuerto(valor: string | undefined): Resultado<number> {
  const puerto = leerEnteroPositivo("PUERTO", valor, 3000);

  if (puerto.ok && puerto.valor > 65535) {
    return { ok: false, detalle: "PUERTO debe estar entre 1 y 65535" };
  }

  return puerto;
}

const entradas: readonly (string | undefined)[] = [undefined, "8080", "65536", "0", "hola"];

for (const entrada of entradas) {
  const resultado = leerPuerto(entrada);
  const texto = resultado.ok ? `puerto ${resultado.valor}` : `rechazado: ${resultado.detalle}`;
  console.log(`PUERTO=${entrada} -> ${texto}`);
}
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext --types node fig08_03.ts
$ node fig08_03.js
PUERTO=undefined -> puerto 3000
PUERTO=8080 -> puerto 8080
PUERTO=65536 -> rechazado: PUERTO debe estar entre 1 y 65535
PUERTO=0 -> rechazado: PUERTO debe ser un entero positivo
PUERTO=hola -> rechazado: PUERTO debe ser un entero positivo
```

A porta `0`, que em `fig08_01` era útil porque pedia ao sistema operacional uma porta livre, aqui é rejeitada: é uma ferramenta de testes, não uma configuração, porque um serviço publicado precisa de uma porta previsível onde seus clientes possam encontrá-lo. O valor padrão `3000` é uma decisão explícita do projeto, não uma propriedade especial do Node. É válido escolher outro valor ou exigir que `PUERTO` exista, desde que o programa o comunique e o teste. O importante é não deixar que um valor ausente se converta por acidente em um comportamento desconhecido. A expressão regular `^[1-9]\d*$` rejeita espaços, sinais, zeros à esquerda e decimais antes de converter; depois, `Number.isSafeInteger` confirma que a conversão produziu um inteiro representável com segurança, e a faixa de portas completa o contrato. Validar em camadas pode parecer repetitivo diante de um simples `parseInt`, mas evita aceitar casos ambíguos como `3000texto`, que o `parseInt` converteria parcialmente em `3000`.

Dentro do `revisor`, a configuração do servidor não se mistura com a configuração dos serviços. A lista validada de `Servicio` responde que destinos são revisados e com que `timeoutMs`; vive em um arquivo, `servicios.json`, e é lida com `leerServicios` da lição 6. A porta responde onde a API escuta; vive em uma variável de ambiente. Manter os dois conceitos separados permite mudar a porta sem tocar o contrato de cada destino e permite reutilizar a lógica de revisão a partir de um teste sem abrir uma conexão TCP. E uma regra que você já conhece da lição 6 continua vigente: se algo está ausente ou é inválido, o programa informa que variável falhou sem imprimir o resto do ambiente, que poderia conter segredos.

### Log e encerramento ordenado: operar também é parte do programa

Um log registra fatos que ajudam a responder perguntas operacionais: o processo iniciou?, que requisição chegou?, que código foi respondido e quanto tempo levou?, quando começou a se encerrar?, terminou de se encerrar? Não substitui a resposta HTTP. A resposta é para o cliente que fez uma requisição; o log é para quem opera o sistema e diagnostica problemas depois, e por isso nunca deve se misturar com o que é respondido ao cliente.

As mensagens devem ter estrutura e propósito. Um texto como `algo pasó` não permite filtrar nem comparar eventos. Um registro com `evento` e `detalle`, escrito como uma linha de JSON, conserva uma categoria estável e uma descrição humana, e qualquer ferramenta de análise de logs sabe lê-lo. Em um serviço maior você acrescentaria nível, identificador de requisição e mais campos. E não use o log para copiar segredos, corpos completos de requisições ou tokens de autorização: um arquivo de log costuma circular mais do que você imagina. Por essa razão o projeto registra o `pathname` de cada requisição e não a URL completa, porque a query string (`?token=…`) é justamente onde as pessoas colocam, sem pensar, o que não deveria ficar escrito.

O encerramento merece a mesma atenção que a inicialização. Chamar `servidor.close(...)` interrompe a aceitação de novas conexões e avisa, por meio de seu *callback*, quando o servidor terminou de se encerrar, ou seja, quando já não resta nenhuma conexão ativa. Não significa que uma requisição em andamento desapareça naquele instante: o encerramento ordenado permite terminar o que já estava em curso. Se o processo sai sem esperar esse aviso, você pode cortar uma resposta pela metade ou perder o último registro.

Em produção, quem detém seu processo quase nunca é uma pessoa digitando um comando: é um supervisor (systemd, um orquestrador de contêineres, o pressionar de `Ctrl+C` no seu terminal) que envia um **sinal** ao processo. `SIGTERM` significa “termine quando puder” e `SIGINT` é o que o `Ctrl+C` envia. Se você não escuta o sinal, o Node termina imediatamente, sem fechar nada. Se escuta, você decide o que fazer antes de sair.

A figura seguinte demonstra a sequência completa com um caso que a torna visível. O servidor responde de forma lenta, aos 100 ms. O programa dispara uma requisição, espera que o servidor a receba e então envia a si mesmo `SIGTERM` com `process.kill(process.pid, "SIGTERM")`. Repare na ordem dos registros: o encerramento começa enquanto a requisição segue em andamento, o cliente mesmo assim recebe sua resposta completa, e só depois é escrito `cerrado`.

```ts
// fig08_04.ts
import { createServer, type Server } from "node:http";

function registrar(evento: string, detalle: string): void {
  console.log(JSON.stringify({ evento, detalle }));
}

function cerrar(servidor: Server): Promise<void> {
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

let llegoLaSolicitud: () => void = () => {};
const solicitudRecibida = new Promise<void>((resolve) => {
  llegoLaSolicitud = resolve;
});

const servidor = createServer((_solicitud, respuesta) => {
  registrar("solicitud", "llegó; responderá en 100 ms");
  llegoLaSolicitud();

  setTimeout(() => {
    respuesta.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    respuesta.end("terminé");
  }, 100);
});

let cierre: Promise<void> | undefined;

function detener(senal: string): void {
  cierre ??= (async () => {
    registrar("cierre", `${senal} recibida: no se aceptan conexiones nuevas`);
    await cerrar(servidor);
    registrar("cerrado", "ya no queda ninguna solicitud en curso");
  })();
}

process.once("SIGTERM", () => detener("SIGTERM"));

await new Promise<void>((resolve) => {
  servidor.listen(0, "127.0.0.1", resolve);
});

const direccion = servidor.address();

if (direccion === null || typeof direccion === "string") {
  throw new Error("el servidor no escucha en un puerto TCP");
}

const pendiente = fetch(`http://127.0.0.1:${direccion.port}/lento`).then((respuesta) =>
  respuesta.text(),
);

await solicitudRecibida;
process.kill(process.pid, "SIGTERM");

registrar("cliente", `recibió «${await pendiente}»`);
await cierre;
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext --types node fig08_04.ts
$ node fig08_04.js
{"evento":"solicitud","detalle":"llegó; responderá en 100 ms"}
{"evento":"cierre","detalle":"SIGTERM recibida: no se aceptan conexiones nuevas"}
{"evento":"cliente","detalle":"recibió «terminé»"}
{"evento":"cerrado","detalle":"ya no queda ninguna solicitud en curso"}
```

A ordem dos registros mostra uma propriedade importante: `cerrado` só é escrito depois de `await cerrar(servidor)`. Registrá-lo antes seria uma afirmação falsa: o processo poderia continuar atendendo uma conexão ativa, ou até falhar ao encerrar. A pequena promise de `cerrar` adapta a API baseada em *callback* de `server.close` à forma assíncrona que você já conhece da lição 5.

A variável `cierre` merece atenção. Dois sinais diferentes podem chegar com pouca diferença, por exemplo um supervisor que envia `SIGTERM` enquanto alguém pressiona `Ctrl+C` (`SIGINT`), e cada um tentaria encerrar o mesmo servidor. O operador `??=` atribui a promise do encerramento apenas se ela ainda não existe, de modo que o segundo sinal reutiliza o encerramento em andamento em vez de iniciar outro. Além disso, o tratador não chama `process.exit()`: esse método termina o processo instantaneamente e cortaria justamente o que você acabou de demonstrar que deve ser esperado. Quando não resta nenhum trabalho pendente, o Node termina sozinho, com o código de saída que corresponder.

Uma nota sobre `process.once`: registra o tratador para um único sinal de cada tipo. Se chegasse um segundo `SIGINT` (um segundo `Ctrl+C`) depois de o primeiro tratador já ter rodado, o Node volta ao seu comportamento padrão e termina o processo imediatamente. É uma saída de emergência razoável para quem pressiona `Ctrl+C` duas vezes porque o encerramento ordenado demora demais, e também significa que, para dois sinais do mesmo tipo, a proteção do `??=` não chega a ser exercida. Se você prefere outra política, por exemplo esperar no máximo alguns segundos e depois forçar a saída, é uma decisão do projeto, não uma propriedade do Node.

Dentro do `revisor`, registre eventos de borda, não cada detalhe interno de uma função pura. `revisarTodos` pode devolver estados sem saber se serão impressos, expostos por HTTP ou mostrados em uma tela. `servidor.ts` sim sabe que atendeu `GET /api/estados`, que código respondeu e quanto tempo levou. Essa é a camada correta para o log de requisições. E um log também não é desculpa para capturar qualquer exceção e seguir como se nada tivesse acontecido: se você não consegue abrir a porta porque está ocupada, registre o problema com contexto e deixe a inicialização falhar com um código de saída diferente de zero.

### O `revisor` montado: a API chama a revisão real

Agora você junta as peças, sem transformar o servidor em dono da revisão. O modelo e `revisarTodos` conservam o contrato das lições anteriores, sem uma única linha alterada. `servidor.ts` recebe uma função que obtém o relatório e outra que registra eventos, e não sabe de onde elas vêm. `main.ts` é a única peça que conhece todas: lê a porta e o arquivo de serviços, monta a função que consulta de verdade, abre a porta e registra os tratadores de sinais. Esta figura muda de forma em relação aos exemplos isolados anteriores: os estados já não são uma lista fixa; são produzidos ao chamar `revisarTodos` a cada requisição.

**Um destino de verdade: `consulta.ts`.** É a primeira implementação real do tipo `Consultar` da lição 5. Recebe um `Servicio` e um `AbortSignal`, pede a URL do serviço com `fetch`, mede quanto demorou com `performance.now()` e devolve o código HTTP e a duração. Dois detalhes importam. Primeiro, o sinal que recebe é o que `revisarTodos` criou com `AbortSignal.timeout(servicio.timeoutMs)`: se o serviço não responde a tempo, o `fetch` é abortado sozinho, sem que `consulta.ts` precise agendar um temporizador. Segundo, depois de ler o código de status, a função cancela o corpo da resposta com `respuesta.body?.cancel()`: ao `revisor` interessa que o serviço responda, não baixar seu conteúdo, e deixar o corpo sem ler mantém a conexão ocupada.

O que muda em relação a um `fetch` ingênuo é como as falhas são traduzidas. Quando o `fetch` não consegue se conectar, lança um `TypeError` com a mensagem “fetch failed” que, por si só, não diz nada útil; o motivo real viaja em `error.cause`, e é outro `Error` com uma propriedade `code` como `ECONNREFUSED`. A função auxiliar `codigoDeRed` percorre essa cadeia com as verificações que você já conhece (`instanceof Error`, `"code" in ...`, `typeof ... === "string"`) e devolve o código ou `undefined`, sem uma única asserção. Com ele, `consultarConFetch` lança uma de três mensagens curtas: “tiempo límite agotado” se o sinal foi abortado, “conexión rechazada” se o código foi `ECONNREFUSED` e “no se pudo conectar” em qualquer outro caso. Cada `throw` leva `{ cause: error }`, que anexa o erro original ao novo: o ESLint, com sua configuração recomendada, exige exatamente isso (regra `preserve-caught-error`), e tem razão, porque assim quem depurar continua tendo a causa real a um passo, embora o cliente da API veja apenas a mensagem curta.

**O arquivo de serviços: `archivo.ts`.** É a fronteira com o disco, tal como a desenhou a lição 7: lê `servicios.json`, converte o texto em `unknown` com `JSON.parse` e entrega esse valor a `leerServicios`, que já existia. Devolve um `Resultado`, de modo que um arquivo ausente, um JSON malformado e um serviço inválido terminam no mesmo lugar: um detalhe legível, não uma exceção com um stack trace que alguém precise decifrar. Note que `JSON.parse` devolve `any`, e que ele é atribuído a uma variável declarada `unknown`: isso não precisa de nenhuma asserção, e obriga `leerServicios` a verificar o que recebe.

**O servidor: `servidor.ts`.** Sua forma é a das figuras anteriores, endurecida. `crearServidor(opciones)` devolve um `Server` sem colocá-lo para escutar. `atender` responde primeiro aos métodos: se não for `GET`, responde `405` com o cabeçalho `allow: GET`, que é a maneira padrão de dizer ao cliente o que ele pode fazer. Depois reconhece a rota com uma união e um `switch` cujo `default` usa a guarda `never` da lição 3. Em `/api/estados` primeiro espera `obtenerReporte()` e só depois escreve a resposta: se fizesse ao contrário, uma falha no meio do caminho deixaria um `200` já enviado com um corpo quebrado. Se o relatório falha, registra a causa técnica no log e responde um `500` com `{"detalle":"error interno"}`: o cliente recebe algo estável e seguro, e quem opera tem a causa. `escuchar` envolve `listen` em uma promise que é rejeitada se o servidor emite `error` (por exemplo, `EADDRINUSE`, porta ocupada); sem isso, o erro seria emitido como evento sem tratador e derrubaria o processo com um stack trace. `puertoDe` encapsula a verificação de `address()` que você viu em `fig08_01`.

Há uma linha que merece explicação: `void atender(...)` dentro do tratador de `createServer`. `atender` é uma função `async` e portanto devolve uma promise; o tratador do Node não a espera. O operador `void` declara que ignorar essa promise é intencional. É seguro porque `crearServidor` encadeia um `.catch(...)` a essa promise: se `atender` falha por qualquer razão que não previu, o erro é registrado e o cliente recebe um `500` genérico. Sem esse `.catch`, uma exceção dentro de `atender` seria uma promise rejeitada sem tratamento, e o Node encerraria o processo inteiro: um único cliente com uma requisição estranha derrubaria o serviço para todos. O destino de uma requisição é escrito pelo cliente, e nem todo destino pode ser analisado: `curl --request-target "//"` envia um para o qual `new URL` lança `TypeError: Invalid URL`. Por isso `rutaDe` captura esse erro e devolve `"?"`, um marcador que nenhuma rota real pode ter (toda rota analisada começa com `/`): cai no `404` e o log mostra que chegou algo ilegível, em vez de uma rota em branco. Um teste envia justamente essa requisição.

**O ponto de entrada: `main.ts`.** É uma composição, não um lugar de regras. Lê e valida a porta; lê e valida os serviços; monta o servidor com uma função `obtenerReporte` que chama `revisarTodos` com `consultarConFetch` e converte o resultado com `aReportePublico`; abre a porta com `escuchar`; registra `escuchando`; e conecta `SIGTERM` e `SIGINT` a um encerramento ordenado com a mesma promise compartilhada de `fig08_04`. Se algo disso falhar antes de o servidor abrir a porta, registra o evento, define `process.exitCode = 1` e retorna: o processo termina sozinho com um código de erro, sem chamar `process.exit()`. Repare na ordem: primeiro se valida e depois se abre a porta, nunca o contrário.

Os testes deixam de ser de brinquedo. `configuracion.test.ts` usa uma tabela de casos, como na lição 7, para `leerPuerto`. `contrato.test.ts` usa outra para `esReportePublico`: um relatório válido e quatro formas de errar (`null`, `estados` que não é um array, um `tipo` desconhecido e um `codigoHttp` que chega como texto). `reporte.test.ts` ganha um teste de que o relatório público não contém a URL nem o `timeoutMs`. E `servidor.test.ts` faz o que dá mais confiança, além de testar rotas, métodos, o `500` sem vazar o detalhe interno e a requisição com destino `//`, que deve receber `404` sem derrubar o processo: levanta um servidor de destino de verdade, com quatro comportamentos (`/ok` responde 200, `/caido` responde 503, uma porta fechada rejeita a conexão e `/lento` nunca responde), levanta o servidor do `revisor` com `consultarConFetch` de verdade, faz um `fetch` real a `/api/estados` e verifica cada desfecho: disponível, falha por HTTP 503, falha por conexão recusada e falha por tempo limite, esta última com um `timeoutMs` de 150 ms. Depois verifica o que não deve aparecer: nem uma única `url` no JSON. Cada teste fecha seus servidores em um bloco `finally`, para que a falha de uma asserção não deixe a porta aberta e o processo de testes pendurado.

Os arquivos novos ou modificados são estes. Os que não mudam em relação à lição 7 aparecem no final da seção, completos, para que o projeto seja reproduzível do início ao fim.

```ts
// fig08_05/src/contrato.ts
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
// fig08_05/src/bitacora.ts
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
// fig08_05/src/consulta.ts
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
// fig08_05/src/archivo.ts
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
// fig08_05/src/servidor.ts
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { Bitacora } from "./bitacora.js";
import type { ReportePublico } from "./contrato.js";

export type ObtenerReporte = () => Promise<ReportePublico>;

export interface OpcionesServidor {
  readonly obtenerReporte: ObtenerReporte;
  readonly registrar: Bitacora;
}

type Ruta =
  { readonly tipo: "salud" } | { readonly tipo: "estados" } | { readonly tipo: "no-encontrada" };

function rutaDe(url: string | undefined): string {
  try {
    return new URL(url ?? "/", "http://revisor.local").pathname;
  } catch {
    return "?";
  }
}

function reconocerRuta(url: string | undefined): Ruta {
  switch (rutaDe(url)) {
    case "/salud":
      return { tipo: "salud" };
    case "/api/estados":
      return { tipo: "estados" };
    default:
      return { tipo: "no-encontrada" };
  }
}

function enviarJson(respuesta: ServerResponse, codigo: number, cuerpo: unknown): void {
  respuesta.writeHead(codigo, { "content-type": "application/json; charset=utf-8" });
  respuesta.end(JSON.stringify(cuerpo));
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
    case "salud":
      respuesta.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
      respuesta.end("ok");
      return;
    case "estados":
      try {
        enviarJson(respuesta, 200, await opciones.obtenerReporte());
      } catch (error: unknown) {
        opciones.registrar({
          evento: "error",
          detalle: error instanceof Error ? error.message : "falla desconocida",
        });
        enviarJson(respuesta, 500, { detalle: "error interno" });
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
// fig08_05/src/main.ts
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
`configuracion.ts` conserva `leerServicios` da lição 7 e ganha três coisas: `esRegistro` agora é exportado (é usado por `contrato.ts`), e são acrescentados `leerEnteroPositivo` e `leerPuerto`. `reporte.ts` conserva `lineaReporte` e ganha `aReportePublico`.

```ts
// fig08_05/src/configuracion.ts
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
// fig08_05/src/reporte.ts
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
Os quatro testes do projeto:

```ts
// fig08_05/src/configuracion.test.ts
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
// fig08_05/src/contrato.test.ts
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
// fig08_05/src/reporte.test.ts
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
```ts
// fig08_05/src/servidor.test.ts
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
O arquivo `servicios.json` descreve os destinos que o programa revisa quando você o inicia à mão. Os três existem: o primeiro e o segundo são sites públicos (sem conexão com a internet você verá falhas “no se pudo conectar” neles, e é o esperado), e o terceiro aponta para uma porta da sua própria máquina onde ninguém escuta, para ver uma falha sem depender de ninguém.

```json fig08_05/servicios.json
[
  { "nombre": "ejemplo", "url": "https://example.com", "timeoutMs": 3000 },
  { "nombre": "node", "url": "https://nodejs.org", "timeoutMs": 3000 },
  { "nombre": "local-apagado", "url": "http://127.0.0.1:8099", "timeoutMs": 1000 }
]
```
E os arquivos que não mudam em relação à lição 7: a configuração do npm e do TypeScript, ESLint e Prettier, o modelo e o coordenador `revisarTodos`.

```json fig08_05/package.json
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
```json fig08_05/tsconfig.json
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
```js fig08_05/eslint.config.js
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(js.configs.recommended, ...tseslint.configs.recommended);
```
```json fig08_05/.prettierrc
{
  "singleQuote": false,
  "printWidth": 100
}
```
```ts
// fig08_05/src/modelo.ts
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
// fig08_05/src/revisar.ts
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
```bash
$ cd fig08_05
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

✔ leerPuerto: sin variable usa 3000 (0.638417ms)
✔ leerPuerto: un puerto válido (0.069958ms)
✔ leerPuerto: 65535 es el límite (0.187208ms)
✔ leerPuerto: 65536 se pasa del límite (0.0895ms)
✔ leerPuerto: 0 no es un puerto (0.048708ms)
✔ leerPuerto: un decimal se rechaza (0.033125ms)
✔ leerPuerto: texto se rechaza (0.044541ms)
✔ leerPuerto: la cadena vacía se rechaza (0.030416ms)
✔ esReportePublico: un reporte con las dos variantes (0.406375ms)
✔ esReportePublico: null (0.301167ms)
✔ esReportePublico: estados no es un arreglo (0.160583ms)
✔ esReportePublico: un estado con un tipo desconocido (0.798917ms)
✔ esReportePublico: codigoHttp llega como texto (0.062ms)
✔ disponible conserva código y duración (0.435ms)
✔ falla conserva detalle (0.072583ms)
✔ el reporte público no publica la URL ni el tiempo límite (0.337458ms)
✔ GET /api/estados revisa destinos reales y publica el reporte (165.446042ms)
✔ las rutas desconocidas, los métodos y los errores internos responden con su código (4.957833ms)
✔ una ruta que no se puede analizar responde 404 y no derriba el servidor (3.789583ms)
ℹ tests 19
ℹ suites 0
ℹ pass 19
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 239.299834
```

Esse bloco demonstra dois limites distintos. `npm run verificar` confirma os contratos estáticos de todos os módulos; `npm run probar` compila e depois executa uma requisição HTTP real, contra destinos reais. Nenhum `fetch` dos testes é uma simulação: o Node abre sockets locais, o cliente recebe respostas, o tempo limite de 150 ms vence de verdade e o encerramento espera que os servidores deixem de escutar.

Você ainda não viu o programa rodando. Compile-o e inicie-o na porta 3100 (se você não definir `PUERTO`, ele usará 3000). Estes blocos são uma execução de exemplo no seu terminal; as durações e as horas serão diferentes no seu.

```text
$ npm run compilar
$ PUERTO=3100 npm run arrancar
{"momento":"2026-10-02T20:54:27.333Z","evento":"escuchando","detalle":"http://127.0.0.1:3100"}
```

Em outro terminal:

```text
$ curl -i http://127.0.0.1:3100/salud
HTTP/1.1 200 OK
content-type: text/plain; charset=utf-8
Date: Fri, 02 Oct 2026 20:54:28 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked

ok
$ curl http://127.0.0.1:3100/api/estados
{"estados":[{"nombre":"ejemplo","tipo":"disponible","codigoHttp":200,"duracionMs":190},{"nombre":"node","tipo":"disponible","codigoHttp":200,"duracionMs":405},{"nombre":"local-apagado","tipo":"falla","detalle":"conexión rechazada"}]}
$ curl -i http://127.0.0.1:3100/nada
HTTP/1.1 404 Not Found
content-type: application/json; charset=utf-8
Date: Fri, 02 Oct 2026 20:54:28 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked

{"detalle":"ruta no encontrada"}
$ curl -i -X POST http://127.0.0.1:3100/api/estados
HTTP/1.1 405 Method Not Allowed
allow: GET
content-type: application/json; charset=utf-8
Date: Fri, 02 Oct 2026 20:54:28 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked

{"detalle":"método no permitido"}
```

Volte ao primeiro terminal e pressione `Ctrl+C`. O log conta toda a história, e o último par de linhas é o encerramento ordenado:

```text
{"momento":"2026-10-02T20:54:28.533Z","evento":"solicitud","detalle":"GET /salud 200 2 ms"}
{"momento":"2026-10-02T20:54:28.964Z","evento":"solicitud","detalle":"GET /api/estados 200 418 ms"}
{"momento":"2026-10-02T20:54:28.978Z","evento":"solicitud","detalle":"GET /nada 404 0 ms"}
{"momento":"2026-10-02T20:54:28.992Z","evento":"solicitud","detalle":"POST /api/estados 405 0 ms"}
{"momento":"2026-10-02T20:54:28.993Z","evento":"cierre","detalle":"SIGINT recibida"}
{"momento":"2026-10-02T20:54:28.994Z","evento":"cerrado","detalle":"el servidor dejó de aceptar conexiones"}
```

Duas coisas convém observar. A primeira: `GET /api/estados` levou 418 ms, pouco mais que o destino mais lento (405 ms) e muito menos que a soma dos três; essa é a concorrência da lição 5 fazendo seu trabalho por meio do HTTP. A segunda: cada `GET /api/estados` dispara de novo todas as consultas. É a decisão mais simples, a correta para começar, e tem um custo que você verá em “O que se faz errado”.

## O erro que você vai ver

A primeira classe de erro aparece quando você declara rotas internas corretas, mas chama uma função com uma rota que não pertence à união. Com o TypeScript 7.0.2, o `tsc` informa o TS2345 na chamada a `atender`.

```ts
// fig08_06.ts
type Ruta = "/salud" | "/api/estados";

function atender(ruta: Ruta): void {
  console.log(ruta);
}

atender("/api/estado");
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig08_06.ts
fig08_06.ts(8,9): error TS2345: Argument of type '"/api/estado"' is not assignable to parameter of type 'Ruta'.
```

O TS2345 indica que o argumento de uma chamada não cumpre o contrato do parâmetro. Aqui não significa que o TypeScript tenha uma preferência ortográfica: revela uma decisão pendente. Se a rota pública correta é `/api/estados`, corrija a chamada. Se você realmente precisa de uma rota no singular, acrescente-a a `Ruta`, ensine a `reconocerRuta` como identificá-la e defina que resposta ela produz. Não resolva o problema com `as Ruta`; essa asserção silencia precisamente a verificação que evita rotas declaradas mas não implementadas.

Outro diagnóstico frequente aparece porque `IncomingMessage.url` pode ser `undefined`. Embora as requisições HTTP normais tenham URL, o tipo do Node permite sua ausência e o tratador deve ter uma política explícita.

```ts
// fig08_07.ts
import { createServer } from "node:http";

createServer((solicitud, respuesta) => {
  respuesta.end(solicitud.url.toUpperCase());
});
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext --types node fig08_07.ts
fig08_07.ts(5,17): error TS18048: 'solicitud.url' is possibly 'undefined'.
```

O TS18048 aparece quando você tenta usar um valor que pode estar ausente. A correção não é escrever `solicitud.url!`, porque isso apenas promete ao compilador que você sabe algo que o programa não verificou. Decida o que a API deve fazer diante da ausência. Para reconhecer uma rota, `solicitud.url ?? "/"` oferece uma raiz padrão, que é o que `rutaDe` faz no projeto. Se a URL é obrigatória para uma operação concreta, você pode responder `400` e terminar a requisição. A escolha depende do contrato, mas deve existir antes de usar métodos de string como `toUpperCase`.

Há um terceiro erro que não é do compilador, e sim do Node, e você o verá logo: iniciar o servidor em uma porta que outro processo já ocupa. Sem tratamento de erros, o Node termina com um stack trace de `Error: listen EADDRINUSE`. No projeto, `escuchar` converte esse evento em uma rejeição da promise, e `main.ts` o registra e sai com código 1. Para provocá-lo, inicie duas cópias na mesma porta; a segunda imprime:

```text
$ PUERTO=3100 npm run arrancar
{"momento":"2026-10-02T20:41:59.411Z","evento":"arranque-fallido","detalle":"listen EADDRINUSE: address already in use 127.0.0.1:3100"}
```

`EADDRINUSE` significa que a porta já tem dono: quase sempre é uma cópia anterior do seu próprio programa que você não encerrou. Antes de mudar o código, procure quem escuta nessa porta (`lsof -i :3100` no Linux) ou use outra porta com `PUERTO=3101`.

## O que se faz errado

- **Abrir o servidor antes de validar a configuração.** Se você chama `listen` e depois descobre que `PUERTO` ou a lista de serviços é inválida, o processo pode ficar visível e pela metade. Valide primeiro as entradas externas; abra a porta apenas quando o programa souber com que contrato vai trabalhar.

- **Usar `solicitud.url as Ruta`.** Uma asserção não analisa a requisição nem bloqueia rotas alheias. Apenas elimina a proteção estática. Converta o texto externo por meio de uma função como `reconocerRuta` e responda `404` quando não houver uma alternativa válida.

- **Responder JSON sem o cabeçalho `content-type`.** Alguns clientes poderão interpretar o corpo de qualquer forma, mas outros não terão um sinal confiável de como lê-lo. A representação e seu cabeçalho formam um único contrato HTTP.

- **Responder `200` para erros de rota ou de configuração.** Um corpo que diz “erro” com código `200` obriga o painel e outras integrações a interpretar frases. Use códigos HTTP para a categoria geral e reserve o corpo para o detalhe de que o cliente precisa.

- **Serializar o modelo interno como resposta.** `JSON.stringify(estados)` é uma linha e funciona, mas publica a URL e o tempo limite de cada serviço, e amarra cada mudança do modelo a uma mudança da API. Construa o objeto público campo por campo.

- **Confiar que `new URL` nunca falha.** O destino de uma requisição é escrito pelo cliente, e `new URL("//", base)` lança `TypeError: Invalid URL`. Uma exceção que ninguém captura em um tratador assíncrono encerra o processo. Capture o erro ao analisar e responda `404` ou `400`, e encadeie um `.catch` à promise do tratador como última rede.

- **Escrever a resposta antes de esperar o resultado.** Se você chama `writeHead(200, ...)` e depois faz `await` de um trabalho que pode falhar, já não pode mudar o código para `500`: o `200` saiu. Espere primeiro, responda depois.

- **Colocar a consulta de serviços dentro do tratador de cada requisição sem uma política.** Se cada `GET /api/estados` dispara todas as consultas remotas, dez pessoas abrindo o painel multiplicam o tráfego para os seus serviços e obtêm relatórios diferentes. Para começar é aceitável; em produção decida deliberadamente se a API revisa sob demanda, conserva um relatório recente por alguns segundos ou executa revisões agendadas.

- **Registrar segredos ou a URL completa de cada requisição.** Os logs devem servir para operar, não virar uma cópia permanente de dados sensíveis. Registre método, rota sem query string, código e duração; elimine ou mascare credenciais, tokens e dados privados.

- **Chamar `process.exit()` ao receber um sinal.** O processo termina de imediato e pode cortar requisições, escritas e registros. Primeiro inicie `server.close`, espere sua conclusão e deixe o processo terminar naturalmente quando não restar trabalho pendente.

- **Capturar todos os erros e responder sempre o mesmo detalhe técnico.** O cliente precisa de uma resposta estável e segura; o log precisa de contexto para diagnosticar. Separe os dois públicos: um `500` pode dizer `{"detalle":"error interno"}` enquanto o registro conserva o erro técnico.

## Exercícios

### Exercício 1 — Rota de versão

Acrescente a rota `GET /version` ao reconhecimento tipado de rotas do projeto. Deve responder `200`, cabeçalho de texto e o corpo `revisor 1`. Conserve `404` para qualquer outra rota, e verifique que o compilador aponta o `switch` até você atender o novo ramo. Verifique ambas as respostas com um teste que use um servidor na porta `0`.

### Exercício 2 — Um relatório com resumo

Acrescente a `ReportePublico` um campo `resumen: { disponibles: number; fallas: number }` e calcule-o em `aReportePublico`. Atualize o teste de `reporte.test.ts` para que o verifique, e execute `npm run verificar` para ver que outros arquivos o compilador obriga você a tocar. Explique por que `esReportePublico` também deve mudar.

### Exercício 3 — Mais uma variável de ambiente

Acrescente `REVISOR_MAX_SERVICIOS` (por padrão 20) com `leerEnteroPositivo` e faça com que `main.ts` rejeite a inicialização, com `configuracion-invalida`, se `servicios.json` trouxer mais serviços que esse limite. Escreva um teste com tabela de casos para a regra.

### Exercício 4 — Encerramento com tempo máximo

Um encerramento que espera por uma requisição que nunca termina deixa o processo pendurado. Modifique `detener` em `main.ts` para que, se `cerrar(servidor)` não terminar em 10 segundos, registre o evento `cierre-forzado` e chame `servidor.closeAllConnections()`. Verifique sua mudança iniciando o `revisor`, fazendo `curl` a um destino lento e enviando `SIGTERM`.

## Soluções

### Solução 1

A nova rota deve aparecer tanto no tipo quanto na função que converte o texto externo, e essa função continua passando por `rutaDe`: chamar `new URL` diretamente reintroduziria o defeito das requisições com destino `//`. Deixá-la em apenas uma das duas partes produziria um contrato incompleto: a união diria que ela existe, mas nenhuma requisição poderia alcançá-la, ou uma requisição chegaria a um ramo que o TypeScript não reconhece como parte do design. Com a guarda `never` do `switch`, esquecer o ramo é um erro de compilação (TS2322) e não um descuido que se descobre em produção.

```ts
type Ruta =
  | { readonly tipo: "salud" }
  | { readonly tipo: "version" }
  | { readonly tipo: "estados" }
  | { readonly tipo: "no-encontrada" };

function reconocerRuta(url: string | undefined): Ruta {
  switch (rutaDe(url)) {
    case "/salud":
      return { tipo: "salud" };
    case "/version":
      return { tipo: "version" };
    case "/api/estados":
      return { tipo: "estados" };
    default:
      return { tipo: "no-encontrada" };
  }
}
```

Em `atender`, acrescente `case "version":` com o mesmo padrão de `salud`: `respuesta.writeHead(200, { "content-type": "text/plain; charset=utf-8" })`, `respuesta.end("revisor 1")` e `return`. O teste, em `servidor.test.ts`, verifica também que uma rota diferente recebe `404`; testar apenas o caminho de sucesso não confirma que o servidor conserva o limite entre rotas conhecidas e desconhecidas.

```ts
test("GET /version responde el texto y una ruta parecida sigue en 404", async () => {
  const api = crearServidor({
    obtenerReporte: async () => ({ estados: [] }),
    registrar: () => {},
  });
  await escuchar(api, 0);
  const base = `http://127.0.0.1:${puertoDe(api)}`;

  try {
    const version = await fetch(`${base}/version`);
    assert.equal(version.status, 200);
    assert.equal(version.headers.get("content-type"), "text/plain; charset=utf-8");
    assert.equal(await version.text(), "revisor 1");

    const parecida = await fetch(`${base}/version/otra`);
    assert.equal(parecida.status, 404);
    await parecida.body?.cancel();
  } finally {
    await cerrar(api);
  }
});
```

### Solução 2

A mudança de tipo e o cálculo vivem juntos, e o compilador faz o resto do trabalho: cada lugar que constrói um `ReportePublico` sem `resumen` deixa de compilar.

```ts
export interface ReportePublico {
  readonly resumen: { readonly disponibles: number; readonly fallas: number };
  readonly estados: readonly EstadoPublico[];
}

export function aReportePublico(estados: readonly Estado[]): ReportePublico {
  const publicos = estados.map(aEstadoPublico);
  const disponibles = publicos.filter((estado) => estado.tipo === "disponible").length;

  return {
    resumen: { disponibles, fallas: publicos.length - disponibles },
    estados: publicos,
  };
}
```

Aqui `aEstadoPublico` é a função que converte um único `Estado`, a que antes estava escrita dentro do `map`. `esReportePublico` deve verificar também `resumen`, porque seu trabalho é descrever em tempo de execução exatamente o que o tipo promete em tempo de compilação; se você mudar apenas o tipo, a guarda aceitaria respostas que o tipo já não admite, e o painel da lição 9 compilaria contra um contrato que ninguém verifica.

### Solução 3

A leitura do limite é mais uma entrada de ambiente e é tratada como a porta: uma função pequena, um `Resultado`, e `main.ts` decide o que fazer com a falha.

```ts
const maximo = leerEnteroPositivo("REVISOR_MAX_SERVICIOS", process.env.REVISOR_MAX_SERVICIOS, 20);

if (!maximo.ok) {
  fallarArranque("configuracion-invalida", maximo.detalle);
  return;
}

if (servicios.valor.length > maximo.valor) {
  fallarArranque(
    "configuracion-invalida",
    `servicios.json trae ${servicios.valor.length} servicios y el máximo es ${maximo.valor}`,
  );
  return;
}
```

A regra “mais serviços que o máximo” é pura: convém extraí-la para uma função `validarCantidad(servicios, maximo): Resultado<readonly Servicio[]>` em `configuracion.ts` e testá-la com uma tabela (0, 1, o máximo, o máximo mais um), que é onde vivem os erros de fronteira, em vez de testá-la por meio de `main.ts`.

### Solução 4

A corrida é entre duas promises: o encerramento ordenado e um temporizador. Se o temporizador ganha, as conexões que continuarem abertas são fechadas à força; isso faz `server.close` terminar.

```ts
const detener = (senal: string): void => {
  cierre ??= (async () => {
    registrar({ evento: "cierre", detalle: `${senal} recibida` });

    const limite = setTimeout(() => {
      registrar({ evento: "cierre-forzado", detalle: "pasaron 10 s con solicitudes abiertas" });
      servidor.closeAllConnections();
    }, 10_000);

    try {
      await cerrar(servidor);
    } finally {
      clearTimeout(limite);
    }

    registrar({ evento: "cerrado", detalle: "el servidor dejó de aceptar conexiones" });
  })();
};
```

O `.catch(...)` que `main.ts` encadeia no final da expressão é conservado tal qual; é omitido aqui para mostrar apenas o que muda. O `finally` cancela o temporizador quando o encerramento de fato terminou a tempo: sem ele, o temporizador manteria o processo vivo por mais dez segundos embora já não fosse necessário. `closeAllConnections()` corta as requisições em andamento, por isso é um último recurso, e por isso é registrado como um evento próprio: quem ler o log deve poder distinguir um encerramento limpo de um forçado.

## Como sei que consegui

- [ ] `npx tsc --version` imprime `Version 7.0.2` dentro de `~/proyectos/revisor`.
- [ ] Na pasta `figuras/`, `fig08_01.ts` compila com `--types node`, imprime `200 ok` e o processo termina sozinho depois de fechar seu servidor.
- [ ] `fig08_03.ts` rejeita `65536`, `0` e `hola` com um detalhe que nomeia a variável `PUERTO`, e aceita a ausência com `3000`.
- [ ] `fig08_04.ts` imprime `cierre` antes de `cliente` e `cerrado` no final; a requisição em andamento recebe sua resposta.
- [ ] Ao compilar a figura da rota com `/api/estado`, aparece o TS2345; ao compilar a figura de `solicitud.url`, aparece o TS18048.
- [ ] No projeto, `npm run verificar`, `npm run lint` e `npm run formato` terminam sem avisos, e `npm run probar` relata 19 testes aprovados e 0 falhos.
- [ ] `PUERTO=3100 npm run arrancar` registra `escuchando`; `curl http://127.0.0.1:3100/api/estados` devolve JSON com `nombre` e `tipo` por serviço e sem `url`; `Ctrl+C` registra `cierre` e `cerrado`.
- [ ] `PUERTO=hola npm run arrancar` termina com código de saída 1 e o evento `configuracion-invalida`, sem abrir nenhuma porta.

## Para ler mais

- [Node.js: HTTP](https://nodejs.org/api/http.html) — documentação oficial de `createServer`, requisições, respostas, `listen` e `close`; consultado em 2 de outubro de 2026.

- [Node.js: Process](https://nodejs.org/api/process.html) — documentação oficial sobre sinais de processo, `SIGTERM` e o ciclo de vida do Node; consultado em 2 de outubro de 2026.

- [TypeScript Handbook: Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) — documentação oficial sobre a redução de uniões discriminadas, verificações de valores opcionais e exaustividade com `never`; consultado em 2 de outubro de 2026.

- [MDN: Códigos de status de respostas HTTP](https://developer.mozilla.org/pt-BR/docs/Web/HTTP/Reference/Status) — referência sobre os códigos de status HTTP e seu significado para clientes e servidores; consultado em 2 de outubro de 2026.
