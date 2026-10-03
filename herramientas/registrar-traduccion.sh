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
# quita el registro anterior de ese par y agrega el nuevo
grep -v -P "^\Q$archivo\E\t\Q$idioma\E\t" herramientas/registro-traducciones.tsv > .reg.tmp 2>/dev/null || cp herramientas/registro-traducciones.tsv .reg.tmp
printf '%s\t%s\t%s\t%s\n' "$archivo" "$idioma" "$sha" "$(date +%F)" >> .reg.tmp
mv .reg.tmp herramientas/registro-traducciones.tsv
echo "registrado: $archivo → $idioma (huella del español ${sha:0:12}…)"
