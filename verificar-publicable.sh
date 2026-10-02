#!/usr/bin/env bash
# Comprueba que el material no lleve referencias internas antes de publicarlo.
#
# Por qué existe: este curso es PÚBLICO. Una ruta interna, un nombre de host o
# un token en un ejemplo quedan indexados por los buscadores y ya no se pueden
# retirar.
#
# Uso:  ./verificar-publicable.sh          → sale 0 si está limpio, 1 si no (revisa todo archivo de texto)
#       ./verificar-publicable.sh --probar → solo la autoprueba
#
# 🔴 ESTE GUION ES UNA PUERTA, y una puerta que no puede demostrar que detecta
# no es una puerta: es un adorno que dice "limpio". Por eso trae AUTOPRUEBA
# (siembra un patrón en una copia temporal y exige que lo cache) y por eso
# FALLA CERRADO: si la búsqueda no se pudo hacer, el resultado es rojo, no verde.
set -uo pipefail
cd "$(dirname "$0")"
LISTA=.publicable-prohibido.txt

# Se revisa TODO archivo de texto del repositorio, sin importar su extensión ni
# su carpeta: las lecciones (.md), pero también lo que se copia y se ejecuta
# (programas/*.ts, .txt, .json), el README de la raíz, la licencia, los guiones
# y el workflow. Una lista de extensiones o de carpetas escrita a mano deja
# huecos justo donde nadie mira. Solo se excluye lo que no es contenido del
# curso: .git, node_modules, las dependencias instaladas y la propia lista de
# patrones (que, por definición, los contiene).
#
# 🔴 grep -I ignora los archivos binarios, así que un PNG no produce falsos
# positivos; un archivo de texto con cualquier extensión sí se revisa.

# Busca UN patrón bajo la raíz dada ("." por omisión).
#   Devuelve 0 = sin coincidencias · 1 = hay coincidencias · 2 = no se pudo buscar
#
# 🔴 El "--" va DESPUÉS de las banderas y ANTES del patrón. Si se pone antes de
# "--exclude", grep deja de leerlo como bandera y lo trata como una RUTA que no
# existe: entonces sale con código 2 SIEMPRE —incluso habiendo encontrado
# coincidencias— y quien mire solo el código de salida lee "limpio".
buscar() {
  local patron="$1" raiz="${2:-.}"
  local salida rc
  salida=$(grep -rnIE --exclude-dir=.git --exclude-dir=node_modules \
             --exclude="$LISTA" -- "$patron" "$raiz" 2>&1); rc=$?
  case "$rc" in
    0) printf '%s\n' "$salida"; return 1 ;;
    1) return 0 ;;
    *) printf '%s\n' "$salida" >&2; return 2 ;;
  esac
}

# --- autoprueba: sin esto, un "limpio" no vale nada ---
# Siembra el patrón, uno por uno, en archivos de TODOS los tipos y lugares que
# el curso trae (no solo .md) y exige que cada uno se detecte.
autoprueba() {
  local tmp patron='TOKEN_DE_AUTOPRUEBA_NO_BORRAR' rc=0 f
  tmp=$(mktemp -d) || return 1
  mkdir -p "$tmp/es" "$tmp/programas/01" "$tmp/herramientas" "$tmp/otro"
  for f in es/leccion.md programas/01/fig.ts programas/01/fig.salida.txt \
           programas/01/package.json README.md herramientas/guion.sh otro/sin-extension; do
    printf '%s\n' "$patron" > "$tmp/$f"
    ( cd "$tmp" && buscar "$patron" . >/dev/null 2>&1 ); [ "$?" -eq 1 ] || rc=1
    rm -f "$tmp/$f"
  done
  # y el negativo: un patrón que no está NO debe dar positivo
  printf 'texto limpio\n' > "$tmp/es/leccion.md"
  ( cd "$tmp" && buscar 'PATRON_QUE_NO_EXISTE_EN_NINGUN_LADO' . >/dev/null 2>&1 ); [ "$?" -eq 0 ] || rc=1
  # y la exclusión: la lista de patrones se excluye, el resto no
  printf '%s\n' "$patron" > "$tmp/$LISTA"
  ( cd "$tmp" && buscar "$patron" . >/dev/null 2>&1 ); [ "$?" -eq 0 ] || rc=1
  rm -rf "$tmp"
  return "$rc"
}

if ! autoprueba; then
  echo "❌ la autoprueba falló: la búsqueda no detecta lo que debería."
  echo "   NO se puede afirmar que el material esté limpio. Arregla el guion."
  exit 2
fi
[ "${1:-}" = "--probar" ] && { echo "✅ autoprueba correcta: la búsqueda detecta y descarta bien."; exit 0; }

[ -r "$LISTA" ] || { echo "❌ falta $LISTA"; exit 2; }

# Control de que la búsqueda ve archivos: si no hay ninguno, no se revisó nada.
nfiles=$(find . \( -name .git -o -name node_modules \) -prune -o -type f -print | wc -l | tr -d ' ')
[ "$nfiles" -gt 0 ] || { echo "❌ no hay archivos que revisar"; exit 2; }
echo "revisando $nfiles archivos de texto o binarios (los binarios se saltan), todas las carpetas"

fallas=0
errores=0
while IFS= read -r patron || [ -n "$patron" ]; do
  case "$patron" in ''|\#*) continue ;; esac
  hits=$(buscar "$patron" .); rc=$?
  case "$rc" in
    1) echo "🔴 patrón prohibido: $patron"
       printf '%s\n' "$hits" | sed 's/^/     /'
       fallas=$((fallas + 1)) ;;
    2) echo "⚠️  no se pudo buscar el patrón: $patron"
       errores=$((errores + 1)) ;;
  esac
done < "$LISTA"

if [ "$errores" -gt 0 ]; then
  echo
  echo "❌ $errores patrón(es) no se pudieron revisar. Falla cerrado: NO publicar."
  exit 2
fi
if [ "$fallas" -gt 0 ]; then
  echo
  echo "❌ $fallas patrón(es) prohibido(s). NO publicar hasta limpiarlo."
  exit 1
fi
echo "✅ limpio: ningún patrón prohibido en ningún archivo de texto"
