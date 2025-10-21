# 🔄 Guia de Conversão para JavaScript Puro

## ✅ Arquivos Já Convertidos
- ✅ `src/main.js`
- ✅ `src/preload.js`  
- ✅ `src/protocols/base-protocol.js`
- ✅ `package.json` (configurado para JavaScript)

## 📝 Arquivos que Precisam ser Convertidos

Todos os arquivos abaixo ainda contêm sintaxe TypeScript e precisam ser convertidos para JavaScript puro:

### 1. Protocolos de Impressão
- `src/protocols/ppla.js`
- `src/protocols/epl2.js`
- `src/protocols/zpl.js`

### 2. Gerenciamento de Impressoras
- `src/printer/printer-manager.js`

### 3. Renderer (Interface)
- `src/renderer/js/app.js`
- `src/renderer/js/label-designer.js`
- `src/renderer/js/barcode-generator.js`
- `src/renderer/js/template-manager.js`
- `src/renderer/js/template-ui.js`

## 🔧 Como Converter Cada Arquivo

Para cada arquivo, faça as seguintes alterações:

### 1. Substituir Imports por Requires
```javascript
// DE:
import { algo } from 'modulo';
import * as path from 'path';

// PARA:
const { algo } = require('modulo');
const path = require('path');
```

### 2. Remover Interfaces e Types
```javascript
// DE:
export interface MinhaInterface {
  prop: string;
}

interface OutraInterface {
  valor: number;
}

// PARA:
// (simplesmente remover - não são necessárias em JS)
```

### 3. Remover Anotações de Tipo
```javascript
// DE:
function minhaFuncao(param: string): number {
  const valor: number = 10;
  return valor;
}

// PARA:
function minhaFuncao(param) {
  const valor = 10;
  return valor;
}
```

### 4. Remover Generics
```javascript
// DE:
const store = new Store<{ settings: Settings }>();
const array: Array<string> = [];

// PARA:
const store = new Store();
const array = [];
```

### 5. Substituir Optional Chaining TypeScript
```javascript
// DE:
mainWindow?.webContents.send('evento');

// PARA:
if (mainWindow) {
  mainWindow.webContents.send('evento');
}
```

### 6. Alterar Exports
```javascript
// DE:
export class MinhaClasse {}
export const minhaConst = 10;

// PARA:
class MinhaClasse {}
const minhaConst = 10;

// No final do arquivo:
module.exports = { MinhaClasse, minhaConst };
```

### 7. Remover `as const` e `as any`
```javascript
// DE:
const valor = 'PPLA' as const;
const outro = algo as any;

// PARA:
const valor = 'PPLA';
const outro = algo;
```

## 🚀 Exemplo Completo de Conversão

### ANTES (TypeScript):
```typescript
import { SerialPort } from 'serialport';

export interface Config {
  port: string;
  baudRate: number;
}

export class MeuProtocolo {
  private port: SerialPort | null = null;
  
  constructor(config: Partial<Config>) {
    this.port = null;
  }
  
  async connect(): Promise<void> {
    // código
  }
}
```

### DEPOIS (JavaScript):
```javascript
const { SerialPort } = require('serialport');

class MeuProtocolo {
  constructor(config = {}) {
    this.port = null;
  }
  
  async connect() {
    // código
  }
}

module.exports = { MeuProtocolo };
```

## ⚡ Script Rápido de Conversão

Você pode usar este comando para ajudar na conversão (mas revise manualmente depois):

```bash
# Para cada arquivo:
sed -i '' \
  -e 's/import \(.*\) from/const \1 = require/g' \
  -e 's/export interface .*/\/\/ interface removed/g' \
  -e 's/export class/class/g' \
  arquivo.js
```

## ✅ Como Testar Após Conversão

1. Instale as dependências:
```bash
npm install
```

2. Execute em modo desenvolvimento:
```bash
npm run dev
```

3. Se houver erros, corrija-os um por um verificando:
   - Imports/requires corretos
   - Exports no final dos arquivos
   - Remoção completa de tipos

## 📋 Checklist de Conversão

- [ ] Converter `src/protocols/ppla.js`
- [ ] Converter `src/protocols/epl2.js`
- [ ] Converter `src/protocols/zpl.js`
- [ ] Converter `src/printer/printer-manager.js`
- [ ] Converter `src/renderer/js/app.js`
- [ ] Converter `src/renderer/js/label-designer.js`
- [ ] Converter `src/renderer/js/barcode-generator.js`
- [ ] Converter `src/renderer/js/template-manager.js`
- [ ] Converter `src/renderer/js/template-ui.js`
- [ ] Testar com `npm install`
- [ ] Testar com `npm run dev`
- [ ] Corrigir eventuais erros

## 🆘 Problemas Comuns

### Erro: "Cannot use import statement outside a module"
**Solução**: Trocar `import` por `require`

### Erro: "module is not defined"
**Solução**: Adicionar `module.exports = {}` no final do arquivo

### Erro: "Unexpected token ':'"
**Solução**: Remover anotação de tipo (`:` seguido de tipo)

### Erro: "Unexpected token '<'"
**Solução**: Remover generics (`<TipoGenerico>`)

---

**Nota**: A conversão manual garante qualidade, mas é trabalhosa. Se preferir, posso continuar convertendo arquivo por arquivo.
