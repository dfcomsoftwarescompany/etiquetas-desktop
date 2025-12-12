# Impressão Argox OS-2140 - Modo Correto

## ⚠️ NÃO usar PPLA RAW

**A abordagem correta é usar Canvas + Driver Windows**, não enviar comandos PPLA diretamente.

## Como Funciona

1. **Canvas (node-canvas)**: Desenha a etiqueta como imagem (texto, QR code, layout)
2. **Electron Print API**: Envia a imagem para o driver Windows da impressora
3. **Driver Windows**: Converte automaticamente para PPLA e envia para a impressora

## Posição e Rotação

- **Canvas individual**: Desenha normal (sem rotação)
- **Canvas completo (2 colunas)**: Rotaciona 180° antes de desenhar as etiquetas
- **Resultado físico**: Etiqueta sai de cabeça para baixo (correto para a impressora)

## Layout

- **Dimensões**: 40mm x 60mm (etiqueta individual)
- **Papel**: 80mm x 60mm (2 colunas lado a lado)
- **Área Superior (44mm)**: Info (DFCOM, QR, REF, Nome, Tamanho)
- **Área Inferior (16mm)**: Preço (R$)

## DPI

- **203 DPI** (Argox OS-2140 padrão)
- Conversão: `pixels = mm * (203 / 25.4)`


