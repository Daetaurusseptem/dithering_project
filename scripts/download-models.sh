#!/bin/bash
# Script para Linux/Mac - Descargar modelos de IA
# Uso: ./download-models.sh [modelo]
# Modelos: rmbg-1.4 (recomendado) o modnet (ligero)

echo ""
echo "🤖 Descargador de Modelos de IA para Background Removal"
echo "======================================================"
echo ""

MODEL="${1:-rmbg-1.4}"
echo "📦 Descargando modelo: $MODEL"
echo ""
echo "⏳ Esto puede tardar varios minutos dependiendo de tu conexión..."
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bun "$SCRIPT_DIR/download-models.js" "$MODEL"

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Hubo un error durante la descarga"
    echo "💡 Puedes descargar manualmente desde Hugging Face"
    echo ""
    exit 1
fi

echo ""
echo "✅ ¡Listo! Tu app ahora puede funcionar offline"
echo ""
