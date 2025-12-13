# 🚀 Como Fazer Deploy

## 📝 Processo Simples

### 1️⃣ Fazer suas alterações
```bash
git checkout -b feature/minha-alteracao
# ... fazer alterações no código ...
git add .
git commit -m "descrição das alterações"
```

### 2️⃣ Incrementar a versão no package.json
```json
{
  "version": "2.0.7"  // Mudar de 2.0.6 para 2.0.7
}
```

**Tipos de versão:**
- `2.0.6 → 2.0.7` = Correção/pequena mudança (patch)
- `2.0.6 → 2.1.0` = Nova funcionalidade (minor)
- `2.0.6 → 3.0.0` = Mudança grande (major)

### 3️⃣ Commit da nova versão
```bash
git add package.json
git commit -m "chore: versão 2.0.7"
```

### 4️⃣ Fazer merge para main
```bash
git checkout main
git merge feature/minha-alteracao
git push origin main
```

### 5️⃣ PRONTO! 🎉
O workflow automaticamente:
- ✅ Faz o build
- ✅ Cria a tag v2.0.7
- ✅ Publica no GitHub Releases
- ✅ Usuários recebem atualização automática!

## ⚠️ Importante

- **SEMPRE** incremente a versão antes do push para main
- **NUNCA** use a mesma versão duas vezes
- Se esquecer de incrementar, o workflow vai dar erro (isso é bom!)

## 🔄 Como os usuários recebem a atualização?

O aplicativo tem **electron-updater** configurado que:
1. Verifica o GitHub Releases automaticamente
2. Compara a versão instalada com a disponível
3. Se houver versão nova, baixa e instala automaticamente
4. Usuário só precisa reiniciar o app!

## 🆘 Deu erro?

Se o workflow der erro dizendo "Tag já existe":
1. Significa que você esqueceu de incrementar a versão
2. Abra o `package.json`
3. Incremente a versão
4. Commit e push novamente

---

**É isso! Simples e direto.** 🚀
