# 🚀 Como Fazer Deploy

Guia rápido. O detalhamento (canais, secrets, auto-update) está em [DEPLOY.md](DEPLOY.md).

## 1️⃣ Escolher a branch do ambiente

| Ambiente | Branch | Formato da versão |
|----------|--------|-------------------|
| TEST | `develop` | `2.0.74-test` |
| BETA | `beta` | `2.0.74-beta` |
| PROD | `main` | `2.0.74-main` |

## 2️⃣ Fazer as alterações

```bash
git checkout -b feature/minha-alteracao
# ... alterações ...
npm test
git commit -am "descrição das alterações"
```

## 3️⃣ Incrementar a versão no package.json

Use o formato da branch de destino:

```json
{
  "version": "2.0.74-beta"
}
```

- Correção/pequena mudança: `2.0.73 → 2.0.74`
- Nova funcionalidade: `2.0.73 → 2.1.0`
- Mudança grande: `2.0.73 → 3.0.0`
- Novo build no mesmo ambiente: `-beta → -beta.2`

## 4️⃣ Merge na branch do ambiente

```bash
git checkout beta          # ou develop, ou main
git merge feature/minha-alteracao
git push origin beta
```

## 5️⃣ PRONTO! 🎉

O workflow automaticamente:
- ✅ Descobre o canal pela branch
- ✅ Roda os testes
- ✅ Grava a URL do socket do ambiente no instalador
- ✅ Publica no GitHub Releases (pre-release em TEST/BETA)
- ✅ Usuários do mesmo canal recebem a atualização

## ⚠️ Importante

- **SEMPRE** incremente a versão antes do push
- **NUNCA** use a mesma versão duas vezes
- A versão precisa casar com o canal da branch, senão o build falha de propósito

## 🆘 Deu erro?

Veja a tabela de erros no final do [DEPLOY.md](DEPLOY.md).

---

**É isso! Simples e direto.** 🚀
