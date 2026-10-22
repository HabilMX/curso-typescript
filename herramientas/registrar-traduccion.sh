#!/usr/bin/env bash
# Registra que un capítulo quedó traducido, guardando la huella del español
# del que se tradujo.   Uso:  herramientas/registrar-traduccion.sh 02-fundamentos.md en
set -euo pipefail
cd "$(dirname "$0")/.."
archivo="${1:?falta el nombre del archivo, p.ej. 02-fundamentos.md}"
idioma="${2:?falta el idioma, p.ej. en}"
[ -f "es/$archivo" ]      || { echo "no existe es/$archivo"; exit 1; }
[ -f "$idioma/$archivo" ] || { echo "no existe $idioma/$archivo — traduce primero"; exit 1; }
sha=$(shasum -a 256 "es/$archivo" | cut -d' ' -f1)
# 🔴 CANDADO ATOMICO. Varios traductores pueden registrar a la vez, y este guion
# LEE el registro, lo reescribe y lo mueve: sin candado, dos registros simultaneos
# pierden uno de los dos —gana el ultimo que mueva su temporal—. `mkdir` falla si
# el directorio ya existe, y eso es lo que lo hace atomico; un `[ -d ] || mkdir`
# NO lo es y deja pasar a dos que llegan en el mismo instante.
LOCK="${TMPDIR:-/tmp}/hb-registro-traducciones-$(basename "$PWD").lock"
TMP="herramientas/.registro.$$.tmp"
_preso=0
for _ in $(seq 1 120); do
  if mkdir "$LOCK" 2>/dev/null; then _preso=1; break; fi
  sleep 0.5
done
if [ "$_preso" -eq 0 ]; then
  echo "no obtuve el candado del registro en 60 s ($LOCK). Si no hay nadie registrando, borra ese directorio." >&2
  exit 1
fi
trap 'rmdir "$LOCK" 2>/dev/null; [ -f "$TMP" ] && rm -f "$TMP"' EXIT INT TERM

# Quita el registro anterior de ese par y agrega el nuevo.
# 🔴 AQUI NO VA `grep -P`, Y NO ES PREFERENCIA. El grep de macOS (/usr/bin/grep)
# no trae `-P`: contesta «invalid option -- P» y sale con 2, asi que el `|| cp`
# de la version anterior copiaba el archivo SIN quitar el renglon viejo y el
# registro acumulaba hasta TRES renglones por par (medido el 7-oct-2026: 154
# renglones). Pasaba inadvertido porque el verificador lee el ULTIMO renglon del
# par, asi que el resultado seguia siendo correcto mientras el archivo engordaba.
# ⚠️ Y la trampa de medicion: en una terminal interactiva `grep -P` SI funciona,
# porque ahi `grep` puede ser otra implementacion. El guion corre con el binario
# del sistema. Se comprueba con `/usr/bin/grep`, no con `grep`.
# `awk` compara los dos campos EXACTOS: sin expresion regular y sin escapes.
awk -F'\t' -v a="$archivo" -v i="$idioma" '!($1==a && $2==i)' \
    herramientas/registro-traducciones.tsv > "$TMP"
printf '%s\t%s\t%s\t%s\n' "$archivo" "$idioma" "$sha" "$(date +%F)" >> "$TMP"
mv "$TMP" herramientas/registro-traducciones.tsv
echo "registrado: $archivo → $idioma (huella del español ${sha:0:12}…)"
