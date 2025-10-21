#!/bin/bash

echo "🔄 Convertendo arquivos TypeScript para JavaScript..."

# Função para remover sintaxe TypeScript de um arquivo
convert_file() {
    local file="$1"
    echo "  📝 Convertendo: $file"
    
    # Fazer backup
    cp "$file" "$file.bak"
    
    # Remover tipos TypeScript e converter imports/exports
    sed -i '' \
        -e 's/import \(.*\) from \(.*\);/const \1 = require(\2);/g' \
        -e 's/export interface .*{/\/\/ interface removed/g' \
        -e 's/export type .*$/\/\/ type removed/g' \
        -e 's/: \w\+\(\[\]\)\?//g' \
        -e 's/<[^>]*>//g' \
        -e 's/ as \w\+//g' \
        -e 's/export class/class/g' \
        -e 's/export const/const/g' \
        -e 's/export function/function/g' \
        -e 's/export {/module.exports = {/g' \
        "$file"
}

# Converter todos os arquivos .js que ainda têm sintaxe TypeScript
find src -name "*.js" -type f | while read file; do
    if grep -q "import.*from\|interface\|: \w\+" "$file" 2>/dev/null; then
        convert_file "$file"
    fi
done

echo "✅ Conversão concluída!"
echo "⚠️  Alguns ajustes manuais podem ser necessários"
