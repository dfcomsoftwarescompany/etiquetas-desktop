#!/usr/bin/env node

/**
 * Script para testar o aplicativo mesmo com erros de TypeScript
 * Execute com: node test.js
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Iniciando aplicativo em modo de teste...\n');
console.log('⚠️  Ignorando erros de TypeScript para permitir testes\n');

// Criar pasta dist se não existir
const distPath = path.join(__dirname, 'dist');
if (!fs.existsSync(distPath)) {
  fs.mkdirSync(distPath, { recursive: true });
}

// Copiar arquivos necessários
const filesToCopy = [
  { src: 'src/main.ts', dest: 'dist/main.js' },
  { src: 'src/preload.ts', dest: 'dist/preload.js' }
];

console.log('📋 Copiando arquivos...');
filesToCopy.forEach(file => {
  const srcPath = path.join(__dirname, file.src);
  const destPath = path.join(__dirname, file.dest);
  
  if (fs.existsSync(srcPath)) {
    let content = fs.readFileSync(srcPath, 'utf8');
    
    // Remover imports de tipo do TypeScript
    content = content.replace(/import type .* from .*;/g, '');
    content = content.replace(/export type .*/g, '');
    
    // Converter import para require
    content = content.replace(/import (.*) from ['"](.*)['"];/g, (match, imports, module) => {
      if (imports.includes('{')) {
        // Named imports
        return `const ${imports} = require('${module}');`;
      } else {
        // Default import
        return `const ${imports} = require('${module}');`;
      }
    });
    
    // Converter export para module.exports
    content = content.replace(/export class (\w+)/g, 'class $1');
    content = content.replace(/export interface .*/g, '');
    content = content.replace(/export const/g, 'const');
    
    // Remover tipos TypeScript
    content = content.replace(/: \w+(\[\])?/g, '');
    content = content.replace(/<.*?>/g, '');
    content = content.replace(/as \w+/g, '');
    
    fs.writeFileSync(destPath, content);
    console.log(`✅ ${file.src} -> ${file.dest}`);
  }
});

// Copiar pasta renderer
const rendererSrc = path.join(__dirname, 'src/renderer');
const rendererDest = path.join(__dirname, 'dist/renderer');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('📁 Copiando arquivos do renderer...');
copyDir(rendererSrc, rendererDest);

// Copiar assets se existir
const assetsSrc = path.join(__dirname, 'src/assets');
if (fs.existsSync(assetsSrc)) {
  console.log('🖼️  Copiando assets...');
  copyDir(assetsSrc, path.join(__dirname, 'dist/assets'));
}

console.log('\n✨ Arquivos preparados!\n');
console.log('🎮 Iniciando Electron...\n');

// Executar Electron
const electron = spawn('npx', ['electron', '.'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' }
});

electron.on('close', (code) => {
  console.log(`\n👋 Aplicativo fechado com código: ${code}`);
  process.exit(code);
});
