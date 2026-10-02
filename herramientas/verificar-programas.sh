#!/usr/bin/env bash
# Compila con tsc estricto y ejecuta con node CADA programa de las lecciones, y
# compara su salida real contra la que la lección documenta.
#
# Por qué existe: el curso promete que «cada programa se compila y se ejecuta
# antes de publicarse». Una promesa verificable que nadie verifica es peor que
# no prometer nada.
#
# Uso:  herramientas/verificar-programas.sh [carpeta]       (por omisión: es)
#       herramientas/verificar-programas.sh es --mostrar    (imprime la salida real de cada uno)
#       herramientas/verificar-programas.sh es --exportar DIR
#           no corre nada: deja en DIR/<leccion>/ cada archivo de cada programa,
#           su salida documentada (figNN_NN.salida.txt) y un package.json de
#           módulos ESM. Lo usa generar-programas.sh para armar programas/.
#
# Un error de compilación se compara COMPLETO (ubicación, código y mensaje), no solo
# la posición y el TSxxxx: un mensaje documentado distinto del real es un defecto.
#
# Requisitos: node (LTS) y las dependencias de herramientas/package.json
# (cd herramientas && npm ci). Sale 0 si todo cuadra, 1 si algo no, 2 si no pudo medir.
#
# CONVENCIÓN DE LAS LECCIONES (la lee este guion):
#   * Un archivo de un programa es un bloque ```ts (o ```tsx) cuya PRIMERA línea
#     es un comentario con su ruta:  // fig05_03.ts   o   // fig07_02/modelo.ts
#   * El archivo principal es el que no lleva carpeta (fig05_03.ts); los demás
#     (fig07_02/modelo.ts) los alcanza el principal con sus `import`.
#   * Un archivo de datos lleva su ruta en la cabecera del bloque:  ```json fig06_01.servicios.json
#   * Tras el principal, el siguiente bloque ```bash documenta la corrida:
#         $ tsc --strict --target ES2022 --module nodenext fig05_03.ts
#         $ node fig05_03.js
#         <salida real>
#     Si el programa NO compila a propósito, el bloque trae solo la línea $ tsc y
#     debajo los mensajes reales de tsc (sin $ node).
#   * Todo es ESM («type»: «module»); los import relativos llevan extensión .js.
#   * Un bloque de código sin esa primera línea es un fragmento: no se verifica.
set -uo pipefail
cd "$(dirname "$0")/.."
IDI="${1:-es}"
MODO="${2:-}"
EXPORTAR=""
if [ "$MODO" = "--exportar" ]; then EXPORTAR="${3:?falta el directorio de destino}"; fi
HERR="$PWD/herramientas"

command -v node >/dev/null || { echo "falta node"; exit 2; }
[ -x "$HERR/node_modules/.bin/tsc" ] || { echo "faltan las dependencias: cd herramientas && npm ci"; exit 2; }
TRABAJO=$(mktemp -d); trap 'rm -rf "$TRABAJO"' EXIT
echo "node: $(node -v) · tsc: $("$HERR/node_modules/.bin/tsc" -v)"
echo

python3 - "$IDI" "$TRABAJO" "$HERR" "$MODO" "$EXPORTAR" <<'PY'
import glob, json, os, re, shutil, subprocess, sys

idi, trabajo, herr, modo, exportar = sys.argv[1:6]
TSC = os.path.join(herr, "node_modules", ".bin", "tsc")
# Se ejecuta el comando $ tsc TAL COMO lo documenta la lección (si una lección
# omite una bandera necesaria, como --types node, aquí falla igual que le
# fallaría a quien la copia). Solo se agregan banderas que no cambian el
# resultado: salida sin color y sin revisar los .d.ts de las dependencias.
DEFECTO = ["--strict", "--target", "ES2022", "--module", "nodenext"]
def orden_tsc(p):
    args = list(p["tsc"]) if p["tsc"] else DEFECTO + [p["archivo"]]
    if "--pretty" not in args:
        args += ["--pretty", "false"]
    if "--jsx" not in args and p["archivo"].endswith(".tsx"):
        args += ["--jsx", "react-jsx"]
    return [TSC, *args]

CABECERA = re.compile(r'^//\s*(fig\d\d_\d\d\S*\.tsx?)\s*$')
VALLA = re.compile(r'^```(\S*)[ \t]*(.*)$')

def bloques(texto):
    """Devuelve [(lenguaje, resto_de_la_cabecera, [lineas])] de los bloques cercados."""
    res, actual = [], None
    for l in texto.split("\n"):
        m = VALLA.match(l)
        if actual is None:
            if m:
                actual = (m.group(1), m.group(2).strip(), [])
        elif l.startswith("```"):
            res.append(actual); actual = None
        else:
            actual[2].append(l)
    return res

def normalizar(s):
    s = s.replace("\r", "")
    s = re.sub(r'duration_ms[ :]+[0-9.]+', 'duration_ms <ms>', s)
    s = re.sub(r'\((?:[0-9.]+)ms\)', '(<ms>)', s)
    s = re.sub(r'(?:file://)?/[^\s:()\'"]*/(fig\d\d_\d\d[^\s:()\'"]*)', r'\1', s)
    out = []
    for l in s.split("\n"):
        if re.match(r'^\s+at ', l) or l.startswith("Node.js v"):
            continue
        out.append(l.rstrip())
    return "\n".join(out).strip()

programas = []   # dicts: fig, leccion, carpeta, esperado, error_compilacion, problemas
for ruta in sorted(glob.glob(os.path.join(idi, "[0-9][0-9]-*.md"))):
    leccion = os.path.basename(ruta)[:-3]
    bl = bloques(open(ruta, encoding="utf8").read())
    carpeta = os.path.join(trabajo, leccion)
    os.makedirs(carpeta, exist_ok=True)
    json.dump({"type": "module"}, open(os.path.join(carpeta, "package.json"), "w"))
    os.symlink(os.path.join(herr, "node_modules"), os.path.join(carpeta, "node_modules"))
    i = 0
    while i < len(bl):
        leng, resto, lineas = bl[i]
        # archivo de datos: la ruta va en la cabecera del bloque
        md = re.match(r'^(fig\d\d_\d\d\S*)$', resto)
        if md and leng not in ("ts", "tsx", "bash"):
            dest = os.path.join(carpeta, md.group(1))
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            open(dest, "w", encoding="utf8").write("\n".join(lineas) + "\n")
            i += 1; continue
        if leng in ("ts", "tsx") and lineas:
            mh = CABECERA.match(lineas[0].strip())
            if mh:
                rel = mh.group(1)
                dest = os.path.join(carpeta, rel)
                os.makedirs(os.path.dirname(dest), exist_ok=True)
                open(dest, "w", encoding="utf8").write("\n".join(lineas) + "\n")
                if "/" not in rel:
                    p = {"fig": re.sub(r'\.tsx?$', '', rel), "archivo": rel, "leccion": leccion,
                         "carpeta": carpeta, "esperado": None, "cmd": None, "compila": None, "tsc": None,
                         "tsc_a_secas": False, "proyecto": False}
                    # la corrida documentada: el siguiente bloque bash, antes del siguiente archivo de programa
                    j = i + 1
                    while j < len(bl):
                        l2, r2, ls2 = bl[j]
                        if l2 in ("ts", "tsx") and ls2 and CABECERA.match(ls2[0].strip()):
                            break
                        if l2 == "bash" and any(x.startswith("$ ") for x in ls2):
                            cmds = [x for x in ls2 if x.startswith("$ ")]
                            node = [x for x in cmds if x.startswith("$ node ")]
                            p["cmd"] = node[0][2:].split() if node else None
                            tscs = [x for x in cmds if x.startswith("$ npx tsc ")]
                            p["tsc"] = tscs[0][10:].split() if tscs else None
                            # `tsc` a secas NO es reproducible: quien sigue la lección no tiene un tsc global.
                            p["tsc_a_secas"] = any(x.startswith("$ tsc ") for x in cmds)
                            primera = max(k for k, x in enumerate(ls2) if x.startswith("$ "))
                            p["esperado"] = "\n".join(ls2[primera + 1:])
                            p["compila"] = bool(node)
                            break
                        j += 1
                    programas.append(p)
        i += 1
    # PROYECTOS: una figura cuyos archivos viven todos en carpeta (fig09_05/src/main.ts…)
    # y no tiene archivo principal suelto. Su bloque ```bash es una TRANSCRIPCIÓN: cada
    # línea «$ comando» seguida de su salida real. Se ejecuta comando por comando.
    ids_con_principal = {p["fig"] for p in programas if p["leccion"] == leccion}
    ultimo = {}
    for k, (leng, resto, lineas) in enumerate(bl):
        if leng in ("ts", "tsx", "json", "js", "text", "") and lineas is not None:
            ref = None
            if leng in ("ts", "tsx") and lineas and CABECERA.match(lineas[0].strip()):
                ref = CABECERA.match(lineas[0].strip()).group(1)
            elif re.match(r'^fig\d\d_\d\d/\S+$', resto):
                ref = resto
            if ref and "/" in ref:
                ultimo[ref.split("/")[0]] = k
    for fid, k in sorted(ultimo.items()):
        if fid in ids_con_principal:
            continue
        p = {"fig": fid, "archivo": fid, "leccion": leccion, "carpeta": carpeta, "esperado": None,
             "cmd": None, "compila": True, "tsc": None, "tsc_a_secas": False, "proyecto": True}
        for l2, r2, ls2 in bl[k + 1:]:
            if l2 == "bash" and any(x.startswith("$ ") for x in ls2):
                p["esperado"] = "\n".join(ls2); p["transcripcion"] = [x[2:] for x in ls2 if x.startswith("$ ")]
                break
        programas.append(p)

if not programas:
    print("  las lecciones no traen ningún programa verificable"); sys.exit(2)

if modo == "--exportar":
    for p in programas:
        destino = os.path.join(exportar, p["leccion"])
        os.makedirs(destino, exist_ok=True)
    for lec in sorted({p["leccion"] for p in programas}):
        src = os.path.join(trabajo, lec); dst = os.path.join(exportar, lec)
        for raiz, dirs, archivos in os.walk(src):
            dirs[:] = [d for d in dirs if d not in ("node_modules", "dist")]
            for f in archivos:
                a = os.path.join(raiz, f); r = os.path.relpath(a, src)
                os.makedirs(os.path.dirname(os.path.join(dst, r)), exist_ok=True)
                shutil.copyfile(a, os.path.join(dst, r))
    for p in programas:
        if p["esperado"] is not None:
            # los programas que a propósito no compilan dejan .error-esperado.txt
            ext = ".salida.txt" if (p["cmd"] or p["proyecto"]) else ".error-esperado.txt"
            open(os.path.join(exportar, p["leccion"], p["fig"] + ext), "w", encoding="utf8").write(p["esperado"].strip("\n") + "\n")
    sys.exit(0)

PERMITIDOS = ("npx tsc ", "npm run ", "npm test", "node ", "npx eslint ", "npx prettier ", "cd ")

def correr_proyecto(p):
    """Ejecuta la transcripción de un proyecto y devuelve el texto que un lector vería."""
    cwd = p["carpeta"]; salida = []
    for cmd in p["transcripcion"]:
        if not cmd.startswith(PERMITIDOS):
            return f"<<COMANDO NO VERIFICABLE: {cmd}>>"
        salida.append("$ " + cmd)
        if cmd.startswith("cd "):
            cwd = os.path.join(cwd, cmd[3:].strip()); continue
        args = cmd.split()
        if args[:2] == ["npx", "tsc"]:
            args = [TSC] + args[2:] + ["--pretty", "false"]
        elif args[0] == "npx":
            args = [os.path.join(herr, "node_modules", ".bin", args[1])] + args[2:]
        env = dict(os.environ, PATH=os.path.join(herr, "node_modules", ".bin") + os.pathsep + os.environ["PATH"], FORCE_COLOR="0", NO_COLOR="1")
        try:
            r = subprocess.run(args, cwd=cwd, capture_output=True, text=True, timeout=120, env=env)
            out = (r.stdout + r.stderr).strip("\n")
        except subprocess.TimeoutExpired:
            out = "<<TIEMPO AGOTADO>>"
        except FileNotFoundError as e:
            out = f"<<NO SE PUDO EJECUTAR: {e}>>"
        if out: salida.append(out)
    return "\n".join(salida)

total = ok = malos = sin_salida = 0
for p in programas:
    total += 1
    f = p["fig"]
    if p["proyecto"]:
        if p["esperado"] is None:
            print(f"  {f:<12} {p['leccion']:<34} SIN SALIDA DOCUMENTADA"); sin_salida += 1; continue
        real = correr_proyecto(p)
        if modo == "--mostrar":
            print(f"---- {f} ({p['leccion']}) ----\n{real}\n"); continue
        a, b = normalizar(p["esperado"]), normalizar(real)
        if a == b:
            print(f"  {f:<12} {p['leccion']:<34} ok (proyecto)"); ok += 1
        else:
            import difflib
            print(f"  {f:<12} {p['leccion']:<34} NO COINCIDE")
            for d in list(difflib.unified_diff(a.split("\n"), b.split("\n"), "documentado", "real", lineterm="", n=0))[:14]:
                print("        " + d)
            malos += 1
        continue
    if p["tsc_a_secas"]:
        print(f"  {f:<12} {p['leccion']:<34} NO COINCIDE: la lección documenta «$ tsc» a secas; debe ser «$ npx tsc» (no hay tsc global)"); malos += 1; continue
    c = subprocess.run(orden_tsc(p) + ["--skipLibCheck"], cwd=p["carpeta"], capture_output=True, text=True)
    compilo = c.returncode == 0
    if p["esperado"] is None:
        print(f"  {f:<12} {p['leccion']:<34} SIN SALIDA DOCUMENTADA"); sin_salida += 1; continue
    if compilo:
        if not p["cmd"]:
            print(f"  {f:<12} {p['leccion']:<34} NO COINCIDE: compila, pero la lección documenta un error de compilación"); malos += 1; continue
        try:
            r = subprocess.run(["node", *p["cmd"][1:]], cwd=p["carpeta"], capture_output=True, text=True, timeout=30)
            real = r.stdout + r.stderr
        except subprocess.TimeoutExpired:
            real = "<<TIEMPO AGOTADO>>"
    else:
        if p["cmd"]:
            print(f"  {f:<12} {p['leccion']:<34} NO COMPILA y la lección dice que corre"); print("        " + (c.stdout + c.stderr).strip().replace("\n", "\n        ")[:600]); malos += 1; continue
        real = c.stdout + c.stderr
    if modo == "--mostrar":
        print(f"---- {f} ({p['leccion']}) ----\n{real}\n"); continue
    a, b = normalizar(p["esperado"]), normalizar(real)
    if not compilo and not re.search(r'^\S+\(\d+,\d+\): error TS\d+: ', a, re.M):
        print(f"  {f:<12} {p['leccion']:<34} NO COINCIDE: la lección no documenta ningún error TSxxxx"); malos += 1; continue
    if a == b:
        print(f"  {f:<12} {p['leccion']:<34} ok"); ok += 1
    else:
        print(f"  {f:<12} {p['leccion']:<34} NO COINCIDE")
        import difflib
        for d in list(difflib.unified_diff(a.split("\n"), b.split("\n"), "documentado", "real", lineterm="", n=0))[:14]:
            print("        " + d)
        malos += 1

if modo == "--mostrar": sys.exit(0)
print()
print(f"  programas: {total} · coinciden: {ok} · NO coinciden: {malos} · sin salida documentada: {sin_salida}")
if malos:
    print("  Hay salidas documentadas que no corresponden. NO publicar."); sys.exit(1)
# Falla cerrado: un programa sin salida documentada NO es un programa verificado.
if sin_salida:
    print(f"  {sin_salida} programa(s) sin salida documentada. NO publicar."); sys.exit(1)
print("  Todas las salidas documentadas corresponden a la ejecución real.")
PY
