# 🧪 Como Testar o Etiquetas Desktop

## 📋 Pré-requisitos

- Node.js 16 ou superior instalado
- Mac, Windows ou Linux

## 🚀 Primeiros Passos

### 1. Instalar Dependências

```bash
npm install
```

### 2. Executar em Modo Desenvolvimento

```bash
npm run dev
```

O aplicativo abrirá automaticamente com DevTools aberto.

### 3. Executar em Modo Produção

```bash
npm start
```

## 📦 Gerar Executável

### Para Mac (.app)
```bash
npm run dist
```
O arquivo .app será gerado em `dist/mac/`

### Para Windows (.exe)
```bash
npm run dist -- --win
```

### Para Linux (.AppImage)
```bash
npm run dist -- --linux
```

## 🧪 O Que Você Pode Testar (Sem Impressora Física)

### 1. **Design de Etiquetas**
- Clique em "Nova" para criar uma etiqueta
- Use os botões na barra lateral para adicionar elementos:
  - 📝 Texto
  - 📊 Código de Barras
  - 🔲 QR Code
  - ➖ Linhas
  - ⬜ Retângulos

### 2. **Editor Visual**
- Arraste elementos para posicioná-los
- Use as alças nos cantos para redimensionar
- Clique em um elemento para editar suas propriedades no painel lateral
- Grid automático para alinhamento preciso

### 3. **Códigos de Barras**
- Adicione um código de barras
- Teste diferentes formatos:
  - CODE 128 (alfanumérico)
  - CODE 39
  - EAN-13 (13 dígitos)
  - EAN-8 (8 dígitos)
  - UPC-A, UPC-E
  - ITF, CODABAR
- Ative/desative texto legível
- Ajuste altura e largura

### 4. **QR Codes**
- Adicione um QR Code
- Insira qualquer texto ou URL
- Ajuste o tamanho
- Configure nível de correção de erros

### 5. **Templates**
- Crie um design de etiqueta
- Clique em "Salvar Template"
- Dê um nome e descrição
- Carregue templates salvos clicando em "Carregar"

### 6. **Protocolos de Impressão**
- No preview à direita, você verá o código gerado
- Selecione diferentes protocolos:
  - **PPLA** (Argox OS-214)
  - **EPL2** (Zebra)
  - **ZPL** (Zebra)
- Copie o código gerado com o botão "Copiar Código"

### 7. **Gerenciamento de Templates**
- Clique em "Carregar Template"
- Use os filtros:
  - Busca por nome
  - Categoria
  - Tags
  - Ordenação (nome, data, mais usados)
- Exporte templates para compartilhar
- Importe templates de outros usuários

## 🖨️ Testando COM Impressora Física

### Conectar Impressora Argox OS-214

1. Conecte a impressora via USB ou Porta Serial
2. No aplicativo, selecione "Argox OS-214" no dropdown de impressoras
3. Selecione o protocolo "PPLA"
4. Crie sua etiqueta
5. Clique em "Imprimir"

### Configurar Outras Impressoras

Para adicionar outras impressoras no código:

```typescript
const printerManager = PrinterManager.getInstance();
printerManager.addPrinter({
  name: "Minha Impressora",
  model: "Modelo XYZ",
  protocol: "ZPL", // ou "EPL2" ou "PPLA"
  connection: {
    port: "COM1", // ou "/dev/ttyUSB0" no Linux/Mac
    baudRate: 9600,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    rtscts: true
  }
});
```

## 🐛 Problemas Comuns

### "Impressora não conectada"
- Verifique se a impressora está ligada
- Confirme a porta serial/USB correta
- No Mac/Linux, pode precisar de permissões: `sudo chmod 666 /dev/ttyUSB0`

### "Erro ao compilar TypeScript"
- Execute: `npm run clean && npm install`
- Execute novamente: `npm run dev`

### Aplicativo não abre
- Verifique se o Node.js está instalado: `node --version`
- Reinstale dependências: `rm -rf node_modules && npm install`

## 📝 Atalhos de Teclado

- `Cmd/Ctrl + N` - Nova etiqueta
- `Cmd/Ctrl + O` - Abrir template
- `Cmd/Ctrl + S` - Salvar template
- `Cmd/Ctrl + C` - Copiar elemento
- `Cmd/Ctrl + V` - Colar elemento
- `Delete` - Excluir elemento selecionado

## 💡 Dicas

1. **Sem impressora?** Use o preview do código para validar o output
2. **Testando protocolos?** Copie o código e simule em um emulador
3. **Salvando designs?** Use templates para reutilizar layouts
4. **Compartilhando?** Exporte templates como JSON

## 📸 Recursos Visuais

- **Grid de alinhamento** - Elementos se alinham automaticamente
- **Preview em tempo real** - Veja o código sendo gerado
- **Drag and drop** - Interface intuitiva
- **Propriedades visuais** - Edite tudo visualmente

## 🎯 Cenários de Teste Recomendados

### Teste 1: Etiqueta Simples
1. Adicione um texto "Produto XYZ"
2. Adicione um código de barras "123456789012"
3. Salve como template "Etiqueta Básica"

### Teste 2: Etiqueta com QR Code
1. Adicione um QR Code com URL
2. Adicione texto descritivo
3. Teste diferentes tamanhos

### Teste 3: Etiqueta Complexa
1. Combine texto, código de barras e QR code
2. Adicione bordas com retângulos
3. Use linhas para separar seções
4. Salve como template

### Teste 4: Múltiplos Protocolos
1. Crie uma etiqueta
2. Mude entre PPLA, EPL2 e ZPL
3. Compare os códigos gerados

## 📞 Suporte

Em caso de problemas:
1. Verifique o console do navegador (DevTools)
2. Verifique os logs do terminal
3. Abra uma issue no repositório

---

**Desenvolvido com ❤️ por WhiteLabel**
