// ==================== Utilitários ====================
function showToast(message, type = 'success', duration = 3000) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

// Update automático agora é gerenciado pelo update-electron-app
// Diálogos nativos do sistema são exibidos automaticamente

// ==================== Impressora ====================
const printerSelect = document.getElementById('printer-select');
const btnRefresh = document.getElementById('btn-refresh');

async function loadPrinters() {
  try {
    printerSelect.disabled = true;
    printerSelect.innerHTML = '<option value="">Carregando...</option>';
    
    const result = await window.electronAPI.printer.list();
    
    if (result.success && result.printers.length > 0) {
      printerSelect.innerHTML = result.printers
        .map(p => {
          const statusIndicator = p.Online ? '🟢' : '🔴';
          return `<option value="${p.Name}" ${p.Default ? 'selected' : ''}>${statusIndicator} ${p.Name}</option>`;
        })
        .join('');
      printerSelect.disabled = false;
      
      // Salvar impressora selecionada
      const saved = localStorage.getItem('selectedPrinter');
      if (saved && result.printers.find(p => p.Name === saved)) {
        printerSelect.value = saved;
      }

      // Verificar status da impressora selecionada
      checkPrinterStatus();
    } else {
      printerSelect.innerHTML = '<option value="">Nenhuma impressora encontrada</option>';
    }
  } catch (error) {
    console.error('Erro ao carregar impressoras:', error);
    printerSelect.innerHTML = '<option value="">Erro ao carregar</option>';
    showToast('Erro ao carregar impressoras', 'error');
  }
}

// Status da impressora
const printerStatusEl = document.getElementById('printer-status');

async function checkPrinterStatus() {
  try {
    const response = await fetch('http://localhost:8547/printer/status');
    const data = await response.json();
    
    if (printerStatusEl) {
      if (!data.configured) {
        printerStatusEl.className = 'printer-status warning';
        printerStatusEl.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>Selecione uma impressora</span>
        `;
      } else if (data.online) {
        printerStatusEl.className = 'printer-status online';
        printerStatusEl.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <span>${data.status}</span>
        `;
      } else {
        printerStatusEl.className = 'printer-status offline';
        printerStatusEl.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <span>${data.status} - Verifique a conexão</span>
        `;
        showToast(`Impressora: ${data.status}`, 'error');
      }
    }
  } catch (error) {
    console.error('Erro ao verificar status da impressora:', error);
  }
}

printerSelect.addEventListener('change', async () => {
  const printer = printerSelect.value;
  if (printer) {
    localStorage.setItem('selectedPrinter', printer);
    try {
      await window.electronAPI.printer.setConfig({ defaultPrinter: printer });
      showToast(`Impressora selecionada: ${printer}`, 'success');
      setTimeout(checkPrinterStatus, 500);
    } catch (error) {
      console.error('Erro ao salvar impressora:', error);
    }
  }
});

// Layout invertido (180°) - para papel instalado de cabeça para baixo
const layoutInvertCheckbox = document.getElementById('layout-invert-checkbox');

async function loadLayoutInvertSetting() {
  if (!layoutInvertCheckbox) return;
  try {
    const saved = localStorage.getItem('layoutInvertido') === 'true';
    layoutInvertCheckbox.checked = saved;
    await window.electronAPI.printer.setConfig({ layoutInvertido: saved });
  } catch (error) {
    console.error('Erro ao carregar configuração de layout:', error);
  }
}

if (layoutInvertCheckbox) {
  layoutInvertCheckbox.addEventListener('change', async () => {
  const invertido = layoutInvertCheckbox.checked;
  localStorage.setItem('layoutInvertido', invertido);
  try {
    await window.electronAPI.printer.setConfig({ layoutInvertido: invertido });
    showToast(
      invertido ? 'Layout invertido ativado — impressão corrigida para papel de cabeça para baixo' : 'Layout normal restaurado',
      'success'
    );
  } catch (error) {
    console.error('Erro ao salvar configuração de layout:', error);
    showToast('Erro ao salvar configuração', 'error');
  }
});
}

btnRefresh.addEventListener('click', () => {
  loadPrinters();
  showToast('Lista de impressoras atualizada', 'success');
});

// ==================== Token ====================
const tokenInput = document.getElementById('token-input');
const btnGenerate = document.getElementById('btn-generate');
const btnCopy = document.getElementById('btn-copy');
const tokenStatus = document.getElementById('token-status');
const tokenStatusText = document.getElementById('token-status-text');

async function checkTokenStatus() {
  try {
    const response = await fetch('http://localhost:8547/token/status');
    const data = await response.json();
    
    if (data.configured) {
      tokenInput.value = data.token || 'Token configurado';
      tokenStatus.className = 'token-status configured';
      tokenStatusText.textContent = '✓ Token configurado e ativo';
    } else {
      tokenInput.value = '';
      tokenInput.placeholder = 'Clique em gerar token';
      tokenStatus.className = 'token-status not-configured';
      tokenStatusText.textContent = 'Token não configurado';
    }
  } catch (error) {
    console.error('Erro ao verificar token:', error);
  }
}

btnGenerate.addEventListener('click', async () => {
  try {
    const response = await fetch('http://localhost:8547/token/generate', { method: 'POST' });
    const data = await response.json();
    
    if (data.token) {
      tokenInput.value = data.token;
      tokenStatus.className = 'token-status configured';
      tokenStatusText.textContent = '✓ Token gerado com sucesso';
      showToast('Token gerado! Copie e configure no sistema web.', 'success');
    }
  } catch (error) {
    showToast('Erro ao gerar token', 'error');
  }
});

btnCopy.addEventListener('click', async () => {
  const token = tokenInput.value;
  if (token && token !== 'Token configurado') {
    await navigator.clipboard.writeText(token);
    showToast('Token copiado!', 'success');
  } else {
    showToast('Gere um token primeiro', 'warning');
  }
});

// ==================== Status do Servidor ====================
const statusIcon = document.getElementById('status-icon');
const statusTitle = document.getElementById('status-title');
const statusSubtitle = document.getElementById('status-subtitle');

// Variável para armazenar o IP local
let localIP = 'localhost';

// Função para obter e exibir o IP local
async function getLocalIP() {
  try {
    if (window.electronAPI && window.electronAPI.app) {
      const response = await window.electronAPI.app.getLocalIP();
      if (response.success && response.ip) {
        localIP = response.ip;
        const serverUrl = document.getElementById('server-url');
        const networkIndicator = document.getElementById('network-indicator');
        
        if (serverUrl) {
          const url = `http://${response.ip}:${response.port}`;
          serverUrl.textContent = url;
          serverUrl.title = `Hostname: ${response.hostname || 'N/A'} | Clique para copiar o endereço`;
          
          // Destacar se não for localhost
          if (response.ip !== 'localhost' && response.ip !== '127.0.0.1') {
            serverUrl.style.backgroundColor = '#10b981';
            serverUrl.style.color = '#ffffff';
            serverUrl.style.fontWeight = '600';
            serverUrl.style.cursor = 'pointer';
            serverUrl.style.padding = '4px 8px';
            serverUrl.style.borderRadius = '4px';
            
            // Mostrar indicador de rede
            if (networkIndicator) {
              networkIndicator.style.display = 'inline-block';
            }
            
            // Adicionar evento de clique para copiar
            serverUrl.onclick = async () => {
              try {
                await navigator.clipboard.writeText(url);
                showToast(`✅ Endereço copiado! Use este endereço no tablet/celular`, 'success', 4000);
              } catch (err) {
                showToast('Erro ao copiar endereço', 'error');
              }
            };
          } else {
            // Se for localhost, esconder indicador
            if (networkIndicator) {
              networkIndicator.style.display = 'none';
            }
            serverUrl.style.cursor = 'default';
            serverUrl.onclick = null;
          }
        }
        return response.ip;
      }
    }
  } catch (error) {
    console.log('Erro ao obter IP local:', error);
  }
  return 'localhost';
}

async function checkServerStatus() {
  try {
    const response = await fetch('http://localhost:8547/health');
    const data = await response.json();
    
    if (data.status === 'ok') {
      statusIcon.className = 'status-icon active';
      statusIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>`;
      statusTitle.textContent = 'Pronto para Imprimir';
      statusSubtitle.textContent = 'O sistema está ativo e aguardando requisições';
    }
  } catch (error) {
    statusIcon.className = 'status-icon inactive';
    statusIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>`;
    statusTitle.textContent = 'Servidor Inativo';
    statusSubtitle.textContent = 'Não foi possível conectar ao servidor';
  }
}

// ==================== Inicialização ====================
document.addEventListener('DOMContentLoaded', async () => {
  // Carregar versão
  if (window.electronAPI && window.electronAPI.app) {
    try {
      const version = await window.electronAPI.app.getVersion();
      document.getElementById('app-version').textContent = `v${version}`;
    } catch (e) {
      // Versão não disponível
    }
  }

  // Obter e exibir IP local
  await getLocalIP();
  
  // Updates automáticos via update-electron-app (não precisa configurar)

  // Inicializar
  loadPrinters();
  loadLayoutInvertSetting();
  checkTokenStatus();
  checkServerStatus();

  // Verificar status periodicamente
  setInterval(checkServerStatus, 30000);
  setInterval(checkTokenStatus, 60000);
  setInterval(checkPrinterStatus, 15000);
  
  // Atualizar IP a cada 1 minuto (caso mude)
  setInterval(getLocalIP, 60000);
});
