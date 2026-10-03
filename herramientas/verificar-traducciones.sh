#!/usr/bin/env bash
# Dice qué traducciones están al día, cuáles vencieron y cuáles faltan.
#
# Por qué existe: este curso se publica en cinco idiomas. Cada corrección al
# español deja las otras cuatro versiones viejas, y una traducción vieja no da
# error: simplemente enseña algo que ya no es cierto.
set -uo pipefail
cd "$(dirname "$0")/.."
IDIOMAS="en fr pt bg"
REG=herramientas/registro-traducciones.tsv
al_dia=0; vencidas=0; faltan=0

printf "%-28s %-4s %s\n" "CAPÍTULO" "IDI" "ESTADO"
printf "%-28s %-4s %s\n" "----------------------------" "---" "------"
for fuente in es/*.md; do
  base=$(basename "$fuente")
  sha_actual=$(shasum -a 256 "$fuente" | cut -d' ' -f1)
  for idi in $IDIOMAS; do
    if [ ! -f "$idi/$base" ]; then
      printf "%-28s %-4s ⬜ falta\n" "$base" "$idi"; faltan=$((faltan+1)); continue
    fi
    sha_reg=$(awk -F'\t' -v a="$base" -v i="$idi" '$1==a && $2==i {print $3}' "$REG" 2>/dev/null | tail -1)
    if [ -z "$sha_reg" ]; then
      printf "%-28s %-4s ⚠️  existe pero SIN registrar\n" "$base" "$idi"; vencidas=$((vencidas+1))
    elif [ "$sha_reg" = "$sha_actual" ]; then
      printf "%-28s %-4s ✅ al día\n" "$base" "$idi"; al_dia=$((al_dia+1))
    else
      printf "%-28s %-4s 🔴 VENCIDA: el español cambió después de traducir\n" "$base" "$idi"
      vencidas=$((vencidas+1))
    fi
  done
done
echo
echo "  al día: $al_dia · vencidas: $vencidas · faltan: $faltan"
[ "$vencidas" -gt 0 ] && { echo "  🔴 Hay traducciones que ya no corresponden al español."; exit 1; }
[ "$faltan" -gt 0 ] && { echo "  ⬜ Faltan traducciones (normal mientras se escribe)."; exit 0; }
echo "  ✅ Todo sincronizado."
