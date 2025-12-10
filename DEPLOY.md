# Guia de Deploy - Etiquetas DFCOM

Guia simplificado para build e deploy do aplicativo.

---

## 🚀 Configuração Inicial (fazer 1 vez)

### 1. Editar `package.json`

Na linha 46, altere para seu repositório GitHub:

```json
"owner": "seu-usuario-github",
"repo": "etiquetas-desktop"
```

### 2. Criar Token do GitHub

1. Acesse: https://github.com/settings/tokens
2. **"Generate new token (classic)"**
3. Marque apenas: **`repo`**
4. Copie o token

### 3. Configurar Token (PowerShell)

```powershell
# Permanente (recomendado)
[System.Environment]::SetEnvironmentVariable("GH_TOKEN", "ghp_seu_token", "User")

# Verificar
echo $env:GH_TOKEN
```

✅ Pronto! Configuração feita.

---

## 📦 Build e Deploy

### Testar localmente

```bash
npm run build:test
```

Gera o instalador em `dist/` sem publicar.

### Publicar versão nova

```bash
# 1. Atualizar versão
npm version patch   # 2.0.0 → 2.0.1 (correção)
# ou
npm version minor   # 2.0.0 → 2.1.0 (nova funcionalidade)

# 2. Enviar para GitHub
git push origin main --tags

# 3. Publicar
npm run publish:prod
```

**Pronto!** Release criado automaticamente no GitHub.

---

## 📥 Primeira Instalação (clientes)

### Como distribuir o instalador?

**Opção 1: Link do GitHub (recomendado)**

Envie para o cliente:
```
https://github.com/seu-usuario/etiquetas-desktop/releases/latest
```

Cliente clica no `.exe` para baixar e instalar.

**Opção 2: Envio direto**

Pegue o arquivo em `dist/` e envie por email/pendrive.

### ⚠️ Importante

- **1ª instalação = MANUAL** (cliente baixa e instala o .exe)
- **Próximas atualizações = AUTOMÁTICAS** (app atualiza sozinho)

---

## 🔄 Como Funciona a Atualização Automática

```
Você publica versão 2.1.0 no GitHub
         ↓
Cliente abre o app
         ↓
App detecta nova versão
         ↓
Baixa em segundo plano
         ↓
Instala ao fechar o app
         ↓
Cliente abre → versão atualizada!
```

**Configurações:**
- Verifica atualizações **5 segundos** após abrir
- Verifica **a cada 4 horas** enquanto está aberto
- **Só funciona em produção** (não em dev)

**Logs:**
```
%APPDATA%\etiquetas-desktop\logs\main.log
```

---

## ⚠️ Problemas Comuns

**Token não configurado**
```powershell
[System.Environment]::SetEnvironmentVariable("GH_TOKEN", "seu_token", "User")
```

**Build falhando**
```bash
npm run rebuild
npm run build
```

**Atualização não funciona**
- Verificar se está em modo produção (não dev)
- Checar logs em `%APPDATA%\etiquetas-desktop\logs\`
- Testar: `window.electron.updates.check()` no DevTools

**Windows SmartScreen bloqueando**
- Normal sem certificado de assinatura
- Cliente: "Mais informações" → "Executar assim mesmo"

---

## 📋 Resumo Rápido

```bash
# Configurar (1 vez)
1. Editar package.json (owner/repo)
2. Criar token GitHub
3. Configurar GH_TOKEN

# Deploy
npm version patch              # Atualizar versão
git push origin main --tags    # Enviar
npm run publish:prod           # Publicar

# Distribuir
Enviar link: github.com/seu-usuario/etiquetas-desktop/releases/latest
```

---

**⚠️ IMPORTANTE:**
- NUNCA commitar o token GH_TOKEN
- NUNCA compartilhar o token publicamente

