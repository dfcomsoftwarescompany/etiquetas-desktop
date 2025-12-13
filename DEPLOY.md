# Deploy - Etiquetas DFCOM

---

## 🚀 Deploy Rápido (projeto já configurado)

```bash
# 1. Atualizar versão
npm version patch

# 2. Enviar para GitHub
git push origin main --tags
```

**Pronto!** O GitHub Actions faz o build e publica automaticamente.

📦 Release disponível em: `https://github.com/dfcomsoftwarescompany/etiquetas-desktop/releases`

---

## 🆕 Primeira Configuração (novo desenvolvedor)

### 1. Clonar e instalar

```bash
git clone https://github.com/dfcomsoftwarescompany/etiquetas-desktop.git
cd etiquetas-desktop
npm install
```

### 2. Criar token GitHub

1. Acesse: https://github.com/settings/tokens
2. Clique em **"Generate new token (classic)"**
3. Marque: **`repo`**
4. Gere e copie o token

### 3. Adicionar token no repositório

1. Vá em: **Settings → Secrets and variables → Actions**
2. Clique em **"New repository secret"**
3. Nome: `GH_TOKEN`
4. Valor: (cole o token)
5. Salvar

### 4. Testar

```bash
npm start
```

✅ Pronto! Agora pode fazer deploy normalmente.

---

## 📝 Comandos úteis

| Comando | Descrição |
|---------|-----------|
| `npm start` | Rodar em desenvolvimento |
| `npm run build:test` | Gerar .exe sem publicar |
| `npm version patch` | Versão correção (2.0.1 → 2.0.2) |
| `npm version minor` | Versão nova feature (2.0.1 → 2.1.0) |

---

## 🔄 Atualização automática

Após o deploy, os clientes recebem a atualização automaticamente:

1. Cliente abre o app
2. App detecta nova versão
3. Baixa em segundo plano
4. Instala ao fechar

**Primeira instalação do cliente:** baixar .exe do GitHub Releases
