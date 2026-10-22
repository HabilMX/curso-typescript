#!/usr/bin/env bash
# verificar-url-sembrada.sh — la prueba de la URL sembrada, contra CADA revisor del curso.
#
# Por qué existe: el revisor aceptaba «http://usuario:clave@127.0.0.1:1/estado?token=SECRETO#x»
# (la configuración solo pedía que la URL no fuera texto vacío), y en la lección 7 el detalle de
# una falla copiaba el mensaje del error tal cual: con un fetch real, ese mensaje trae la URL
# completa. La regla del curso: una URL con usuario o clave se rechaza al cargar, con un mensaje
# propio que no la repite, y ningún error, bitácora ni reporte repite la URL completa.
#
# Cómo:
#   * Lección 6 (fig06_03.ts): compila el programa tal como lo documenta la lección y lo corre
#     con un fig06_03.servicios.json que trae la URL sembrada.
#   * Lecciones 7 a 9: copia herramientas/url-sembrada/sembrada.test.ts en src/ de cada revisor,
#     compila el proyecto con su tsconfig y corre la prueba con el runner de Node. Las pruebas
#     se cuentan del reporte del runner, no del código de salida.
#   * Lecciones 8 y 9, de punta a punta: arranca dist/main.js con un servicios.json sembrado.
#     Debe negarse a arrancar (código 1) y su bitácora no debe repetir ningún secreto.
#   * Ningún archivo de programas/ trae una URL con usuario o clave.
#
# Es OBLIGATORIA y FALLA CERRADO: verificar-programas.sh la llama y se pone rojo si este guion
# falta, si un revisor sale en rojo, o si corrió en menos revisores de los que el curso tiene.
# Los revisores viven en programas/, que viaja a la copia publicada (git archive): allí se
# esperan los mismos cuatro, porque ninguno está marcado export-ignore.
#
# Uso: herramientas/verificar-url-sembrada.sh   (desde cualquier carpeta; necesita npm ci en
#      herramientas/). Sale 0 si todo cuadra, 1 si algo no, 2 si no pudo medir.
set -uo pipefail
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RAIZ" || exit 2
HERR="$RAIZ/herramientas"
TSC="$HERR/node_modules/.bin/tsc"
PRUEBA="$HERR/url-sembrada/sembrada.test.ts"
ESPERADOS=4
PRUEBAS_POR_REVISOR=3
CON_CLAVE='http://usuario:clave@127.0.0.1:1/estado?token=SECRETO#x'
PUERTO="${PUERTO_URL_SEMBRADA:-18091}"

[ -f "$PRUEBA" ] || { echo "❌ falta herramientas/url-sembrada/sembrada.test.ts: la prueba de la URL sembrada es obligatoria"; exit 1; }
command -v node >/dev/null || { echo "❌ falta node"; exit 2; }
[ -x "$TSC" ] || { echo "❌ faltan las dependencias: cd herramientas && npm ci"; exit 2; }

TEMPORAL="$(mktemp -d)"
PID_REVISOR=""
limpiar() { [ -n "$PID_REVISOR" ] && kill "$PID_REVISOR" 2>/dev/null; rm -rf "$TEMPORAL"; }
trap limpiar EXIT

corridas=0; rojas=0; rojo=0
tiene_secreto() { grep -qF -e 'usuario:clave' -e 'SECRETO' -e 'token=' -e '#x' "$1"; }
falla() { echo "  ❌ $1"; rojo=1; }
sembrar() { printf '[{ "nombre": "sembrado", "url": "%s", "timeoutMs": 1000 }]\n' "$CON_CLAVE" > "$1"; }

# ─── lección 6: el programa de una sola pieza ───────────────────────────────────────────
for fuente in programas/06-*/fig06_03.ts; do
  [ -f "$fuente" ] || { echo "❌ no encontré el revisor de la lección 6 (fig06_03.ts)"; rojas=$((rojas + 1)); continue; }
  echo "lección 6 ($fuente)"
  trabajo="$TEMPORAL/06"; mkdir -p "$trabajo"; rojo=0
  printf '{"type":"module"}\n' > "$trabajo/package.json"
  ln -s "$HERR/node_modules" "$trabajo/node_modules"
  cp "$fuente" "$trabajo/"
  sembrar "$trabajo/fig06_03.servicios.json"
  if ! ( cd "$trabajo" && "$TSC" --strict --target ES2022 --module nodenext --types node \
           --skipLibCheck --pretty false fig06_03.ts ) >"$trabajo/tsc.log" 2>&1; then
    echo "  ❌ no compiló"; head -10 "$trabajo/tsc.log"; rojas=$((rojas + 1)); continue
  fi
  corridas=$((corridas + 1))
  ( cd "$trabajo" && node fig06_03.js ) >"$trabajo/salida" 2>&1
  echo "  salida: $(cat "$trabajo/salida")"
  grep -q '^configuración inválida: ' "$trabajo/salida" || falla "aceptó la URL con usuario y clave"
  tiene_secreto "$trabajo/salida" && falla "la salida repite un secreto"
  [ "$rojo" -eq 0 ] || rojas=$((rojas + 1))
done

# ─── lecciones 7 a 9: los proyectos ─────────────────────────────────────────────────────
for revisor in programas/07-*/fig07_04 programas/08-*/fig08_05 programas/09-*/fig09_05; do
  [ -d "$revisor" ] || { echo "❌ no encontré el revisor $revisor"; rojas=$((rojas + 1)); continue; }
  leccion=$((10#$(basename "$(dirname "$revisor")" | cut -c1-2)))
  echo "lección $leccion ($revisor)"
  trabajo="$TEMPORAL/$leccion"; mkdir -p "$trabajo"; rojo=0
  cp -R "$revisor/." "$trabajo/"
  rm -rf "$trabajo/node_modules" "$trabajo/dist"
  ln -s "$HERR/node_modules" "$trabajo/node_modules"
  cp "$PRUEBA" "$trabajo/src/"
  if ! ( cd "$trabajo" && "$TSC" -p . --skipLibCheck --pretty false ) >"$trabajo/tsc.log" 2>&1; then
    echo "  ❌ no compiló"; head -10 "$trabajo/tsc.log"; rojas=$((rojas + 1)); continue
  fi
  corridas=$((corridas + 1))
  ( cd "$trabajo" && node --test dist/sembrada.test.js ) >"$trabajo/prueba.log" 2>&1
  pasan=$(sed -n 's/^ℹ pass \([0-9]*\)$/\1/p' "$trabajo/prueba.log")
  fallan=$(sed -n 's/^ℹ fail \([0-9]*\)$/\1/p' "$trabajo/prueba.log")
  echo "  runner: pasan ${pasan:-?} · fallan ${fallan:-?} (de $PRUEBAS_POR_REVISOR)"
  if [ "${pasan:-0}" != "$PRUEBAS_POR_REVISOR" ] || [ "${fallan:-1}" != "0" ]; then
    grep -E '^(✖|not ok)|repite|aceptó' "$trabajo/prueba.log" | head -6 | sed 's/^/        /'
    falla "la prueba de la URL sembrada no pasó completa"
  fi

  if [ "$leccion" -ge 8 ]; then
    # de punta a punta: el revisor debe negarse a arrancar con la URL sembrada
    sembrar "$trabajo/servicios.json"
    ( cd "$trabajo" && PUERTO="$PUERTO" exec node dist/main.js ) >"$trabajo/main.log" 2>&1 &
    PID_REVISOR=$!
    for _ in $(seq 1 50); do kill -0 "$PID_REVISOR" 2>/dev/null || break; sleep 0.1; done
    if kill -0 "$PID_REVISOR" 2>/dev/null; then
      kill "$PID_REVISOR" 2>/dev/null; wait "$PID_REVISOR" 2>/dev/null
      falla "arrancó con una URL con usuario y clave"
    else
      wait "$PID_REVISOR"; rc=$?
      [ "$rc" -eq 1 ] || falla "con la URL sembrada salió con $rc, y debía ser 1"
    fi
    PID_REVISOR=""
    echo "  de punta a punta: $(head -1 "$trabajo/main.log")"
    grep -q '"configuracion-invalida"' "$trabajo/main.log" || falla "la bitácora no registra la configuración inválida"
    tiene_secreto "$trabajo/main.log" && falla "la bitácora repite un secreto"
  fi
  [ "$rojo" -eq 0 ] || rojas=$((rojas + 1))
done

# ─── ningún programa publicado trae una URL con usuario o clave ─────────────────────────
echo "programas/ (URLs con usuario o clave escritas en el código o en los datos)"
if grep -rInE '[a-z][a-z0-9+.-]*://[^/[:space:]"'"'"'@]+@' programas >"$TEMPORAL/urls" 2>/dev/null; then
  sed 's/^/  ❌ /' "$TEMPORAL/urls" | head -5
  rojas=$((rojas + 1))
fi

echo
if [ "$corridas" -ne "$ESPERADOS" ]; then
  echo "❌ URL sembrada: corrí la prueba en $corridas revisores, y el curso tiene $ESPERADOS"
  exit 1
fi
if [ "$rojas" -ne 0 ]; then
  echo "❌ URL sembrada: $rojas comprobación(es) en rojo: un revisor acepta una URL con usuario o clave, o repite sus secretos"
  exit 1
fi
echo "✅ URL sembrada: $corridas de $corridas revisores la rechazan al cargar y no repiten sus secretos"
