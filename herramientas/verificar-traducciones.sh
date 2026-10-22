#!/usr/bin/env bash
# Dice qué traducciones están al día, cuáles vencieron y cuáles faltan.
#
# Por qué existe: este curso se publica en cinco idiomas. Cada corrección al
# español deja las otras cuatro versiones viejas, y una traducción vieja no da
# error: simplemente enseña algo que ya no es cierto.
set -uo pipefail
cd "$(dirname "$0")/.."
IDIOMAS="en fr pt bg"

# 🔴 UN SELLO NO ES UNA TRADUCCION. Las carpetas de idioma nacen con un archivo
# que solo dice «(traducción pendiente)» y apunta al original en español. Sin
# esta comprobacion el guion lo contaba como traduccion EXISTENTE y, al no tener
# renglon en el registro, la marcaba VENCIDA — y lo vencido revienta la corrida.
# Medido el 7-oct-2026 en el curso de web: 4 falsos positivos dejaban el CI en
# rojo por trabajo que todavia no empieza. El sello se cuenta como FALTA, que no
# revienta; lo vencido sigue reventando igual, que es lo que este guion existe
# para cazar.
es_sello() { head -1 "$1" | grep -qF '(traducción pendiente)'; }
REG=herramientas/registro-traducciones.tsv
al_dia=0; vencidas=0; faltan=0

printf "%-28s %-4s %s\n" "CAPÍTULO" "IDI" "ESTADO"
printf "%-28s %-4s %s\n" "----------------------------" "---" "------"
for fuente in es/*.md; do
  base=$(basename "$fuente")
  # 🔴 LO QUE EMPIEZA CON «_» ES MATERIAL DE TRABAJO, NO UN CAPITULO: mapas de
  # continuidad, listas de excepciones, notas del equipo. No se traduce nunca, asi
  # que contarlo como «falta» pone en el reporte un numero que NO va a bajar jamas
  # —medido el 7-oct-2026 en el curso de Python: 2 archivos x 4 idiomas = 8 faltas
  # permanentes—. Y un numero que siempre esta ahi deja de leerse, que es como se
  # pierde el hallazgo de verdad el dia que aparezca.
  # ⚠️ Es el mismo criterio del `export-ignore` de `.gitattributes`: material de
  # trabajo que se queda en el repositorio privado y no viaja a lo publico. Lo que
  # NO cambia es que `verificar-publicable.sh` SI los revisa: se publican nunca,
  # pero se miran siempre.
  case "$base" in _*) continue ;; esac
  sha_actual=$(shasum -a 256 "$fuente" | cut -d' ' -f1)
  for idi in $IDIOMAS; do
    if [ ! -f "$idi/$base" ]; then
      printf "%-28s %-4s ⬜ falta\n" "$base" "$idi"; faltan=$((faltan+1)); continue
    fi
    if es_sello "$idi/$base"; then
      printf "%-28s %-4s ⬜ falta (solo el sello, sin traducir)\n" "$base" "$idi"
      faltan=$((faltan+1)); continue
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
