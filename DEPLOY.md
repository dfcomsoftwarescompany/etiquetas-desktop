# Deploy - Etiquetas DFCOM

O app é publicado em **3 canais independentes** (TEST, BETA e PROD). Cada canal gera um
instalador próprio, que já vem com a **URL do socket do seu ambiente** gravada dentro do pacote.

---

## 🌎 Canais

| Branch | Canal | Versão no `package.json` | App instalado | Release no GitHub |
|--------|-------|--------------------------|---------------|-------------------|
| `develop` | TEST | `2.0.73-env-test.1` | Etiquetas LOOPII TEST | pre-release |
| `beta` | BETA | `2.0.73-env-beta.1` | Etiquetas LOOPII BETA | pre-release |
| `main` | PROD | `2.0.73` | Etiquetas LOOPII | release |

Os três podem ser instalados **na mesma máquina** ao mesmo tempo: `appId`, nome do app,
atalhos e pasta de dados (token e impressoras) são separados por canal.

---

## 🚀 Deploy

```bash
# 1. Ajustar a versão conforme o canal da branch
#    develop -> 2.0.73-env-test.1 | beta -> 2.0.73-env-beta.1 | main -> 2.0.73

# 2. Commit e push na branch do ambiente
git push origin develop   # ou beta, ou main
```

O GitHub Actions descobre o canal pela branch, roda os testes, gera o instalador e publica
no GitHub Releases. Se a versão não bater com o canal, o build **falha antes de publicar**.

📦 Releases: `https://github.com/dfcomsoftwarescompany/etiquetas-desktop/releases`

---

## 🔑 Secrets necessários (uma vez)

Em **Settings → Secrets and variables → Actions**:

| Secret | Usado no canal | Conteúdo |
|--------|----------------|----------|
| `PRINTER_WS_URL_TEST` | TEST | URL do socket de teste (a mesma do sistema de avaliação em TEST) |
| `PRINTER_WS_URL_BETA` | BETA | URL do socket de beta |
| `PRINTER_WS_URL_PROD` | PROD | URL do socket de produção (opcional: sem o secret usa a URL padrão de produção) |

TEST e BETA **falham o build** sem o secret, para nunca publicar homologação apontando
para o socket de produção.

---

## 🧭 Como o app sabe o ambiente

No build, `scripts/generate-runtime-config.js` grava `build/runtime-config.json` dentro dos
resources do instalador:

```json
{
  "channel": "beta",
  "printerWsUrl": "https://socket-beta.../notifications-printer"
}
```

O app lê esse arquivo na inicialização e registra no log:
`[App] Canal: beta | socket: https://socket-beta.../notifications-printer`

Para apontar para outro socket só na sua máquina (dev/suporte), a variável de ambiente
`PRINTER_WS_URL` continua tendo prioridade sobre o arquivo:

```powershell
$env:PRINTER_WS_URL = "https://socket-beta.../notifications-printer"
npm start
```

O servidor HTTP local continua em `http://localhost:8547` nos três canais.

---

## 📝 Comandos úteis

| Comando | Descrição |
|---------|-----------|
| `npm start` | Rodar em desenvolvimento |
| `npm test` | Rodar os testes |
| `npm run build:test` | Gerar o .exe do canal TEST sem publicar |
| `npm run build:beta` | Gerar o .exe do canal BETA sem publicar |
| `npm run build:prod` | Gerar o .exe do canal PROD sem publicar |
| `npm run publish:<canal>` | Gerar e publicar (usado pelo CI) |

Builds locais de TEST e BETA exigem a URL do socket no ambiente:

```powershell
$env:PRINTER_WS_URL_BETA = "https://socket-beta.../notifications-printer"
npm run build:beta
```

---

## 🔄 Atualização automática

Cada canal só atualiza dentro dele mesmo:

- **PROD** procura a última release estável (`latest.yml`)
- **BETA** procura a última pre-release `-env-beta` (`env-beta.yml`)
- **TEST** procura a última pre-release `-env-test` (`env-test.yml`)

Por isso o sufixo na versão é obrigatório: é ele que separa os canais no GitHub Releases
e impede que uma máquina de homologação instale o build de produção.

**Primeira instalação:** baixar o .exe do canal desejado no GitHub Releases.

---

## 🆘 Deu erro?

| Mensagem | Causa | Solução |
|----------|-------|---------|
| `Canal beta exige versão no formato X.Y.Z-env-beta.N` | Versão sem sufixo do canal | Ajustar `version` no `package.json` |
| `Canal prod exige versão estável` | Versão com sufixo na `main` | Remover o sufixo antes de mergear |
| `Secret PRINTER_WS_URL_BETA não configurado` | Secret faltando | Cadastrar o secret no repositório |
| `Branch 'x' não tem canal configurado` | Push em branch sem canal | Usar `develop`, `beta` ou `main` |
| Tag já existe | Versão repetida | Incrementar a versão |
