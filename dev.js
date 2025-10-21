const { spawn } = require('child_process');
const path = require('path');

// Função para executar comandos
function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: 'inherit',
      shell: true
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
  });
}

// Função principal
async function main() {
  try {
    // Instalar dependências se node_modules não existir
    const nodeModules = path.join(__dirname, 'node_modules');
    if (!require('fs').existsSync(nodeModules)) {
      console.log('📦 Instalando dependências...');
      await runCommand('npm', ['install']);
    }

    // Iniciar o app
    console.log('🚀 Iniciando aplicativo...');
    await runCommand('npm', ['start']);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

main();
