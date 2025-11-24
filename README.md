# Etiquetas Desktop

Aplicativo desktop para impressão de etiquetas em impressoras **Argox OS-2140** usando protocolo PPLA.

## 🚀 Funcionalidades

- ✅ Listagem automática de impressoras do sistema
- ✅ Impressão via protocolo PPLA (Printer Programming Language Argox)
- ✅ Interface moderna e intuitiva
- ✅ Auto-atualização via web (electron-updater)
- ✅ Instalador para Windows

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Windows 10/11
- Impressora Argox OS-2140 instalada

## 🛠️ Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/etiquetas-desktop.git

# Entre na pasta
cd etiquetas-desktop

# Instale as dependências
npm install
```

## 💻 Desenvolvimento

```bash
# Executar em modo desenvolvimento
npm run dev

# Executar normalmente
npm start
```

## 📦 Build

```bash
# Gerar instalador Windows
npm run build:win

# Publicar atualização
npm run publish
```

## 🏗️ Estrutura do Projeto

```
etiquetas-desktop/
├── package.json
├── src/
│   ├── main/
│   │   ├── index.js        # Processo principal Electron
│   │   ├── printer.js      # Módulo de comunicação com impressora
│   │   └── preload.js      # Bridge segura para renderer
│   └── renderer/
│       ├── index.html      # Interface principal
│       ├── styles/
│       │   └── main.css    # Estilos
│       └── js/
│           └── app.js      # Lógica da interface
├── assets/
│   └── icon.ico            # Ícone do aplicativo
└── dist/                   # Build de produção
```

## 🖨️ Protocolo PPLA

O aplicativo usa o protocolo PPLA (Printer Programming Language Argox) para comunicação direta com a impressora. Comandos principais:

| Comando | Descrição |
|---------|-----------|
| `STX + L` | Início do modo de impressão |
| `D11` | Densidade de impressão |
| `Qn` | Quantidade de cópias |
| `Ax,y,r,f,h,w,N,"texto"` | Texto com posição e formatação |
| `E` | Fim e imprimir |

## 🔄 Auto-atualização

Configure o `publish` no `package.json` para seu repositório GitHub:

```json
"publish": {
  "provider": "github",
  "owner": "seu-usuario",
  "repo": "etiquetas-desktop"
}
```

## 📝 Roadmap

- [ ] Integração com API externa
- [ ] Templates de etiquetas de roupas
- [ ] Editor visual de etiquetas
- [ ] Suporte a código de barras
- [ ] Múltiplos protocolos (ZPL, EPL)

## 📄 Licença

MIT

