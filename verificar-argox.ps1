# Script de Verificação - Argox OS-2140
# Verifica configuração e status da impressora

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  VERIFICAÇÃO ARGOX OS-2140 PPLA" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verifica se impressora está instalada
Write-Host "1. Procurando impressora Argox..." -ForegroundColor Yellow
$argox = Get-Printer | Where-Object {$_.Name -like "*Argox*"}

if ($argox) {
    Write-Host "   ✓ Impressora encontrada: $($argox.Name)" -ForegroundColor Green
    Write-Host "   - Status: $($argox.PrinterStatus)" -ForegroundColor White
    Write-Host "   - Porta: $($argox.PortName)" -ForegroundColor White
    Write-Host "   - Driver: $($argox.DriverName)" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "   ✗ ERRO: Nenhuma impressora Argox encontrada!" -ForegroundColor Red
    Write-Host "   Instale o driver da Argox OS-2140 PPLA" -ForegroundColor Yellow
    Write-Host ""
    exit
}

# 2. Verifica status
Write-Host "2. Verificando status..." -ForegroundColor Yellow
if ($argox.PrinterStatus -eq "Normal" -or $argox.PrinterStatus -eq "Idle") {
    Write-Host "   ✓ Status: OK (Pronta para imprimir)" -ForegroundColor Green
} else {
    Write-Host "   ⚠ Status: $($argox.PrinterStatus)" -ForegroundColor Yellow
    Write-Host "   Verifique se a impressora está ligada e sem erros" -ForegroundColor Yellow
}
Write-Host ""

# 3. Verifica fila de impressão
Write-Host "3. Verificando fila de impressão..." -ForegroundColor Yellow
$jobs = Get-PrintJob -PrinterName $argox.Name -ErrorAction SilentlyContinue

if ($jobs) {
    Write-Host "   ⚠ Existem $($jobs.Count) trabalho(s) na fila:" -ForegroundColor Yellow
    foreach ($job in $jobs) {
        Write-Host "     - $($job.DocumentName) (ID: $($job.ID), Status: $($job.JobStatus))" -ForegroundColor White
    }
    
    $limpar = Read-Host "`n   Deseja limpar a fila? (S/N)"
    if ($limpar -eq "S" -or $limpar -eq "s") {
        $jobs | Remove-PrintJob
        Write-Host "   ✓ Fila limpa!" -ForegroundColor Green
    }
} else {
    Write-Host "   ✓ Fila vazia" -ForegroundColor Green
}
Write-Host ""

# 4. Verifica porta
Write-Host "4. Verificando porta..." -ForegroundColor Yellow
$porta = Get-PrinterPort -Name $argox.PortName -ErrorAction SilentlyContinue

if ($porta) {
    Write-Host "   ✓ Porta configurada: $($porta.Name)" -ForegroundColor Green
    Write-Host "   - Tipo: $($porta.Description)" -ForegroundColor White
    
    if ($porta.Name -like "USB*") {
        Write-Host "   - Conexão: USB" -ForegroundColor White
    }
} else {
    Write-Host "   ⚠ Porta não encontrada ou não acessível" -ForegroundColor Yellow
}
Write-Host ""

# 5. Testa impressão (opcional)
Write-Host "5. Teste de impressão" -ForegroundColor Yellow
$testar = Read-Host "   Deseja imprimir etiqueta de teste? (S/N)"

if ($testar -eq "S" -or $testar -eq "s") {
    Write-Host "   Enviando etiqueta de teste..." -ForegroundColor Cyan
    
    # Cria arquivo de teste com texto simples
    $testFile = [System.IO.Path]::GetTempFileName()
    $testContent = @"
============================
   TESTE ARGOX OS-2140
============================

Data/Hora: $(Get-Date -Format "dd/MM/yyyy HH:mm:ss")
Computador: $env:COMPUTERNAME
Usuario: $env:USERNAME

Status: OK
============================
"@
    
    [System.IO.File]::WriteAllText($testFile, $testContent)
    
    try {
        Start-Process -FilePath "print" -ArgumentList "/D:`"$($argox.Name)`" `"$testFile`"" -Wait -NoNewWindow
        Write-Host "   ✓ Teste enviado!" -ForegroundColor Green
        Write-Host "   Verifique se a etiqueta foi impressa." -ForegroundColor White
    }
    catch {
        Write-Host "   ✗ Erro ao enviar teste: $_" -ForegroundColor Red
    }
    finally {
        Remove-Item $testFile -ErrorAction SilentlyContinue
    }
}
Write-Host ""

# 6. Informações adicionais
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESUMO DA CONFIGURAÇÃO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Nome completo: $($argox.Name)" -ForegroundColor White
Write-Host "Compartilhada: $($argox.Shared)" -ForegroundColor White
Write-Host "Jobs na fila: $(if($jobs){$jobs.Count}else{0})" -ForegroundColor White
Write-Host ""

# 7. Recomendações
Write-Host "RECOMENDAÇÕES:" -ForegroundColor Yellow
Write-Host "1. Certifique-se que o modo de emulação está em PPLA" -ForegroundColor White
Write-Host "2. Configure temperatura entre 10-12 nas propriedades" -ForegroundColor White
Write-Host "3. Use etiquetas de 100mm x 50mm (padrão do aplicativo)" -ForegroundColor White
Write-Host ""

Write-Host "Para mais detalhes, consulte: CONFIGURACAO_ARGOX.md" -ForegroundColor Cyan
Write-Host ""

Read-Host "Pressione Enter para sair"


