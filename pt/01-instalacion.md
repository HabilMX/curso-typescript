# Lição 1 — Instalar o TypeScript no seu Linux Mint

**Tempo:** 2 × 45 min

**O que você constrói:** o ambiente e o seu primeiro programa

**O que você aprende:** Node LTS, gerenciador de pacotes, `tsc`, editor, `tsconfig` estrito, executar e depurar

## Ao terminar, você vai conseguir

- Instalar e verificar o Node.js 24 LTS, o npm e o compilador TypeScript no Linux Mint.
- Criar um projeto ESM com `package.json`, uma dependência local do TypeScript e um arquivo de bloqueio reproduzível.
- Compilar um programa com `npx tsc --strict --target ES2022 --module nodenext` e executar o JavaScript resultante com o Node.
- Configurar um projeto com `tsconfig.json` estrito, saída em `dist/` e mapas de código-fonte.
- Distinguir executar um `.ts` com a remoção de tipos do Node de verificá-lo e compilá-lo com `tsc`.
- Abrir o projeto em um editor, interromper a execução com um ponto de interrupção e corrigir um diagnóstico `TSxxxx`.

## O porquê antes do como

O `revisor` vai acabar sendo uma aplicação com duas partes que precisam coincidir: uma API que consulta vários serviços e um painel web que apresenta o relatório. Antes de chegar a essa complexidade, é preciso resolver uma pergunta menos vistosa, mas decisiva: como o seu computador converte o código que você escreve em um programa que ele consegue executar?

O JavaScript já responde a uma parte dessa pergunta. O Node executa arquivos `.js`; entende a sintaxe do JavaScript, cria o processo, carrega módulos, dá acesso a arquivos e à rede, e encerra o processo quando o trabalho acaba. Desde o Node 22.18, ele também consegue executar certos arquivos `.ts` removendo a sintaxe de tipos. O TypeScript acrescenta outra etapa, distinta: o `tsc` revisa o programa e produz JavaScript. Ele não substitui o Node nem se transforma em um sistema operacional diferente. É a ferramenta que encontra contradições no seu código antes que o Node tenha a oportunidade de executá-lo.

Essa separação importa desde o primeiro dia. Imagine que, daqui a algumas lições, o `revisor` receba uma lista de serviços e cada elemento precise de um nome, uma URL e uma política de tempo limite. Se você confunde um número com texto, ou chama uma propriedade que não existe, é melhor receber uma explicação ao compilar do que descobrir depois de implantar uma API. O compilador não verifica se uma URL realmente responde, nem pode garantir que um JSON externo tenha a forma esperada; essas fronteiras serão validadas mais adiante. Mas ele consegue conferir se o código que você escreveu é consistente com as regras que você declarou.

Em Go, o `go run` junta compilação e execução em um único comando e pode dar a impressão de que as duas coisas são uma mesma operação. O TypeScript torna a fronteira mais visível: o `tsc` transforma e verifica; o `node` executa. No começo parecem dois passos a mais. Na prática, são duas responsabilidades diferentes, e convém saber qual delas falhou. Se o `tsc` reporta `TS2322`, ainda não existe um programa confiável para executar. Se o `tsc` termina sem mensagens e o Node falha, o problema está no comportamento de execução, em um import que não existe no disco, em uma variável de ambiente ou em uma resposta externa.

A ferramenta certa também evita problemas que demoram a aparecer. O Linux Mint 22.x herda a base do Ubuntu 24.04 e seus pacotes privilegiam a estabilidade; o LMDE, por sua vez, é baseado no Debian. Isso é razoável para componentes do sistema, mas um curso precisa de uma linha de Node e de uma versão de TypeScript explícitas. Aqui você vai usar o Node 24 LTS e o TypeScript 7.0.2. Você não precisa decorar uma revisão menor do Node nem uma versão específica do npm: confira que `node -v` começa com `v24`, que o npm responde e que o compilador local imprime `Version 7.0.2`.

A primeira decisão do curso é instalar o TypeScript dentro do projeto, e não como uma ferramenta global do seu usuário. Uma instalação global responde à pergunta “que compilador eu tenho hoje neste notebook?”. Uma dependência local responde a uma pergunta mais útil: “com que compilador este projeto deve ser construído, aqui e em outro computador?”. O `package.json` guarda essa decisão; o `package-lock.json` registra as versões resolvidas. Assim, quando outra pessoa clonar o `revisor`, ela não depende do que por acaso tenha instalado.

Também vamos começar com ESM, os módulos padrão do JavaScript. Isso evita adotar uma sintaxe de módulos antiga só porque ela ainda aparece em exemplos velhos. No `revisor`, o `package.json` declara `"type": "module"` e os imports relativos escrevem a extensão que o arquivo terá na execução: `.js`, embora o arquivo-fonte seja `.ts`. Parece estranho na primeira vez, mas é consequência direta de o `tsc` emitir JavaScript e de o Node carregá-lo a partir de `dist/`.

Por fim, ativar o `strict` não é uma cerimônia. É escolher que o compilador aponte incertezas desde que o projeto é pequeno. Se você começa relaxado e endurece as regras depois de ter vinte arquivos, os diagnósticos se acumulam e fica difícil distinguir uma decisão de projeto de uma correção mecânica. O `revisor` terá serviços que falham, respostas ausentes e dados externos; construí-lo com verificação estrita desde a primeira linha torna essas possibilidades visíveis em vez de escondê-las.

## Os conceitos

### Node.js, npm e a dependência local

O Node.js é o ambiente que vai executar o JavaScript do `revisor`. O npm é o gerenciador de pacotes que vem com o Node: baixa dependências, conserva suas versões e oferece comandos definidos pelo projeto. O TypeScript é uma dessas dependências de desenvolvimento: é necessário para converter o código-fonte, mas não para executar o JavaScript já compilado.

Primeiro, instale o Node 24 LTS. O `nvm` é um gerenciador de versões do Node: permite instalar e selecionar linhas do Node sem usar o pacote do sistema. A documentação oficial do `nvm` publica este instalador para a versão 0.40.8 dele:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.8/install.sh | bash
```

Abra um terminal novo depois de instalá-lo. Se o seu terminal usa `bash` e ainda não encontra o comando, carregue a configuração com `source ~/.bashrc`; o instalador modifica o arquivo de inicialização adequado entre `.bashrc`, `.bash_profile`, `.zshrc` e `.profile`. Agora instale e selecione a linha 24:

```bash
nvm install 24
nvm alias default 24
nvm use 24
nvm --version
node -v
npm -v
```

`nvm --version` e `npm -v` devem imprimir uma versão. `node -v` deve começar com `v24`; `nvm install 24` pode escolher uma revisão menor mais recente dentro dessa linha LTS. Se o `nvm` disser que não existe, abra um terminal novo ou carregue o arquivo de inicialização que o instalador indicou. Antes de procurar soluções ao acaso, execute `echo "$SHELL"` para saber se você usa `bash`, `zsh` ou outro shell; uma alteração feita em `.bashrc` não é carregada automaticamente em uma sessão `zsh`. No Linux Mint, se você ainda não tem o `curl`, instale-o com `sudo apt install curl` e repita o comando do instalador.

Crie agora uma pasta para o projeto. O nome não tem nenhum significado técnico especial por enquanto: será a raiz do `revisor`, onde viverão o `package.json`, o `tsconfig.json`, o código-fonte e a saída compilada.

```bash
mkdir -p ~/proyectos/revisor/src
cd ~/proyectos/revisor
npm init -y
npm install --save-dev --save-exact typescript@7.0.2 @types/node@24
```

`npm init -y` cria um `package.json` básico. `npm install --save-dev` adiciona as ferramentas necessárias para desenvolver, escreve suas versões no `package.json` e gera o `package-lock.json`. `--save-exact` evita que o npm escreva o prefixo `^`: o projeto conserva exatamente o TypeScript 7.0.2 e a revisão do `@types/node` que o npm resolveu dentro da linha 24. A flag `--save-dev` expressa que o TypeScript e as declarações do Node são necessários para construir e revisar o projeto, não para executar o resultado final em produção.

Ajuste o arquivo `package.json` para declarar ESM e dar nomes úteis aos comandos do projeto:

```json
{
  "name": "revisor",
  "private": true,
  "type": "module",
  "scripts": {
    "compilar": "tsc",
    "verificar": "tsc --noEmit",
    "arrancar": "node dist/main.js"
  },
  "devDependencies": {
    "@types/node": "24.19.1",
    "typescript": "7.0.2"
  }
}
```

`"private": true` evita uma publicação acidental no registro público do npm. `"type": "module"` faz o Node interpretar os arquivos `.js` do projeto como módulos ESM. Os comandos em `"scripts"` são executados com `npm run compilar`, `npm run verificar` e `npm run arrancar`; o npm encontra automaticamente os executáveis instalados em `node_modules/.bin/`, então você não deve adicionar essa pasta ao `PATH`. A revisão exata do `@types/node` pode ser outra da linha 24 se você instalar o curso mais adiante; conserve a que a sua instalação escreveu com `--save-exact`.

Como exemplo mínimo, este programa apenas confirma que o compilador e o Node estão coordenados. A primeira linha identifica o arquivo da figura; não faz parte da sintaxe necessária para o seu projeto.

```ts
// fig01_01.ts
const nombrePrograma = "revisor";

console.log(`Hola, ${nombrePrograma}: TypeScript ya compila.`);
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig01_01.ts
$ node fig01_01.js
Hola, revisor: TypeScript ya compila.
```

Dentro do `revisor`, a mesma ideia aparece em escala maior. A dependência local permite que `npm run compilar` use o compilador combinado pelo projeto, e não uma versão global que alguém instalou meses atrás. Conserve o `package-lock.json` no Git junto com o `package.json`: o primeiro não é lixo gerado, e sim o registro preciso dos pacotes que o npm resolveu. Já o `node_modules/` é excluído com o `.gitignore`, porque pode ser reconstruído com `npm install` a partir desses dois arquivos.

Uma confusão frequente é pensar que `npx tsc` instala o TypeScript globalmente. Não é assim quando o pacote já está no projeto: o `npx` encontra primeiro o executável local. Você pode conferir qual versão está associada ao projeto com este comando:

```bash
npx tsc --version
```

Ele deve responder `Version 7.0.2`. Se responder outra versão, não continue como se nada tivesse acontecido. Confira se você está dentro de `~/proyectos/revisor`, se o `node_modules/` existe e se o `package.json` tem a dependência correta. O nome da ferramenta, `tsc`, se conserva embora sua implementação atual seja nativa; você não precisa mudar os comandos do curso por isso.

As figuras do curso também precisam do próprio contexto ESM e do próprio compilador local. Crie uma pasta irmã do projeto para experimentar sem misturar os JavaScript gerados com o `src/`:

```bash
mkdir -p ~/proyectos/figuras
cd ~/proyectos/figuras
npm init -y
npm install --save-dev --save-exact typescript@7.0.2 @types/node@24
```

Abra o `package.json` dela e acrescente `"type": "module"` (e `"private": true`) junto ao que o npm escreveu, sem apagar `devDependencies`: se você as perder, o TypeScript deixa de estar instalado. O número do `@types/node` pode ser outro da linha 24. Não coloque um `tsconfig.json` nesta pasta: as figuras de um arquivo usam suas opções explícitas com `npx tsc`. Quando alguma usar `await` no nível superior, esse `package.json` ESM evita o `TS1309`. O `npx tsc` procura primeiro o executável local de `~/proyectos/figuras/node_modules/.bin/`; não instala o TypeScript globalmente.

```json
{
  "name": "figuras",
  "private": true,
  "type": "module",
  "devDependencies": {
    "@types/node": "24.19.1",
    "typescript": "7.0.2"
  }
}
```

### Compilar, emitir e executar

O Node 24 consegue executar um `.ts` diretamente por meio do *type stripping*, a remoção da sintaxe de tipos antes de executar o JavaScript. Esse recurso está disponível sem flag desde o Node 22.18 e é estável desde o Node 24.12. Não é uma compilação: o Node substitui os tipos por espaços e não faz verificação de tipos. Por isso `node src/main.ts` pode ser útil para um script de um único arquivo, mas não demonstra que o programa esteja correto; é o `tsc` que verifica e emite a saída que o `revisor` vai executar.

A remoção de tipos só aceita sintaxe apagável. O Node não admite `.tsx`, nem construções que geram JavaScript, como `enum`, `namespace` com valores ou propriedades de parâmetro em construtores, a menos que você ative o experimental `--experimental-transform-types`. Também não lê `tsconfig.json`, `paths` nem arquivos `.ts` dentro de `node_modules`. Se você importa apenas um tipo, escreva-o com `import type` para que coincida com o que o Node consegue apagar. `erasableSyntaxOnly` é uma opção do TypeScript que avisa sobre construções que o Node não consegue apagar.

Os imports revelam por que o fluxo do curso compila os projetos antes de iniciá-los. Ao executar `.ts` diretamente, o Node exige a extensão-fonte literal: `import "./arranque.ts"` funciona; `import "./arranque.js"` procura justamente um arquivo `.js` ao lado do fonte e falha se só existir `arranque.ts`. O `revisor` usa `.js` nos imports porque esse será o caminho dos arquivos emitidos em `dist/`. Portanto, use `node arquivo.ts` apenas para um experimento de um arquivo e use `npm run compilar` seguido de `npm run arrancar` para o projeto de vários arquivos.

O `tsc` lê o programa, o verifica e emite `.js`. Essa transformação às vezes recebe o nome de transpilação porque a origem e o resultado são linguagens próximas, mas para o seu fluxo diário basta lembrar de dois verbos: verificar e compilar com o `tsc`; executar a saída com o `node`.

Observe este programa. A anotação `: string` serve para que o TypeScript revise o valor de `estado`; não se destina a chegar ao Node. Os tipos serão estudados a fundo na próxima lição. Por ora, use-a como evidência de que o compilador revisa uma camada que não faz parte do programa executável.

```ts
// fig01_02.ts
const estado: string = "entorno listo";
const serviciosPendientes = 3;

console.log(`revisor: ${estado}; ${serviciosPendientes} servicios pendientes.`);
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig01_02.ts
$ node fig01_02.js
revisor: entorno listo; 3 servicios pendientes.
```

Depois de compilar, abra `fig01_02.js`. Você verá que ele contém `const estado = "entorno listo";`, sem `: string`. O TypeScript apaga as anotações de tipos ao emitir JavaScript. É uma diferença importante em relação ao Go: o Go compila para um binário que leva instruções de máquina; o TypeScript emite JavaScript e exige que o Node, um navegador ou outro ambiente JavaScript execute esse resultado.

Isso também estabelece um limite claro. Se alguém alterar o arquivo JavaScript emitido, ou se um cliente mandar um JSON com dados falsos, as anotações TypeScript não vão aparecer durante a execução para impedi-lo. Os tipos protegem o código que você compila; não validam sozinhos o que chega da rede. Na lição sobre dados externos, o `revisor` vai validar explicitamente suas fronteiras antes de converter informação desconhecida em valores confiáveis.

Não execute os arquivos que o TypeScript deixa ao lado do fonte em um projeto real. Nas figuras isso é útil porque reduz passos, mas misturar `.ts` e `.js` em `src/` acaba confundindo qual arquivo deve ser editado e qual deve ser publicado. O `revisor` vai separar as fontes da saída: `src/` conterá o que você escreve; `dist/` conterá o que o `tsc` produz.

Dentro do projeto, o programa de inicialização pode ser deliberadamente pequeno. Ainda não declare `Servicio` nem `Estado`: esses nomes terão um modelo preciso na lição 3. Nesta etapa, o avanço correto é ter um projeto que constrói de forma repetível, e não antecipar tipos que ainda não têm regras claras.

A relação entre os comandos do projeto será sempre a mesma:

```bash
npm run compilar
npm run arrancar
```

O primeiro verifica o projeto e produz os arquivos em `dist/`. O segundo executa exatamente a saída construída. Se você editar `src/main.ts` e esquecer de compilar de novo, `npm run arrancar` executará a versão anterior de `dist/main.js`. Essa separação parece incômoda até que você depure uma falha: você sabe se está vendo o código atual ou um artefato velho.

### `tsconfig.json` e o modo estrito

Escrever todas as opções de compilação em cada comando funciona para uma figura, mas não para um projeto. O `tsconfig.json` é o contrato de compilação: identifica os arquivos-fonte, define a saída e conserva decisões que devem ser iguais para cada integrante do projeto e para a integração contínua.

Crie este `tsconfig.json` na raiz de `revisor/`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": "./src",
    "outDir": "./dist",
    "strict": true,
    "types": ["node"],
    "sourceMap": true,
    "noEmitOnError": true
  },
  "include": ["src"]
}
```

`target` declara a versão do JavaScript que o TypeScript vai emitir. `ES2022` é apropriado para o Node 24: não obriga o compilador a transformar recursos modernos em equivalentes mais longos. `module` e `moduleResolution` com `NodeNext` fazem o TypeScript seguir as regras de módulos que o Node aplica a um projeto moderno. O par importa: escolher uma resolução diferente pode permitir imports que depois o Node não conseguirá resolver.

`rootDir` e `outDir` tornam visível o limite entre o que você escreve e o que é gerado. O ponto de entrada fixo do curso, `src/main.ts`, acaba como `dist/main.js`; uma pasta `src/reporte/tabla.ts` acaba como `dist/reporte/tabla.js`. Essa correspondência fará, mais adiante, com que o backend possa publicar um diretório limpo, sem fontes nem dependências de desenvolvimento misturadas.

`strict: true` ativa uma família de verificações, entre elas `strictNullChecks`, `noImplicitAny` e verificações de inicialização e de funções. Desde o TypeScript 6, o valor padrão já é `true`; escrevê-lo torna explícita uma decisão que quem o desligar terá de mudar de propósito. Não significa “o TypeScript fica chato”; significa que o compilador deixa de supor que todo valor existe, que toda variável tem uma forma óbvia ou que um dado ambíguo é seguro. Você poderá ativar opções ainda mais exigentes no futuro, mas o `strict` é o ponto de partida inegociável do curso.

`types: ["node"]` diz ao TypeScript que carregue as declarações de tipos do Node instaladas por meio do `@types/node`, incluídas as de módulos como `node:fs/promises`. Desde o TypeScript 6, a opção `types` já não carrega por padrão todos os pacotes `@types` instalados, por isso declará-la é necessário mesmo que o `@types/node` esteja em `devDependencies`: sem ela, um import do Node pode falhar com o `TS2591`.

`noEmitOnError` impede deixar um JavaScript novo quando o projeto tem erros. Sem essa opção, é possível que o TypeScript encontre uma contradição e mesmo assim emita arquivos; depois você executa um `dist/` parcialmente atualizado e diagnostica o problema errado. Em um projeto de serviços, produzir uma saída conhecida e completa é preferível a produzir uma saída duvidosa.

`sourceMap: true` cria mapas que relacionam cada arquivo JavaScript emitido com sua fonte TypeScript. Não mudam, por si sós, o comportamento em produção. A utilidade deles aparece ao depurar: o editor pode parar na linha `.ts` que você escreveu, em vez de enviar você a uma linha de JavaScript emitido que não contém as anotações originais.

Dentro do `revisor`, o primeiro `src/main.ts` pode reutilizar o padrão da figura anterior. Copie-o para `src/main.ts`, execute `npm run compilar` e confirme que aparece `dist/main.js` junto com `dist/main.js.map`. A partir daí, você não precisa repetir flags longas: `npm run compilar` toma suas decisões a partir do `tsconfig.json`.

Há um detalhe que evita muita confusão: com o TypeScript 7.0.2, se você executa `npx tsc src/main.ts` em uma pasta que contém `tsconfig.json`, o compilador não o ignora: ele para com o `TS5112` e pede que você escolha. Para compilar um arquivo isolado, use `npx tsc --ignoreConfig src/main.ts` e informe as flags de que precisar; para compilar o projeto segundo sua configuração, use `npx tsc` sem arquivos, ou `npx tsc --project tsconfig.json`. Neste curso, `npm run compilar` equivale ao segundo caso porque o script contém apenas `tsc`.

Este projeto mínimo mostra as duas decisões. O primeiro comando falha porque se nomeou um arquivo enquanto existe um `tsconfig.json`; o segundo lê a configuração completa e o terceiro executa o JavaScript emitido.

```json fig01_05/package.json
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
```json fig01_05/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": "./src",
    "outDir": "./dist",
    "strict": true,
    "types": ["node"],
    "sourceMap": true
  },
  "include": ["src"]
}
```
```ts
// fig01_05/src/main.ts
const estado: string = "entorno listo";

console.log(`revisor: ${estado}`);
```
```bash
$ cd fig01_05
$ npx tsc src/main.ts
error TS5112: tsconfig.json is present but will not be loaded if files are specified on commandline. Use '--ignoreConfig' to skip this error.
$ npx tsc --project tsconfig.json
$ node dist/main.js
revisor: entorno listo
```

### Módulos ESM e extensões `.js`

Um módulo permite repartir o programa em arquivos que exportam valores e arquivos que os importam. O `revisor` vai precisar dessa separação: o modelo compartilhado, a lógica que consulta serviços, o servidor e o painel não devem viver em um arquivo interminável. ESM é o sistema de módulos padrão do JavaScript e é o que vamos usar daqui em diante.

A primeira surpresa é que um arquivo TypeScript importa a extensão `.js`. Não é um erro de digitação. O TypeScript vê `./arranque.js`, entende que a fonte correspondente é `arranque.ts` e emite um `import "./arranque.js"` que o Node consegue resolver ao executar dentro de `dist/`.

```ts
// fig01_03/arranque.ts
export function mensajeDeArranque(): string {
  return "revisor: entorno listo";
}
```
```ts
// fig01_03.ts
import { mensajeDeArranque } from "./fig01_03/arranque.js";

console.log(mensajeDeArranque());
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig01_03.ts
$ node fig01_03.js
revisor: entorno listo
```

O exemplo tem dois arquivos de propósito. `arranque.ts` oferece uma função com `export`; o arquivo principal a recebe por meio de `import`. Em um projeto ESM, não escreva `require`, não omita a extensão nos imports relativos e não troque `.js` por `.ts` só porque você está lendo o fonte. Essas três decisões misturam regras de épocas diferentes e costumam produzir erros que parecem problemas do compilador quando, na verdade, são regras de carregamento do Node.

Dentro do `revisor`, esse padrão permitirá uma fronteira clara. Mais adiante, `src/modelo/servicio.ts` exportará o vocabulário compartilhado; `src/revisar/` usará esse vocabulário para consultar; e o painel importará os mesmos contratos compilados ou publicados a partir de um pacote compartilhado. Hoje basta praticar a mecânica: um arquivo exporta, outro importa e o Node executa a saída `.js`.

Não use caminhos absolutos do disco como imports nem aliases inventados desde a primeira lição. Um alias como `@/modelo` pode ser cômodo em um editor, mas exige configurar ao mesmo tempo o TypeScript, o Node, os testes e o empacotador web. Os imports relativos explícitos são menos espetaculares e mais transparentes enquanto você aprende qual arquivo depende de qual.

### Editor, diagnóstico e depuração

Você pode escrever TypeScript com qualquer editor de texto, mas um editor com suporte à linguagem reduz o tempo entre cometer um erro e entendê-lo. O Visual Studio Code reconhece o `tsconfig.json`, mostra diagnósticos do TypeScript, permite ir para uma definição e depura o Node. Abra a pasta inteira do projeto, não só `src/main.ts`, para que o editor detecte o `package.json`, o `tsconfig.json` e a estrutura de módulos.

No Linux Mint 22.x, você pode baixar o pacote `.deb` para Debian/Ubuntu na [página de download do VS Code](https://code.visualstudio.com/Download) e, a partir da pasta onde o salvou, instalá-lo assim. O pacote oferece configurar o repositório da Microsoft para receber atualizações automáticas:

```bash
sudo apt install ./<archivo>.deb
code --version
```

Você também pode configurar esse repositório manualmente. A lista de arquiteturas é a que a Microsoft publica: `amd64`, `arm64` e `armhf`.

```bash
sudo apt install wget gpg
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | sudo gpg --dearmor -o /usr/share/keyrings/microsoft.gpg
sudo tee /etc/apt/sources.list.d/vscode.sources > /dev/null <<'EOF'
Types: deb
URIs: https://packages.microsoft.com/repos/code
Suites: stable
Components: main
Architectures: amd64,arm64,armhf
Signed-By: /usr/share/keyrings/microsoft.gpg
EOF
sudo apt update
sudo apt install code
code --version
```

Estes são procedimentos de instalação do sistema: leia-os e execute-os no seu Mint, não dentro do projeto. Para o LMDE, use o pacote `.deb` baixado; não presuma que as fontes de pacotes dele sejam as do Ubuntu.

```bash
cd ~/proyectos/revisor
code .
```

O terminal não precisa que o comando `code` exista para que o TypeScript funcione. Se a sua instalação do Visual Studio Code não o adicionou ao `PATH`, abra o aplicativo pelo menu e use “Abrir pasta” para selecionar `~/proyectos/revisor`. O importante é abrir a raiz do projeto, porque é lá que está o arquivo de configuração que define como os arquivos-fonte são revisados.

Configure a depuração para que primeiro compile com o script do projeto. Crie a pasta `.vscode/` e salve estes dois arquivos JSON válidos. Uma tarefa é uma instrução que o VS Code pode executar antes de iniciar o depurador.

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "compilar revisor",
      "type": "shell",
      "command": "npm",
      "args": ["run", "compilar"],
      "problemMatcher": "$tsc"
    }
  ]
}
```

Salve-o como `.vscode/tasks.json`. Agora crie `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Depurar revisor",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/dist/main.js",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "preLaunchTask": "compilar revisor",
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

`preLaunchTask` relaciona as duas configurações: antes de executar o Node, o VS Code roda `npm run compilar`; não usa uma tarefa de TypeScript instalada pelo editor, que poderia apontar para outra versão. `outFiles` indica onde estão os JavaScript e os mapas que correspondem ao TypeScript fonte.

Compile antes de depurar se quiser conferir o resultado separadamente:

```bash
npm run compilar
```

Depois abra `src/main.ts`, clique à esquerda do número de uma linha com `console.log` para colocar um ponto vermelho e pressione `F5`. Escolha a configuração «Depurar revisor». Graças a `sourceMap: true`, o depurador deve parar na linha TypeScript original. A partir daí você pode inspecionar variáveis, avançar uma linha, entrar em uma função ou continuar.

Como alternativa rápida, abra a paleta de comandos, escolha «Debug: Create JavaScript Debug Terminal» e execute `node dist/main.js` dentro desse terminal. Esse modo depura qualquer processo do Node que você iniciar ali; com os mapas de fonte ativos, os pontos de interrupção são colocados nos `.ts`. O `launch.json` é melhor quando você quer repetir a mesma inicialização com `F5`; o terminal de depuração serve para explorar um comando pontual.

Um ponto de interrupção não conserta o programa nem substitui um teste. Serve para observar o estado real logo antes de uma operação. Mais adiante será útil para parar o `revisor` antes de interpretar uma resposta HTTP e comparar o que você supunha que tinha chegado com o valor que de fato chegou. Se um valor pode ser `undefined`, não presuma que o depurador prove que ele sempre será assim só porque, em uma execução concreta, teve um valor; use-o para formular uma explicação e depois escreva uma validação ou um teste reproduzível.

O console do editor e o terminal cumprem papéis diferentes. Os diagnósticos `TSxxxx` dizem que o programa contradiz seus tipos antes de executar. O console de depuração mostra o que aconteceu em uma execução específica. Os dois são valiosos, mas respondem a perguntas diferentes. Começar pelo diagnóstico do compilador costuma poupar tempo: não faz sentido perseguir no depurador um ramo de um programa que o TypeScript já sabe que não pode ser construído corretamente.

## O erro que você vai ver

O programa a seguir tem um erro intencional. O TypeScript 7.0.2 o rejeita antes de emitir JavaScript: `limite` foi declarado como número, mas o valor escrito é texto.

```ts
// fig01_04.ts
const limite: number = "30";

console.log(limite);
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig01_04.ts
fig01_04.ts(2,7): error TS2322: Type 'string' is not assignable to type 'number'.
```

`TS2322` significa que você tentou atribuir um valor de um tipo a um lugar que exige outro. Não se resolve silenciando o compilador nem convertendo tudo em `any`. Primeiro decida qual era a intenção. Se o limite representa segundos, o valor correto pode ser `30` sem aspas. Se o dado chegou como texto de uma variável de ambiente, você terá de validá-lo e convertê-lo na fronteira; essa situação será trabalhada na lição 6.

Há outro diagnóstico comum ao iniciar um projeto ESM. Se você escreve um import relativo sem extensão:

```ts
import { mensajeDeArranque } from "./arranque";
```

com `moduleResolution: "NodeNext"`, o TypeScript 7.0.2 reporta esta mensagem:

```bash
$ npx tsc
src/main.ts(1,35): error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './arranque.js'?
```

`TS2835` não pede que você converta o arquivo-fonte em JavaScript. Pede que você escreva o caminho que o Node verá depois de compilar: `./arranque.js`. O TypeScript relacionará esse caminho com `arranque.ts` durante a compilação. O detalhe evita que o `tsc` aceite um import que o Node não saberia localizar ao executar `dist/main.js`.

Dois erros próximos expressam problemas diferentes. `TS2307` significa que o TypeScript não encontra o módulo indicado; por exemplo, se não existe `src/arranque.ts`:

```bash
$ npx tsc
src/main.ts(1,35): error TS2307: Cannot find module './arranque.js' or its corresponding type declarations.
```

`TS2305` é diferente: o arquivo existe, mas não exporta o nome solicitado. Se `arranque.ts` não exporta `mensajeDeArranque`, o import produz este diagnóstico:

```bash
$ npx tsc
src/main.ts(1,10): error TS2305: Module '"./arranque.js"' has no exported member 'mensajeDeArranque'.
```

Antes de reinstalar pacotes, verifique o que é concreto: se existe `src/arranque.ts`, se o caminho é relativo a `src/main.ts`, se o nome usa as mesmas maiúsculas e minúsculas e se o arquivo realmente exporta o símbolo que você tenta importar. O Linux distingue `Arranque.ts` de `arranque.ts`; um projeto que parecia funcionar em outro sistema pode falhar ao chegar ao Mint por essa diferença.

Por último, distinga um erro de compilação de um erro de comando. Se você digita `tsc` e o terminal responde `command not found`, não é um diagnóstico do TypeScript: o shell não encontrou um executável global. Dentro do projeto, use `npx tsc --version` ou `npm run compilar`. Assim você invoca a versão local declarada no `package.json` sem depender de uma instalação global.

## O que se faz errado

- **Instalar o TypeScript globalmente e supor que todos vão usar a mesma versão.** Um `npm install --global typescript` pode servir para experimentar, mas não define o compilador do `revisor`. A dependência local e o arquivo de bloqueio tornam o projeto reproduzível. Use `npx tsc` ou scripts do npm para construí-lo.

- **Acreditar que executar `node src/main.ts` equivale a verificar.** O Node 24 pode apagar tipos e executar um `.ts` de sintaxe apagável, mas não executa o `tsc` nem encontra os imports `.js` que o projeto reserva para `dist/`. Use esse modo só para um script isolado; no `revisor`, compile para `dist/` e execute `node dist/main.js`.

- **Misturar arquivos gerados com arquivos-fonte.** Deixar `.js`, `.map` e `.ts` juntos pode fazer você editar uma saída gerada ou executar uma versão velha. `src/` é a origem; `dist/` é o resultado. Apague e gere de novo o `dist/` se suspeitar que está desatualizado; não o edite à mão.

- **Desativar o `strict` para “avançar”.** Uma configuração permissiva não elimina a incerteza: só deixa que ela chegue mais longe. O custo é pago depois, quando uma função aceita um valor ambíguo e o erro aparece longe da causa. Corrija o diagnóstico ou entenda qual valor pode faltar; não esconda o aviso.

- **Escrever imports ESM relativos sem `.js`.** O TypeScript pode encontrar o fonte, mas o Node precisa resolver o JavaScript emitido. Com `NodeNext`, a extensão `.js` faz parte do contrato de execução. Escreva-a desde o início e você não precisará corrigir todos os imports quando o projeto crescer.

- **Usar um ponto de interrupção como prova de que o código funciona.** O depurador mostra uma execução, com alguns dados concretos. Um teste deve expressar que resultado você espera para vários casos e poder ser repetido. Use o depurador para descobrir o que acontece e os testes, que chegarão na lição 7, para impedir que uma correção se perca.

## Exercícios

### Exercício 1 — O seu ambiente medido

Instale o Node 24 LTS e crie a pasta `~/proyectos/revisor`. Inicialize o npm, instale `typescript@7.0.2` e `@types/node@24` como dependências de desenvolvimento. Confira `node --version`, `npm --version` e `npx tsc --version`. Guarde o `package-lock.json` e adicione `node_modules/` ao `.gitignore`.

### Exercício 2 — A primeira inicialização do revisor

Crie o `tsconfig.json` com a configuração estrita desta lição, incluída a opção `"types": ["node"]`. Copie o programa da figura 01.02 para `src/main.ts`, ajuste o texto para que imprima `revisor: entorno listo`, compile com `npm run compilar` e execute-o com `npm run arrancar`. Confirme que a saída está em `dist/`, não ao lado do arquivo-fonte.

### Exercício 3 — Um módulo e um diagnóstico

Separe a mensagem de inicialização em `src/arranque.ts` e faça `src/main.ts` importá-la com a extensão `.js`. Compile e execute. Depois retire temporariamente a extensão do import, execute `npm run compilar`, copie o código `TSxxxx` que aparece e corrija o import. Por último, coloque um ponto de interrupção dentro da função exportada e verifique que o depurador para no arquivo `.ts`.

## Soluções

### Solução 1

A partir da raiz do projeto, as três verificações devem identificar o Node 24, uma versão do npm e o TypeScript 7.0.2. A versão menor exata do Node pode mudar dentro da linha 24 quando você atualizar o LTS; o importante é não estar executando o Node 22, 23 ou outra linha diferente.

```bash
node --version
npm --version
npx tsc --version
```

O arquivo `.gitignore` deve incluir, no mínimo, esta linha:

```text
node_modules/
```

Não inclua o `package-lock.json` no `.gitignore`. Ele faz parte da definição reproduzível do projeto.

### Solução 2

A estrutura esperada é esta:

```text
revisor/
  package.json
  package-lock.json
  tsconfig.json
  src/
    main.ts
  dist/
    main.js
    main.js.map
```

O bloco `compilerOptions` do `tsconfig.json` deve incluir `"types": ["node"]`, para que o projeto carregue as declarações do `@types/node`. Depois de `npm run compilar`, `npm run arrancar` deve executar `dist/main.js`, não `src/main.ts`. Se `dist/` não aparecer, confira se você executou `npm run compilar` ou `npx tsc` sem nomear arquivos. Se você nomear um arquivo em uma pasta com `tsconfig.json`, o TypeScript 7 mostra o `TS5112`; para isolá-lo, use `--ignoreConfig` e as opções de que ele precisar.

### Solução 3

O import correto em `src/main.ts` leva `.js`, embora o arquivo que você escreveu se chame `arranque.ts`:

```ts
import { mensajeDeArranque } from "./arranque.js";
```

O diagnóstico esperado ao omitir a extensão é o `TS2835`. Ao restaurá-la, `npm run compilar` deve terminar sem mensagens de erro. Se o depurador parar em `dist/arranque.js` em vez de `src/arranque.ts`, confirme que `sourceMap` continua em `true`, compile de novo e inicie outra vez a sessão de depuração.

## Como sei que consegui

- [ ] `node --version` começa com `v24` e `npx tsc --version` imprime `Version 7.0.2`.
- [ ] O `package.json` declara `"type": "module"` e o TypeScript está em `devDependencies`.
- [ ] O `tsconfig.json` declara `"types": ["node"]` e `npm run verificar` termina sem diagnósticos.
- [ ] `npm run compilar` cria `dist/main.js`.
- [ ] O comando a seguir imprime exatamente a linha indicada:

```bash
$ node dist/main.js
revisor: entorno listo
```

- [ ] Um import relativo do projeto usa `.js` e `npm run compilar` não reporta o `TS2835`.
- [ ] Ao trocar um número por texto em uma variável declarada como `number`, o compilador mostra o `TS2322`.
- [ ] Um ponto de interrupção em `src/arranque.ts` para no código TypeScript ao executar a saída do Node.

## Para ler mais

- [TypeScript: o que é um `tsconfig.json`](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html) — documentação oficial sobre a raiz do projeto, os arquivos incluídos e como o compilador invoca a configuração. Consultado em 2 de outubro de 2026.

- [TypeScript: referência de opções do TSConfig](https://www.typescriptlang.org/tsconfig/) — referência oficial de `strict`, `sourceMap`, `module`, `moduleResolution` e das demais opções do compilador. Consultado em 2 de outubro de 2026.

- [Node.js: download e instalação](https://nodejs.org/en/download) — página oficial para escolher a linha LTS e o método de instalação para Linux. Consultado em 2 de outubro de 2026.

- [Visual Studio Code: transpilar TypeScript](https://code.visualstudio.com/docs/typescript/typescript-transpiling) — documentação oficial do editor sobre compilação, configuração e trabalho com TypeScript. Consultado em 2 de outubro de 2026.
