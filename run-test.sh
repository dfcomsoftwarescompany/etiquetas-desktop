#!/bin/bash

echo "🚀 Preparando aplicativo para teste..."
echo ""

# Criar pasta dist
mkdir -p dist/renderer/js
mkdir -p dist/renderer/styles
mkdir -p dist/protocols
mkdir -p dist/printer

# Compilar TypeScript ignorando erros
echo "📦 Compilando TypeScript (ignorando erros)..."
npx tsc --noEmitOnError false || true

# Copiar arquivos HTML e CSS
echo "📋 Copiando arquivos estáticos..."
cp -r src/renderer/*.html dist/renderer/
cp -r src/renderer/styles/*.css dist/renderer/styles/

# Executar Electron
echo ""
echo "🎮 Iniciando Electron..."
echo ""
npx electron .
