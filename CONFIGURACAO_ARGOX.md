# Guia de Configuração: Argox OS-2140 PPLA

## 🔧 1. CONFIGURAÇÃO FÍSICA DA IMPRESSORA

### 1.1. Verifique o Cabo
- **USB**: Conecte o cabo USB na impressora e no computador
- **Energia**: Ligue a impressora na tomada

### 1.2. Ligue a Impressora
1. Pressione o botão POWER
2. Aguarde a luz verde acender (Status Ready)
3. A impressora fará um autoteste

### 1.3. Configure o Modo de Emulação (IMPORTANTE!)
A Argox OS-2140 suporta 3 modos: **PPLA**, PPLB, PPLZ

**DEVE ESTAR EM MODO PPLA!**

Para verificar/alterar:
1. Desligue a impressora
2. Segure o botão FEED
3. Ligue a impressora (ainda segurando FEED)
4. Solte quando começar a imprimir
5. Verifique na etiqueta impressa: `Emulation Mode: PPLA`

Se não estiver em PPLA:
- Entre no modo setup (botão FEED ao ligar)
- Use os botões para navegar até "Emulation"
- Selecione "PPLA"
- Salve e reinicie

---

## 🪟 2. INSTALAÇÃO DO DRIVER NO WINDOWS

### 2.1. Baixar Driver Oficial
1. Acesse: https://www.argox.com.br/suporte/downloads
2. Procure por: **Argox OS-2140 Driver Windows**
3. Baixe o driver PPLA mais recente

### 2.2. Instalar Driver
1. Execute o instalador como Administrador
2. Siga o assistente de instalação
3. Quando perguntado, selecione:
   - **Modelo**: Argox OS-2140 PPLA
   - **Porta**: USB001 (ou porta detectada automaticamente)
4. Finalize a instalação

### 2.3. Verificar Instalação
```powershell
# Execute no PowerShell para verificar:
Get-Printer | Where-Object {$_.Name -like "*Argox*"}
```

**Deve aparecer**: `Argox OS-2140 PPLA` com status `Ready`

---

## ⚙️ 3. CONFIGURAÇÃO DO DRIVER

### 3.1. Abrir Propriedades da Impressora
1. Pressione `Win + R`
2. Digite: `control printers`
3. Clique com botão direito em **Argox OS-2140 PPLA**
4. Selecione **Propriedades da impressora**

### 3.2. Configurações Recomendadas

#### Aba "Geral"
- Clique em **Preferências de Impressão**

#### Aba "Papel/Qualidade"
- **Tamanho do papel**: 100mm x 50mm (ou personalize conforme sua etiqueta)
- **Orientação**: Retrato
- **Qualidade**: 203 DPI

#### Aba "Avançado"
- **Velocidade de impressão**: 4 (média)
- **Densidade/Temperatura**: 10 (média)
  - Se impressão muito clara: aumente para 12-14
  - Se impressão muito escura/borrando: diminua para 8-9
- **Modo de impressão**: Transferência Térmica ou Térmica Direta
  - **Térmica Direta**: etiqueta sensível ao calor (não precisa ribbon)
  - **Transferência Térmica**: etiqueta comum + ribbon

#### Aba "Portas"
- Porta selecionada: **USB001** (ou a detectada)
- ☑️ Marque: **Ativar suporte bidirecional**
- ☑️ Marque: **Ativar pool de impressoras** (apenas se tiver múltiplas)

### 3.3. Teste de Impressão do Windows
1. Ainda em Propriedades
2. Aba **Geral**
3. Clique em **Imprimir Página de Teste**
4. **Deve imprimir uma etiqueta com informações do driver**

Se NÃO imprimir:
- Verifique se a impressora está ligada
- Verifique cabo USB
- Tente trocar de porta USB
- Reinstale o driver

---

## 🔗 4. COMPARTILHAMENTO DE REDE (Opcional - Como no Delphi)

O código Delphi usa `\\127.0.0.1\Argox` (compartilhamento local).

### 4.1. Compartilhar Impressora
1. Propriedades da impressora
2. Aba **Compartilhamento**
3. ☑️ **Compartilhar esta impressora**
4. **Nome do compartilhamento**: `Argox`
5. Clique em **OK**

### 4.2. Testar Acesso Compartilhado
```powershell
# No PowerShell, teste:
Get-Printer -Name "\\127.0.0.1\Argox" -ErrorAction SilentlyContinue
```

Se aparecer a impressora, está funcionando!

---

## 🧪 5. TESTE NO APLICATIVO .NET

### 5.1. Execute o Aplicativo
```powershell
cd C:\Users\matheussilva\Documents\projetos\dfcom\etiquetas-desktop\EtiquetasDesktop
dotnet run
```

### 5.2. Verificações no Aplicativo
1. Na lista de impressoras, deve aparecer: **Argox OS-2140 PPLA**
   - Se não aparecer, clique no botão **↻** (atualizar)
2. Selecione a impressora
3. Digite um texto: `TESTE ARGOX`
4. Digite código: `123456789`
5. Clique em **🖨 Imprimir Etiqueta**

### 5.3. O que Deve Acontecer
✅ QR Code impresso à esquerda  
✅ Texto impresso à direita  
✅ Código impresso abaixo do texto  

---

## 🐛 6. SOLUÇÃO DE PROBLEMAS

### Problema: "Impressora não está disponível"
**Soluções:**
```powershell
# 1. Reinicie o serviço de spooler
net stop spooler
net start spooler

# 2. Verifique status
Get-Printer -Name "Argox OS-2140 PPLA" | Select-Object Name, PrinterStatus, JobCount
```

### Problema: "Impressora imprime, mas etiqueta sai em branco"
**Causas:**
- **Temperatura muito baixa**: Aumente para 12-14 nas propriedades
- **Ribbon acabou** (se usar transferência térmica)
- **Etiqueta incompatível**: Use etiqueta térmica direta ou com ribbon

### Problema: "Impressora imprime caracteres estranhos"
**Causas:**
- **Modo de emulação errado**: Configure para PPLA (veja seção 1.3)
- **Driver errado instalado**: Reinstale o driver PPLA

### Problema: "Impressão está cortada ou desalinhada"
**Soluções:**
1. Ajuste o tamanho do papel nas propriedades
2. Calibre a impressora:
   - Desligue
   - Segure PAUSE
   - Ligue (ainda segurando)
   - Solte quando começar a calibrar
   - Impressora detectará automaticamente o tamanho

### Problema: "Erro de comunicação USB"
**Soluções:**
1. Troque de porta USB (use USB 2.0, não 3.0)
2. Remova hub USB, conecte direto no PC
3. Atualize drivers USB do chipset (site do fabricante do PC/placa-mãe)

---

## 📊 7. ESPECIFICAÇÕES TÉCNICAS

### Argox OS-2140 PPLA
- **Resolução**: 203 DPI
- **Largura máxima**: 104mm
- **Velocidade**: até 127mm/s
- **Memória**: 4MB Flash, 8MB SDRAM
- **Interfaces**: USB, Serial (RS-232)
- **Emulações**: PPLA, PPLB, PPLZ

### Tamanhos de Etiqueta Compatíveis
- Mínimo: 25mm x 10mm
- Máximo: 104mm x 991mm
- **Padrão (nosso app)**: 100mm x 50mm

---

## 📞 8. SUPORTE

### Argox Brasil
- Site: https://www.argox.com.br
- Suporte: suporte@argox.com.br
- Downloads: https://www.argox.com.br/suporte/downloads

### Documentação
- Manual do usuário: Incluído com a impressora
- PPLA Programming Guide: Disponível no site

---

## ✅ CHECKLIST FINAL

Antes de usar o aplicativo, confirme:

- [ ] Impressora ligada e luz verde acesa
- [ ] Modo de emulação: **PPLA**
- [ ] Driver instalado: **Argox OS-2140 PPLA**
- [ ] Cabo USB conectado
- [ ] Etiquetas carregadas corretamente
- [ ] Ribbon instalado (se transferência térmica)
- [ ] Página de teste do Windows imprime OK
- [ ] Impressora aparece no aplicativo .NET
- [ ] Temperatura configurada: **10-12**
- [ ] Velocidade configurada: **4**

---

## 🎯 CONFIGURAÇÃO RÁPIDA (Resumo)

```powershell
# 1. Verifique se impressora está instalada
Get-Printer -Name "*Argox*"

# 2. Teste status
Get-PrintJob -PrinterName "Argox OS-2140 PPLA"

# 3. Limpe fila se necessário
Get-PrintJob -PrinterName "Argox OS-2140 PPLA" | Remove-PrintJob

# 4. Execute o aplicativo
cd C:\Users\matheussilva\Documents\projetos\dfcom\etiquetas-desktop\EtiquetasDesktop
dotnet run
```

**Agora está pronto para imprimir! 🚀**


