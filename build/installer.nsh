; Script customizado NSIS para Etiquetas DFCOM
; Este arquivo é usado pelo electron-builder para personalizar o instalador

!macro preInit
  ; Esta macro é executada antes do instalador iniciar
!macroend

!macro customHeader
  ; Adiciona funcionalidade para detectar e fechar processos em execução
!macroend

!macro customInit
  ; Fechar aplicação se estiver rodando antes de instalar
  nsExec::Exec 'taskkill /F /IM "Etiquetas DFCOM.exe"'
  Pop $0
  
  ; Aguardar um momento para garantir que processos foram fechados
  Sleep 500
!macroend

!macro customUnInit
  ; Fechar aplicação antes de desinstalar
  nsExec::Exec 'taskkill /F /IM "Etiquetas DFCOM.exe"'
  Pop $0
  Sleep 500
!macroend

!macro customInstall
  ; Código customizado após instalação
!macroend

!macro customUnInstall
  ; Código customizado para desinstalação
  ; Remove dados da aplicação se necessário
!macroend

!macro customInstallMode
  ; Force per-user installation (não requer admin)
  !define MULTIUSER_INSTALLMODE_DEFAULT_CURRENTUSER
!macroend
