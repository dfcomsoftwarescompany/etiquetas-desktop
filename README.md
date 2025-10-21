# 🏷️ Etiquetas Desktop

Sistema desktop para geração e impressão de etiquetas para impressoras térmicas.

## 📋 Sobre o Projeto

O **Etiquetas Desktop** é uma aplicação que permite criar e imprimir etiquetas personalizadas de forma simples e intuitiva. Desenvolvido com Electron e TypeScript, oferece suporte para múltiplos protocolos de impressão e diversos tipos de elementos visuais.

## 🚀 Funcionalidades

- ✨ Interface intuitiva para design de etiquetas
- 📐 Editor visual drag-and-drop
- 📊 Geração de código de barras
- 🔲 Criação de QR Codes
- 💾 Sistema de templates reutilizáveis
- 🖨️ Suporte para múltiplas impressoras
- 🔧 Compatível com protocolos PPLA, EPL2 e ZPL

## 🛠️ Tecnologias Utilizadas

- **Electron** - Framework para aplicações desktop
- **TypeScript** - Linguagem de programação
- **Node.js** - Runtime JavaScript
- **HTML/CSS** - Interface do usuário

## 📦 Instalação

### Pré-requisitos

- Node.js 16 ou superior
- npm ou yarn

### Passos para instalação

1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/etiquetas-desktop.git
cd etiquetas-desktop
```

2. Instale as dependências
```bash
npm install
```

3. Compile o TypeScript
```bash
npm run build
```

4. Execute a aplicação
```bash
npm start
```

## 💻 Desenvolvimento

Para executar em modo de desenvolvimento com hot reload:

```bash
npm run dev
```

Para compilar o TypeScript em modo watch:

```bash
npm run watch
```

## 🏗️ Build

Para gerar o executável da aplicação:

```bash
npm run dist
```

Os arquivos compilados serão gerados na pasta `dist/`.

## 🖨️ Impressoras Suportadas

### Atualmente compatível:
- **Argox OS-214** (Protocolo PPLA)

### Planejado para futuras versões:
- Zebra (Protocolos EPL2 e ZPL)
- Outras impressoras térmicas

## 📝 Como Usar

1. **Criar uma nova etiqueta**
   - Clique em "Nova" ou use `Ctrl+N`
   - Defina o tamanho da etiqueta (largura e altura)

2. **Adicionar elementos**
   - Use os botões na barra lateral para adicionar:
     - Textos
     - Códigos de barras
     - QR Codes
     - Linhas e retângulos

3. **Editar elementos**
   - Clique e arraste para posicionar
   - Use as alças para redimensionar
   - Configure propriedades no painel lateral

4. **Salvar como template**
   - Clique em "Salvar Template"
   - Dê um nome e descrição
   - Reutilize quando necessário

5. **Imprimir**
   - Selecione a impressora
   - Escolha o protocolo adequado
   - Clique em "Imprimir"

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para:

- Reportar bugs
- Sugerir novas funcionalidades
- Enviar pull requests

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📞 Suporte

Em caso de dúvidas ou problemas:
- Abra uma issue no GitHub
- Entre em contato com a equipe de desenvolvimento

---

Desenvolvido com ❤️ por WhiteLabel
