# Curso de TypeScript — do zero a um programa que se sustenta

**Por Dorian Chávez, fundador da Hábil e arquiteto de integração.**

**Para quem é:** quem já fez o curso de Go desta casa, ou quem programa em JavaScript e quer parar de descobrir os erros em produção. Não se supõe experiência prévia com tipos: cada conceito é explicado quando aparece, e se explica por que ele existe, não só como se escreve.

**O que você vai saber ao terminar:** escrever um programa completo com tipos, entender o que escreveu e conseguir explicá-lo a outra pessoa.

**O que você precisa antes de começar:** um computador com Linux Mint e saber abrir um terminal. A [Lição 1](01-instalacion.md) instala tudo do zero.

## O projeto que você vai construir

O **`revisor`**: uma API que consulta uma lista de serviços **ao mesmo tempo** e um painel web que mostra o relatório, com os tipos compartilhados entre os dois. É o mesmo problema do curso de Go, resolvido agora em TypeScript.

## As dez lições

| Lição | | O que você constrói | O que você aprende |
|---|---|---|---|
| 0 | [O que é TypeScript e o que NÃO é](00-que-es-typescript.md) | nada ainda (leitura) | JS vs TS; os tipos são apagados na execução; o que protege e o que não; por que `strict` |
| 1 | [Instalar o TypeScript no seu Linux Mint](01-instalacion.md) | o ambiente e o seu primeiro programa | Node LTS, `tsc`, editor, `tsconfig` estrito, executar e depurar |
| 2 | [Tipos, funções e inferência](02-tipos-funciones-inferencia.md) | as funções base do `revisor` | primitivos, inferência, uniões e literais, *narrowing*, `null` e `undefined` |
| 3 | [Objetos e o modelo de dados](03-objetos-modelo-datos.md) | o modelo `Servicio` / `Estado` | `type` vs `interface`, tipagem estrutural, `readonly`, uniões discriminadas |
| 4 | [Coleções, genéricos e erros](04-colecciones-genericos-errores.md) | a lista de serviços e o relatório | arrays, `Map`/`Set`, genéricos, tipos utilitários, erros |
| 5 | [Assincronia: que revise tudo ao mesmo tempo](05-asincronia.md) | o `revisor` concorrente | *event loop*, promises, `async/await`, `Promise.all` vs `allSettled`, `AbortController` |
| 6 | [Dados que chegam de fora](06-datos-de-fuera.md) | validação de configuração e respostas | validar na fronteira; tipos derivados do esquema |
| 7 | [Módulos, testes e qualidade](07-modulos-pruebas-calidad.md) | o projeto de verdade, com testes | módulos ESM, testes com tabela de casos, lint e formatação |
| 8 | [O servidor](08-el-servidor.md) | a API HTTP do `revisor` | servidor HTTP, rotas tipadas, JSON, configuração, encerramento ordenado |
| 9 | [A tela e o programa terminado](09-la-pantalla.md) | o painel web e o pacote final | React com TypeScript e hooks, tipos compartilhados, XSS, compilar e publicar |

Ao final de cada lição há exercícios com as suas soluções. E o [diário de bordo](bitacora.md) é seu: anote ali o que te custou.
