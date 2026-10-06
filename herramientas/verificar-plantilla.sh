#!/usr/bin/env bash
# Comprueba que cada lección cumpla la plantilla de 8 partes del README y las
# reglas de forma: título «Lección N — …» con el número de su archivo, sin
# emojis en los títulos, sin marcas PENDIENTE, sin mencionar asistentes automáticos, con las
# secciones en orden, y con el número de objetivos, ejercicios y fuentes pedido.
#
# Uso:  herramientas/verificar-plantilla.sh [carpeta]     (por omisión: es)
# Sale 0 si todas cumplen, 1 si alguna no, 2 si no pudo medir.
set -uo pipefail
cd "$(dirname "$0")/.."
DIR="${1:-es}"
[ -d "$DIR" ] || { echo "no existe la carpeta $DIR"; exit 2; }

python3 - "$DIR" <<'PY'
import glob, os, re, sys

# Títulos fijos de la plantilla por idioma (los mismos de glosario-traducciones.md §3).
# El orden de las 9 secciones es el de la plantilla; el verificador mide la carpeta
# que se le pasa con los títulos de SU idioma.
IDIOMAS = {
  "es": ("Lección", "Tiempo", ["Al terminar vas a poder", "El porqué antes del cómo", "Los conceptos",
         "El error que vas a ver", "Lo que se hace mal", "Ejercicios", "Soluciones",
         "Cómo sé que lo logré", "Para leer más"], r"(?:Ejercicio )?\d+"),
  "en": ("Lesson", "Time", ["By the end you will be able to", "The why before the how", "The concepts",
         "The error you will see", "What gets done wrong", "Exercises", "Solutions",
         "How I know I got it", "Further reading"], r"(?:Exercise )?\d+"),
  "fr": ("Leçon", r"Durée ?", ["À la fin, tu seras capable de", "Le pourquoi avant le comment", "Les concepts",
         "L'erreur que tu vas voir", "Ce qui se fait de travers", "Exercices", "Solutions",
         "Comment savoir que j'ai réussi", "Pour aller plus loin"], r"(?:Exercice )?\d+"),
  "pt": ("Lição", "Tempo", ["Ao terminar, você vai conseguir", "O porquê antes do como", "Os conceitos",
         "O erro que você vai ver", "O que se faz errado", "Exercícios", "Soluções",
         "Como sei que consegui", "Para ler mais"], r"(?:Exercício )?\d+"),
  "bg": ("Урок", "Време", ["След урока ще можеш да", "Защо, преди как", "Понятията",
         "Грешката, която ще видиш", "Какво се прави погрешно", "Упражнения", "Решения",
         "Как разбирам, че съм успял", "За допълнително четене"], r"(?:Упражнение )?\d+"),
}
_ID = os.path.basename(os.path.normpath(sys.argv[1]))
if _ID not in IDIOMAS:
    print(f"idioma sin tabla de títulos: {_ID}"); sys.exit(2)
LECCION, TIEMPO, SECCIONES, EJER = IDIOMAS[_ID]
EMOJI = re.compile("[\U0001F000-\U0001FAFF☀-➿⬀-⯿️‍]")
# Los patrones de asistentes automáticos y sus empresas se LEEN de .publicable-prohibido.txt
# (su último bloque), para que haya una sola lista y las dos puertas no se
# desincronicen. Si el bloque falta o queda vacío, el guion falla cerrado.
def patrones_ia():
    lista = os.path.join(os.path.dirname(os.path.abspath(sys.argv[1])), ".publicable-prohibido.txt")
    if not os.path.isfile(lista):
        lista = ".publicable-prohibido.txt"
    pats, activo = [], False
    for l in open(lista, encoding="utf8").read().split("\n"):
        if l.startswith("# --- el curso no habla"):
            activo = True; continue
        if activo and l.strip() and not l.startswith("#"):
            pats.append(l.strip())
    if not pats:
        print("el bloque de asistentes de .publicable-prohibido.txt falta o está vacío"); sys.exit(2)
    return re.compile("|".join(f"(?:{p})" for p in pats))
ASISTENTES = patrones_ia()
PEND = re.compile(r"PENDIENTE|ESQUELETO|TODO:|FIXME")

archivos = sorted(f for f in glob.glob(os.path.join(sys.argv[1], "*.md")) if os.path.basename(f)[:1].isdigit())
if not archivos:
    print("no hay lecciones"); sys.exit(2)

def secciones(lineas):
    """{titulo_h2: [lineas]} respetando los bloques de código."""
    res, cur, dentro = {}, None, False
    for l in lineas:
        if l.strip().startswith("```"):
            dentro = not dentro
        if not dentro and l.startswith("## "):
            cur = l[3:].strip(); res[cur] = []; continue
        if cur is not None:
            res[cur].append(l)
    return res

def fuera_de_codigo(lineas):
    dentro = False
    for l in lineas:
        if l.strip().startswith("```"):
            dentro = not dentro; continue
        if not dentro:
            yield l

malas = 0
for f in archivos:
    nombre = os.path.basename(f); num = int(nombre[:2])
    lineas = open(f, encoding="utf8").read().split("\n")
    prob = []
    if lineas[0].count("`") or not re.match(rf"^# {LECCION} {num} — \S", lineas[0]):
        prob.append(f"el título no es «# {LECCION} {num} — …»: {lineas[0][:60]!r}")
    for l in fuera_de_codigo(lineas):
        if l.startswith("#") and EMOJI.search(l):
            prob.append(f"emoji en un título: {l[:60]!r}")
    txt = "\n".join(lineas)
    if PEND.search(txt): prob.append("quedan marcas PENDIENTE/ESQUELETO/TODO")
    ia = ASISTENTES.search(txt)
    if ia: prob.append(f"menciona un asistente o su empresa: {ia.group(0)!r}")
    if sum(1 for l in lineas if l.strip().startswith("```")) % 2: prob.append("vallas de código desbalanceadas")
    if not re.search(rf"^\*\*{TIEMPO}\s?:?\*\*", txt, re.M): prob.append("falta la línea de duración («**{TIEMPO}:**»)")
    sec = secciones(lineas)
    claves = list(sec)
    pos = []
    for s in SECCIONES:
        if s not in sec: prob.append(f"falta la sección «{s}»")
        else: pos.append(claves.index(s))
    if pos != sorted(pos): prob.append("las secciones no están en el orden de la plantilla")
    if SECCIONES[0] in sec:
        n = sum(1 for l in sec[SECCIONES[0]] if re.match(r"^\s*[-*]\s", l))
        if not 3 <= n <= 7: prob.append(f"objetivos: {n} (se piden 3 a 7)")
    if SECCIONES[5] in sec:
        n = len(re.findall(rf"^### {EJER}", "\n".join(fuera_de_codigo(sec[SECCIONES[5]])), re.M))
        if not 2 <= n <= 4: prob.append(f"ejercicios: {n} (se piden 2 a 4)")
    if SECCIONES[8] in sec:
        urls = [l for l in sec[SECCIONES[8]] if re.match(r"^\s*[-*]\s", l) and "http" in l
                and not re.search(r"\]\(https://www\.[^)/]+/(es|en|fr|pt|bg)/blog/", l)]  # el artículo propio de la casa no es fuente externa
        if not 2 <= len(urls) <= 4: prob.append(f"fuentes con URL: {len(urls)} (se piden 2 a 4)")
    print(f"  {nombre:<40}{'ok' if not prob else 'FALLA'}")
    for p in prob: print(f"      - {p}")
    malas += bool(prob)
print()
if malas:
    print(f"  {malas} lección(es) no cumplen la plantilla."); sys.exit(1)
print("  Todas cumplen la plantilla.")
PY
