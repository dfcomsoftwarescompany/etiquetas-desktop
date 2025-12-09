---
name: Sistema de Etiquetas Desktop - .NET 8
overview: ""
todos:
  - id: 86959da9-6296-4ec4-9afc-ae49551af243
    content: Criar estrutura do projeto .NET 8 (.sln, .csproj, pastas)
    status: pending
  - id: 63722d21-2acd-4733-b685-a72e84ebc1f1
    content: Implementar ArgoxPrinterService com comandos PPLB e envio raw
    status: pending
  - id: a26e9f5d-0a8f-436b-86be-dd9f69ac4fc8
    content: Implementar UpdateService com verificacao HTTP e download
    status: pending
  - id: 6dd588b2-4ed6-4e45-9754-2e27732ef92b
    content: Criar MainForm com interface e integracao dos services
    status: pending
---

# Sistema de Etiquetas Desktop - .NET 8

## Estrutura do Projeto

```
EtiquetasDesktop/
├── EtiquetasDesktop.sln
├── EtiquetasDesktop/
│   ├── EtiquetasDesktop.csproj
│   ├── Program.cs
│   ├── Forms/
│   │   └── MainForm.cs
│   ├── Services/
│   │   ├── ArgoxPrinterService.cs
│   │   └── UpdateService.cs
│   └── Models/
│       └── VersionInfo.cs
```

## Implementação

### 1. Projeto e Configuração

- Criar `EtiquetasDesktop.sln` e `EtiquetasDesktop.csproj` para .NET 8 Windows Forms
- Adicionar referência ao `System.Drawing.Common` e `System.Net.Http.Json`

### 2. ArgoxPrinterService (Services/ArgoxPrinterService.cs)

- Usar `System.Drawing.Printing.PrintDocument` para enviar comandos raw para a impressora
- Implementar método `SendRawData()` usando P/Invoke para `WritePrinter` da API Windows
- Construir comandos PPLB:
  - `N` - Limpa buffer
  - `A` - Texto ("Produto Teste")
  - `B` - Código de barras Code 128
  - `P1` - Imprime 1 cópia

### 3. UpdateService (Services/UpdateService.cs)

- `HttpClient` para GET em `http://meuservidor.com/update/version.json`
- Comparar versão remota com `CurrentVersion` local
- Baixar instalador via `HttpClient.GetStreamAsync()` se necessário
- Notificar usuário via `MessageBox`

### 4. MainForm (Forms/MainForm.cs)

- Interface simples com:
  - ComboBox para selecionar impressora (lista impressoras instaladas)
  - TextBox para texto da etiqueta
  - TextBox para valor do código de barras
  - Botão "Imprimir"
- No `MainForm_Load`: chamar `UpdateService.CheckForUpdatesAsync()`

### 5. Comandos PPLB para Argox

```
N                           // Limpa imagem
q812                        // Largura da etiqueta
Q406,24                     // Altura + gap
A50,50,0,3,1,1,N,"Produto Teste"   // Texto
B50,100,0,1,2,2,100,B,"123456789"  // Code 128
P1                          // Imprime 1 cópia
```