const fs = require('fs');
const path = require('path');

// Função para copiar diretório recursivamente
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      // Ignorar pasta js (será compilada)
      if (entry.name === 'js') continue;
      copyDir(srcPath, destPath);
    } else {
      // Copiar apenas arquivos não TypeScript
      if (!entry.name.endsWith('.ts')) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

console.log('📦 Copiando arquivos estáticos...');

// Copiar arquivos do renderer (HTML, CSS)
const rendererSrc = path.join(__dirname, '../src/renderer');
const rendererDest = path.join(__dirname, '../dist/renderer');
copyDir(rendererSrc, rendererDest);

// Criar pasta js no dist/renderer se não existir
const jsPath = path.join(rendererDest, 'js');
if (!fs.existsSync(jsPath)) {
  fs.mkdirSync(jsPath, { recursive: true });
}

console.log('✅ Arquivos copiados com sucesso!');
