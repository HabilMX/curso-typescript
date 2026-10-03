# Lição 0 — O que é TypeScript e o que NÃO é

**Tempo:** 90 min (ou 2 × 45)

**O que você constrói:** nada ainda (leitura)

**O que você aprende:** JS vs TS; os tipos são apagados na execução; o que é protegido e o que não é; por que `strict`

## Ao terminar, você vai conseguir

- Explicar a diferença entre JavaScript e TypeScript sem dizer que são duas linguagens concorrendo no navegador.
- Compilar um arquivo `.ts`, executar o JavaScript gerado e reconhecer que informação de tipos desapareceu.
- Identificar um erro que o TypeScript consegue barrar antes de executar um programa.
- Identificar um caso em que um tipo escrito em TypeScript não basta para proteger dados que vêm de fora.
- Explicar por que o curso usa `strict` desde o início.
- Ler e corrigir os erros TS2345 e TS18048 do compilador.

## O porquê antes do como

O `revisor` que você vai construir ao longo deste curso consulta vários serviços, reúne as respostas deles e mostra um relatório. Embora no começo pareça um programa pequeno, ele contém um problema que se repete em quase qualquer sistema: há dados com a forma esperada e há dados que podem chegar com a forma errada. Um serviço deve ter nome, URL e estado; uma resposta deve incluir um código HTTP; o painel deve receber o mesmo relatório que a API produziu. Se alguém confunde uma URL com um código numérico, escreve errado o nome de uma propriedade ou trata como resposta bem-sucedida um objeto incompleto, o programa pode falhar tarde: talvez só quando uma pessoa abrir o painel ou quando um serviço externo responder de um jeito pouco comum.

JavaScript permite escrever programas úteis com pouquíssimas barreiras. Você pode criar um objeto, acrescentar uma propriedade depois, passar uma string onde outra função esperava um número e executar o arquivo imediatamente. Essa flexibilidade é uma das virtudes da linguagem: JavaScript serve para experimentar, automatizar tarefas, construir interfaces e fazer mudanças rápidas. O custo aparece quando o programa cresce, quando várias pessoas mexem no mesmo código ou quando uma função deixa de ser evidente por si só. O editor já não consegue saber com certeza que dados uma função recebe, e você acaba guardando regras importantes na memória, em comentários ou na esperança de que os testes cubram todos os caminhos.

O TypeScript acrescenta uma camada de verificação antes da execução. Essa camada descreve que valores uma função pode receber, que propriedades um objeto deve ter e que resultados uma operação pode produzir. Com essa informação, o compilador confere se as peças do programa se encaixam. Ele não espera que o usuário encontre uma tela quebrada nem que uma requisição real chegue à produção: aponta muitos erros enquanto você escreve ou compila.

A palavra importante é “muitos”, não “todos”. O TypeScript não substitui os testes, não transforma dados externos em dados confiáveis e não impede, sozinho, que uma função tenha uma regra de negócio errada. Se o `revisor` considera que uma resposta HTTP 500 significa “serviço disponível”, o TypeScript pode verificar que o código é um número, mas não pode adivinhar que o seu critério operacional está incorreto. Os tipos descrevem estrutura e relações entre valores; eles não conhecem automaticamente o mundo que esses valores representam.

Convém também desfazer, desde a primeira lição, uma confusão comum: o TypeScript não substitui o JavaScript em tempo de execução. Node, o navegador e o React executam JavaScript. O fluxo normal do curso escreve TypeScript, verifica com `tsc` e transforma o resultado em JavaScript antes de executar. Quando o `revisor` estiver rodando, os tipos `Servicio`, `Estado` e `Reporte` já não estarão ali como objetos que o Node possa consultar. Isso tem consequências importantes: uma anotação pode evitar um erro dentro do seu código, mas não valida o JSON que chega por HTTP nem modifica um valor que já está incorreto.

O Node 24 LTS também consegue executar diretamente um script `.ts` cuja sintaxe seja apagável. Nesse caso, ele troca os tipos por espaços e executa o JavaScript que sobra: não verifica tipos, não lê o `tsconfig.json` e não aceita sintaxe que gere código, como `enum`. Use-o, se for conveniente, para um script isolado; o `revisor` terá vários arquivos e será compilado com `tsc` para executar `dist/*.js`. A página do Node sobre TypeScript documenta esse *type stripping*, ou remoção de tipos, e seus limites.

Em Go, o compilador também verifica tipos antes de criar o executável. A diferença prática é que um programa em Go se transforma em um binário nativo, enquanto o TypeScript produz JavaScript para uma plataforma que já existe: o Node ou o navegador. A comparação útil não é decidir qual dos dois “é mais estrito”, e sim reconhecer uma disciplina compartilhada: declarar contratos para que os erros de integração apareçam antes. Em Go, esses contratos são escritos com os tipos da linguagem; em TypeScript, são escritos sobre o JavaScript e eliminados antes da execução.

Por isso o curso começa com uma lição de leitura. Antes de aprender a sintaxe, você precisa saber que promessa a ferramenta faz e qual ela não faz. Se você espera que o TypeScript valide automaticamente um arquivo de configuração, vai chegar a uma falsa sensação de segurança. Se acha que ele só acrescenta anotações incômodas, provavelmente vai desativar as verificações justamente quando elas mais podem ajudar. O objetivo é usá-lo pelo que ele é: um verificador estático que torna visíveis os contratos do seu programa e que obriga você a cuidar das zonas em que esses contratos ainda não bastam.

## Os conceitos

### JavaScript continua sendo o programa que executa

JavaScript é uma linguagem dinâmica. Isso significa que seus valores são inspecionados enquanto o programa roda. Uma variável pode conter uma string agora e, se você a reatribuir, conter um número depois. Uma função pode receber qualquer valor, a menos que você mesmo escreva verificações em tempo de execução. O JavaScript não exige que se declarem todos os tipos porque seu modelo foi pensado para decidir muita coisa na hora de executar.

Isso não quer dizer que o JavaScript seja descuidado nem que um programa JavaScript esteja condenado a falhar. Você pode escrever JavaScript muito claro, testá-lo bem e validar cada entrada. O problema é de escala e de feedback. Se `mostrarEstado` deve receber um entre dois estados possíveis, o JavaScript não avisa quando você escreve `"disponble"`, com uma letra faltando. O programa pode continuar rodando e mostrar um rótulo incorreto, ou percorrer um ramo que ninguém esperava. O erro fica escondido até que algum caminho específico o revele.

O TypeScript pega o mesmo código JavaScript e permite descrever seus limites. Um tipo literal como `"disponible" | "falla"` expressa que nem qualquer string serve: só essas duas servem. Quando uma função aceita esse tipo, o TypeScript compara cada chamada com o contrato antes de emitir o JavaScript. Ele não está calculando o estado real de um serviço; está conferindo que as partes do seu programa usam o mesmo vocabulário.

```ts
// fig00_01.ts
type Estado = "disponible" | "falla";

function describir(estado: Estado): string {
  return estado === "disponible" ? "Servicio disponible" : "Servicio con falla";
}

console.log(describir("disponible"));
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig00_01.ts
$ node fig00_01.js
Servicio disponible
```

O programa parece quase igual ao JavaScript. As partes específicas do TypeScript são `type Estado`, a união de literais e as anotações `: Estado` e `: string`. O resto — a função, o operador ternário e `console.log` — é JavaScript comum. Essa continuidade é uma vantagem para quem já programa em JavaScript: você não começa do zero nem aprende uma máquina de execução diferente; você acrescenta informação que o compilador e o editor conseguem verificar.

O valor dessa informação aumenta quando o tipo é reutilizado. Se cada função do `revisor` inventasse suas próprias strings para descrever o estado, logo você teria `"ok"`, `"OK"`, `"disponible"` e `"funcionando"` para uma mesma ideia. Todas são strings válidas para o JavaScript, mas nem todas são válidas para o relatório que você quer construir. Um tipo compartilhado fixa um pequeno idioma para o projeto. Mais adiante, esse idioma vai incluir estados com detalhe, duração e código HTTP.

Dentro do `revisor`, a mesma ideia aparece a partir do menor modelo possível. Ainda não se trata de consultar uma URL nem de abrir um servidor: trata-se de evitar que as funções que processam resultados falem dialetos diferentes. Se `Estado` diz que os resultados podem ser `"disponible"` ou `"falla"`, uma função que recebe um serviço pode se apoiar nessa decisão, e uma tela pode mostrar as duas alternativas que de fato existem.

```ts
// fig00_02.ts
type Estado = "disponible" | "falla";

type Servicio = {
  nombre: string;
  estado: Estado;
};

function resumen(servicio: Servicio): string {
  return `[${servicio.estado}] ${servicio.nombre}`;
}

const catalogo: Servicio = {
  nombre: "catálogo",
  estado: "disponible",
};

console.log(resumen(catalogo));
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig00_02.ts
$ node fig00_02.js
[disponible] catálogo
```

Aqui o TypeScript confere várias relações ao mesmo tempo. `catalogo` deve ter `nombre` e `estado`; `nombre` deve ser uma string; `estado` deve ser um dos dois literais permitidos; e `resumen` só aceita um objeto com essa forma. O compilador não precisa executar uma requisição de rede para descobrir uma contradição: ele a enxerga ao comparar o valor escrito com o contrato `Servicio`.

Você não precisa anotar cada variável. O TypeScript consegue inferir muitos tipos a partir dos valores. Por exemplo, se você escreve `const nombre = "catálogo"`, o compilador sabe que se trata de texto. As anotações são mais valiosas nas bordas de uma função, nos dados compartilhados entre módulos e nas decisões que você quer transformar em contrato. Escrever `const nombre: string = "catálogo"` não acrescenta informação útil; escrever `function resumen(servicio: Servicio): string` comunica, sim, o que entra e o que sai.

A inferência também não elimina a necessidade de pensar. O compilador infere a partir do código disponível, não a partir da intenção que você esqueceu de expressar. Se uma lista pode conter serviços disponíveis e com falha, você vai precisar modelar essa diferença de forma explícita. Se um valor pode faltar, você vai ter que admiti-lo no tipo e tratá-lo. O TypeScript reduz o trabalho mecânico de repetir tipos óbvios para que você concentre a atenção nos contratos que mudam o comportamento do programa.

### Os tipos são apagados antes de executar

Uma anotação de tipo não é uma instrução para o Node. Quando você compila `fig00_02.ts`, o arquivo gerado conserva a função, o objeto e a chamada a `console.log`, mas elimina `type Estado`, `type Servicio`, `: Estado`, `: Servicio` e `: string`. O Node não precisa entendê-los porque nunca os recebe.

O JavaScript essencial que resulta desse exemplo é parecido com isto:

```js
function resumen(servicio) {
  return `[${servicio.estado}] ${servicio.nombre}`;
}

const catalogo = {
  nombre: "catálogo",
  estado: "disponible",
};

console.log(resumen(catalogo));
```

Esse trecho não contém uma definição de `Servicio`. Também não contém uma lista de valores válidos para `Estado`. A verificação aconteceu durante a compilação, antes de o Node ler o arquivo. Por isso se diz que os tipos do TypeScript são apagados: são informação para verificar e desenvolver o programa, não dados que acompanhem automaticamente o programa enquanto ele roda.

Essa decisão tem vantagens. O JavaScript emitido não precisa de uma biblioteca de reflexão só para conservar as anotações. O navegador não baixa uma representação de cada tipo pelo simples fato de o projeto usar TypeScript. O Node pode executar o resultado como executa qualquer outro módulo JavaScript. Além disso, você pode adotar o TypeScript de forma gradual: muito código JavaScript válido pode conviver com arquivos `.ts` enquanto você acrescenta contratos onde eles fazem falta.

Também há uma consequência que você deve repetir até que fique intuitiva: escrever um tipo não converte um valor. Se você afirma que uma variável é `number`, o compilador verifica as operações dentro do código TypeScript, mas o JavaScript emitido não transforma `"404"` em `404`. Se você declara que uma propriedade existe, o Node não cria essa propriedade. Se um JSON recebido não traz `url`, nenhuma anotação vai fazê-la aparecer. As anotações descrevem uma expectativa; não fabricam nem corrigem dados.

Isso distingue os tipos da validação. A validação é executada e decide o que fazer com um valor real: rejeitá-lo, corrigi-lo, convertê-lo ou devolver um erro. Um tipo estático permite que o compilador raciocine sobre os valores que o programa já considera confiáveis. As duas coisas são necessárias, mas acontecem em lugares diferentes. Neste curso, os tipos do modelo aparecem primeiro; a validação de JSON, de variáveis de ambiente e de respostas HTTP chega na lição 6, quando você já tiver claro por que ela não pode ser automática.

O `revisor` terá tipos compartilhados entre a API e o painel. Isso permite que as duas partes concordem sobre a forma de um relatório enquanto são desenvolvidas. No entanto, quando o navegador recebe JSON da API, ele recebe JSON: texto convertido em objetos JavaScript, não uma instância mágica do tipo `Reporte`. A API deve construir uma resposta correta e o painel deve tratar a fronteira de rede com cuidado. Compartilhar tipos evita muitas contradições dentro do repositório; não elimina a necessidade de validar uma fronteira.

O apagamento também explica por que você não consegue perguntar algo como `if (servicio is Servicio)` usando um `type` do TypeScript. O nome `Servicio` já não existe quando o Node roda. O que você pode fazer é verificar propriedades concretas com JavaScript, por exemplo conferir que um valor é um objeto, que tem uma propriedade `nombre` do tipo string e que sua URL também é uma string. Essa verificação será parte de uma função de validação, não parte da definição de tipo.

A regra prática é simples: use tipos para expressar contratos entre o código que você controla; use validação para decidir se você aceita dados que chegam de fora. Na vida real há zonas cinzentas, como dados de uma biblioteca externa ou arquivos criados por outra parte do mesmo sistema. Se você não consegue demonstrar que uma entrada cumpre o contrato, trate-a como não confiável até validá-la.

### O TypeScript protege contratos internos, não a realidade externa

O compilador só enxerga o código que recebe e os tipos disponíveis para analisá-lo. Ele consegue detectar que você passou um número a uma função que pede uma string. Consegue detectar que você tenta usar uma propriedade inexistente em um objeto cujo tipo ele conhece. Consegue detectar que uma variável talvez seja `undefined`. Não consegue abrir uma conexão HTTP, conferir que um fornecedor respeitou a documentação dele nem saber se a configuração que um usuário escreveu ontem ainda tem o formato correto hoje.

O caso mais perigoso para iniciantes é a asserção de tipo com `as`. Uma expressão como `valor as Servicio` não valida o valor. Ela diz ao compilador: “daqui em diante, confie que eu sei que isto é um `Servicio`”. Às vezes é razoável, quando você já fez uma verificação que o TypeScript não conseguiu deduzir. Usá-la para calar uma dúvida sobre dados externos, porém, equivale a tirar o cinto de segurança porque o alarme está tocando.

Para isolar essa fronteira, o `Servicio` da figura a seguir usa uma forma reduzida, diferente do `Servicio` com `estado` de `fig00_02.ts`: agora ele conserva apenas `nombre` e `url`. O modelo completo e estável do `revisor` chegará na lição 3.

```ts
// fig00_03.ts
type Servicio = {
  nombre: string;
  url: string;
};

const servicio = JSON.parse(
  '{"nombre":"pagos","direccion":"https://pagos.example"}',
) as Servicio;

console.log(`${servicio.nombre}: ${servicio.url}`);
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig00_03.ts
$ node fig00_03.js
pagos: undefined
```

O arquivo compila sem erro porque a asserção obrigou o compilador a tratar o resultado como `Servicio`. No entanto, o JSON tem `direccion`, não `url`. Ao executar, o JavaScript procura uma propriedade inexistente e produz `undefined`. Para o runtime não há contradição: os objetos JavaScript podem não ter uma propriedade. A contradição existe entre a promessa escrita com `as Servicio` e o dado real.

Esse exemplo não significa que `JSON.parse` seja ruim nem que o TypeScript seja inútil diante de JSON. Significa que a ordem correta importa. Primeiro você recebe um valor cuja forma desconhece; depois verifica as propriedades dele; só então o converte em um valor que o resto do programa pode usar como `Servicio`. O TypeScript representa esse ponto de partida com `unknown`, um tipo que obriga a inspecionar antes de acessar propriedades. Você vai estudá-lo com mais detalhe quando o `revisor` ler sua configuração e processar respostas remotas.

Há outros limites que você também deve reconhecer. O TypeScript não sabe se uma URL aponta para um servidor real. Não sabe se um estado `"disponible"` descreve corretamente a saúde de um serviço. Não sabe se duas requisições que chegam ao mesmo tempo alteram um recurso de forma incompatível. Não sabe se uma senha foi exposta em um log. Ele pode ajudar você a modelar os dados para que esses problemas fiquem mais fáceis de ver e de testar, mas as decisões de segurança, de concorrência e de negócio exigem projeto, validação e testes.

O tipo também pode estar mal projetado. Se você declara que `codigoHttp` é `number`, do ponto de vista do tipo vai aceitar `-5`, `999` e `3.14`. Talvez o programa só precise saber que é um número; talvez o domínio exija um inteiro entre 100 e 599. A segunda regra não surge sozinha de `number`. Mais adiante você vai decidir onde representar restrições de domínio: com uniões de literais, validadores, funções construtoras ou uma combinação delas.

Dentro do `revisor`, os dados que as suas próprias funções constroem são uma zona em que o TypeScript protege muito. Se `crearReporte` recebe serviços já verificados e devolve uma estrutura conhecida, os tipos evitam que a API e o painel divirjam nos nomes das propriedades. A resposta que chega de uma URL configurada por uma pessoa é outra zona: o tipo compartilhado não prova que o servidor entregou o JSON prometido. Essa fronteira é validada antes de converter os dados em resultados internos.

Uma boa forma de pensar o sistema é traçar uma linha. Do lado interno, deixe o `strict` ser exigente e evite escapar com `any` ou com asserções sem evidência. Nas fronteiras, aceite que o valor ainda não merece confiança e valide-o. O tipo não deixa de ser uma disciplina só porque os dados externos são incertos; pelo contrário, ele ajuda você a apontar com precisão o momento em que eles deixam de ser incertos e passam a ser utilizáveis.

### O `strict` transforma dúvidas frequentes em trabalho explícito

O TypeScript tem opções de compilação que determinam o quanto ele verifica. Desde o TypeScript 6, `strict` vale `true` por padrão; o TypeScript 7.0.2 já parte dessas verificações. Os comandos desta lição escrevem `--strict` para deixar explícita a decisão do curso, não porque o compilador precise dela para ativá-lo. Quem usa `--strict false` desliga essas verificações de propósito. Essa flexibilidade serve para uma migração cuidadosamente delimitada, mas não é o melhor ponto de partida para um projeto novo.

A opção `strict` ativa um conjunto de verificações estritas. Entre as mais visíveis estão `noImplicitAny`, que impede que valores sem tipo virem `any` silenciosamente, e `strictNullChecks`, que distingue entre um valor presente e um que pode ser `null` ou `undefined`. O conjunto pode crescer em versões futuras do TypeScript; por isso é melhor ativar a opção geral do que decorar uma lista de flags isoladas.

Em um curso do zero, o `strict` não é um castigo nem uma forma de escrever mais texto. É uma decisão para descobrir cedo os lugares em que o seu programa não expressou algo importante. Se uma função aceita um detalhe que pode faltar, essa ausência faz parte do contrato dela. Se um parâmetro não tem tipo, talvez você tenha esquecido de decidir que tipo de valores ele suporta. Se o compilador obriga você a resolver isso, está evitando que outra pessoa precise adivinhar depois.

```ts
// fig00_04.ts
function etiquetaDetalle(detalle: string | undefined): string {
  if (detalle === undefined) {
    return "sin detalle";
  }

  return detalle.toUpperCase();
}

console.log(etiquetaDetalle(undefined));
console.log(etiquetaDetalle("200 OK"));
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig00_04.ts
$ node fig00_04.js
sin detalle
200 OK
```

A função não finge que `detalle` sempre existe. Ela declara `string | undefined`, trata o caso ausente e só chama `toUpperCase()` quando o TypeScript consegue demonstrar que restou uma string. Essa redução de possibilidades se chama *narrowing* (estreitamento de tipo): depois da condição, o tipo é mais específico. Você não precisa decorar o termo hoje; precisa, sim, adquirir o hábito de tratar o caso que o contrato diz que pode ocorrer.

No `revisor`, os detalhes de uma falha podem faltar. Um serviço pode responder com um código HTTP sem texto adicional; uma conexão pode terminar antes de produzir uma resposta; uma configuração pode omitir um rótulo opcional. Se você modela tudo como `string`, o programa deixa você usá-lo como se sempre houvesse conteúdo. Com `strictNullChecks`, o tipo conserva a diferença entre “há um texto, mesmo que vazio” e “nenhum texto foi obtido”. Essa diferença melhora tanto as mensagens do painel quanto a lógica de diagnóstico.

O `strict` não promete que você nunca vai escrever uma asserção nem que todos os casos serão óbvios. Haverá integrações com bibliotecas, APIs do navegador ou dados externos em que você terá de fazer uma verificação concreta. A diferença é que a saída de emergência será deliberada e localizada. Sem `strict`, as dúvidas se propagam: um `any` entra por uma função, passa por outras cinco e no fim qualquer acesso a propriedades parece válido. Encontrar a origem, então, custa muito mais.

Há quem ative as verificações estritas no final, quando o projeto já tem milhares de linhas. Isso costuma transformar a adoção numa limpeza pesada: aparecem muitas decisões pendentes de uma vez e a pressão para entregar leva a desativar regras ou a encher o código de `as any`. Começar em modo estrito mantém o custo pequeno. Cada função nova resolve seus contratos quando nasce, e cada tipo novo fica disponível para as funções que vierem depois.

Go ensina uma lição parecida: o compilador não deixa você ignorar muitas incompatibilidades que outras linguagens descobrem tarde. O TypeScript conserva a flexibilidade do JavaScript porque pode ser adotado aos poucos, mas este curso vai escolher o caminho mais exigente para o código novo. A intenção não é fazer o compilador “ganhar” uma discussão, e sim transformar ambiguidades reais em decisões visíveis.

Quando, na lição 1, você criar o `tsconfig.json`, o `strict` fará parte da configuração base. A partir daí, um erro de tipos não se resolve tirando a opção. Resolve-se esclarecendo o contrato: anotando uma entrada, verificando um valor que pode faltar, separando estados diferentes ou validando um dado externo. Essa prática será uma das bases do `revisor`.

## O erro que você vai ver

O primeiro erro aparece quando uma chamada contradiz o tipo que uma função declarou. O programa a seguir pede uma URL como string, mas recebe um número. O `tsc` 7.0.2 não precisa executar o arquivo para detectar o problema.

```ts
// fig00_05.ts
function consultarServicio(url: string): void {
  console.log(url);
}

consultarServicio(404);
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig00_05.ts
fig00_05.ts(6,19): error TS2345: Argument of type 'number' is not assignable to parameter of type 'string'.
```

TS2345 significa que o valor de um argumento não pode ser atribuído ao tipo do parâmetro correspondente. O número `404` pode ser um código HTTP, mas não é uma URL. A correção não é converter qualquer dado em string para calar o erro. Primeiro decida o que a função representa: se ela consulta um endereço, recebe uma string como `"https://pagos.example"`; se processa um código HTTP, crie outra função cujo parâmetro seja um número. O erro revelou que dois conceitos diferentes foram misturados.

O segundo erro é consequência direta de `strictNullChecks`. O tipo aceita uma string ou `undefined`, mas o programa tenta usá-la como se fosse sempre uma string.

```ts
// fig00_06.ts
function etiquetaDetalle(detalle: string | undefined): string {
  return detalle.toUpperCase();
}

console.log(etiquetaDetalle(undefined));
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig00_06.ts
fig00_06.ts(3,10): error TS18048: 'detalle' is possibly 'undefined'.
```

TS18048 significa que o compilador encontrou um caminho válido em que `detalle` não tem valor. Se esse JavaScript fosse executado com `undefined`, tentar ler `toUpperCase` produziria um erro de execução. A correção é tratar a ausência antes de usar a string, como fez `fig00_04.ts`, ou mudar o contrato para que a função só receba `string` quando essa garantia realmente existir.

As mensagens do TypeScript são pistas, não instruções mecânicas. Um erro pode ser resolvido com uma condição, com um tipo mais bem projetado, com uma validação ou com uma função diferente. A pergunta útil não é “como faço o TS18048 desaparecer?”, e sim “este dado pode faltar segundo as regras do programa?”. Se a resposta for sim, trate o caso. Se for não, descubra onde falta a validação que deveria garanti-lo.

Lembre-se também de que, por configuração, o TypeScript pode emitir JavaScript mesmo depois de informar um erro. O compilador foi pensado para que uma migração gradual não pare de imediato um projeto JavaScript existente. No `revisor`, os erros de compilação serão tratados como falhas que devem ser corrigidas antes de dar uma mudança por concluída. A lição 1 vai configurar o projeto para tornar essa política explícita.

## O que se faz errado

- Usar `any` para fazer um erro sumir. O `any` desativa muitas verificações justamente no valor em que você mais precisava de informação. Às vezes ele aparece ao integrar código existente, mas não deve ser a saída automática. Prefira `unknown` quando o valor vem de fora e vá reduzindo o tipo dele por meio de validações.

- Escrever `as Servicio` sobre dados de JSON, de HTTP ou de variáveis de ambiente. Uma asserção não inspeciona o valor; só muda o que o TypeScript supõe sobre ele. Sem uma validação prévia, você pode produzir o mesmo `undefined` de `fig00_03.ts` com uma aparência enganosa de segurança.

- Acreditar que o TypeScript substitui os testes. Os tipos detectam incompatibilidades estruturais, mas não provam que uma requisição chega ao servidor certo, que um tempo limite funciona ou que um relatório ordena os serviços como o usuário pediu. Use tipos para fechar uma classe de erros e testes para observar o comportamento real.

- Desativar o `strict` quando aparecem várias mensagens. Os erros normalmente revelam uma decisão pendente: um parâmetro sem contrato, um dado opcional tratado como obrigatório ou um limite externo sem validar. Desativar a regra esconde o trabalho, mas não elimina a ambiguidade do programa.

- Anotar absolutamente tudo. O TypeScript infere tipos simples com precisão. Repetir `const nombre: string = "pagos"` acrescenta ruído sem reforçar nenhum limite. Guarde as anotações para contratos públicos, parâmetros, resultados relevantes e modelos compartilhados como `Servicio`.

- Confundir um tipo com uma regra de negócio. `codigoHttp: number` não garante que um número corresponda a uma resposta HTTP válida. Os tipos expressam uma parte do domínio; as regras restantes precisam de validação, testes e decisões explícitas.

## Exercícios

### Exercício 1 — Separar conceitos

Leia a chamada `consultarServicio(404)` de `fig00_05.ts`. Escreva duas frases: uma que explique por que o TS2345 tem razão e outra que proponha um valor correto para uma função que recebe uma URL. Depois escreva uma segunda assinatura de função adequada para processar um código HTTP numérico.

### Exercício 2 — Detectar uma promessa falsa

Parta do JSON de `fig00_03.ts`. Sem executar o programa, identifique a propriedade que não coincide com `Servicio` e preveja a saída exata de `console.log`. Explique por que `as Servicio` permitiu compilar mesmo que o objeto não tenha a forma esperada.

### Exercício 3 — Tornar a ausência explícita

Modifique mentalmente `fig00_06.ts` para que devolva `"sin detalle"` quando receber `undefined` e converta para maiúsculas uma string presente. Escreva qual deve ser a saída para `undefined` e para `"tiempo agotado"`. Depois compare com a solução.

### Exercício 4 — Do tipo ao limite do sistema

O `revisor` lê uma lista de serviços de uma fonte externa. Explique onde você colocaria cada responsabilidade: o tipo `Servicio`, a validação de que `nombre` e `url` são strings, e a verificação de que a URL responde. Justifique por que nenhuma das três substitui as outras duas.

## Soluções

### Solução 1

O TS2345 tem razão porque `404` é um número e a função declarou que precisa de uma string chamada `url`. Um valor correto para essa função poderia ser `"https://pagos.example"`. Se a intenção era trabalhar com o código, uma assinatura adequada seria `function describirCodigoHttp(codigo: number): string`. Separar as funções evita que o mesmo parâmetro represente duas ideias diferentes.

### Solução 2

A propriedade incorreta é `direccion`; o tipo `Servicio` espera `url`. A saída é `pagos: undefined`. A asserção `as Servicio` não comparou o objeto com o tipo nem acrescentou a propriedade que faltava; ela indicou ao compilador que confiasse em uma afirmação que o programa não verificou. O runtime só vê um objeto JavaScript com `nombre` e `direccion`.

### Solução 3

A função deve tratar o caso ausente antes de chamar `toUpperCase()`. Para `undefined`, a saída deve ser `sin detalle`. Para `"tiempo agotado"`, a saída deve ser `TIEMPO AGOTADO`. A solução completa segue o mesmo padrão de `fig00_04.ts`: uma condição resolve a ausência e, depois dela, o TypeScript sabe que o valor restante é uma string.

### Solução 4

O tipo `Servicio` pertence ao código interno compartilhado pelas partes do `revisor`: expressa que um serviço utilizável tem `nombre` e `url` do tipo string. A validação pertence ao ponto exato em que a lista entra no sistema: recebe um valor ainda incerto, verifica as propriedades dele e rejeita ou reporta um dado inválido. A verificação de que a URL responde pertence à operação de rede, porque uma string com cara de URL pode apontar para um servidor inexistente, lento ou com uma resposta com falha. O tipo organiza o código; a validação protege a fronteira; a consulta observa o estado real do serviço.

## Como sei que consegui

Você pode considerar esta lição concluída quando cumprir estas verificações:

- [ ] Você consegue executar `npx tsc --version` e obter `Version 7.0.2`.

- [ ] Você consegue executar `node --version` e obter uma versão que começa com `v24`.

- [ ] Ao copiar `fig00_01.ts`, compilá-lo com `npx tsc --strict --target ES2022 --module nodenext fig00_01.ts` e executar `node fig00_01.js`, você obtém exatamente `Servicio disponible`.

- [ ] Ao compilar `fig00_05.ts` com o mesmo comando, você obtém o TS2345 e não tenta executá-lo como se fosse um programa correto.

- [ ] Você consegue explicar por que `fig00_03.ts` imprime `undefined` embora compile sem erros.

- [ ] Você consegue corrigir `fig00_06.ts` sem tirar o `strict` e sem mudar o tipo para fingir que `undefined` nunca pode chegar.

- [ ] Você consegue dizer, sem consultar esta lição, que o TypeScript verifica antes de executar, emite JavaScript e não valida sozinho dados externos.

## Para ler mais

- [TypeScript Handbook: The Basics](https://www.typescriptlang.org/docs/handbook/2/basic-types.html) — documentação oficial do TypeScript; consultado em 2 de outubro de 2026.

- [TSConfig: strict](https://www.typescriptlang.org/tsconfig/strict.html) — documentação oficial da opção `strict`; consultado em 2 de outubro de 2026.

- [Node.js: TypeScript](https://nodejs.org/api/typescript.html) — documentação oficial do Node sobre execução e suporte relacionado ao TypeScript; consultado em 2 de outubro de 2026.

- [MDN: TypeScript](https://developer.mozilla.org/en-US/docs/Glossary/TypeScript) — definição e contexto do TypeScript na MDN (em inglês); consultado em 2 de outubro de 2026.
