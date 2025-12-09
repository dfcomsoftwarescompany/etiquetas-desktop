using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Printing;
using System.Drawing.Text;
using ZXing;
using ZXing.Common;

namespace EtiquetasDesktop.Services;

/// <summary>
/// Serviço para impressão de etiquetas na Argox OS-2140 PPLA.
/// Usa PrintDocument para desenhar graficamente (compatível com drivers Windows).
/// </summary>
public class ArgoxPrinterService
{
    private readonly string _printerName;
    private string _texto = string.Empty;
    private string _codigoBarras = string.Empty;
    private int _larguraMm = 100;
    private int _alturaMm = 50;

    public ArgoxPrinterService(string printerName)
    {
        _printerName = printerName ?? throw new ArgumentNullException(nameof(printerName));
    }

    /// <summary>
    /// Retorna lista de impressoras instaladas no sistema.
    /// </summary>
    public static List<string> GetInstalledPrinters()
    {
        var printers = new List<string>();
        foreach (string printer in PrinterSettings.InstalledPrinters)
        {
            printers.Add(printer);
        }
        return printers;
    }

    /// <summary>
    /// Imprime etiqueta com texto e código de barras.
    /// Padrão: Etiqueta Tag 40x60 2c Roupas Preço (Argox OS-214/2140)
    /// </summary>
    public bool PrintLabel(string texto, string codigoBarras, int larguraMm = 40, int alturaMm = 60)
    {
        _texto = texto;
        _codigoBarras = codigoBarras;
        _larguraMm = larguraMm;
        _alturaMm = alturaMm;

        try
        {
            var printDocument = new PrintDocument();
            printDocument.PrinterSettings.PrinterName = _printerName;
            
            // CORREÇÃO BUG 2: Valida se impressora é válida
            if (!printDocument.PrinterSettings.IsValid)
            {
                throw new InvalidOperationException($"Impressora '{_printerName}' não está disponível.");
            }
            
            // CORREÇÃO BUG 3: Tenta usar papel existente ou cria customizado
            var paperSize = FindMatchingPaperSize(printDocument.PrinterSettings, larguraMm, alturaMm);
            if (paperSize != null)
            {
                printDocument.DefaultPageSettings.PaperSize = paperSize;
            }
            else
            {
                // Cria tamanho customizado
                printDocument.DefaultPageSettings.PaperSize = new PaperSize("Etiqueta", 
                    MmToHundredthsOfInch(larguraMm), 
                    MmToHundredthsOfInch(alturaMm));
            }
            
            // CORREÇÃO BUG 4: Define orientação
            printDocument.DefaultPageSettings.Landscape = larguraMm > alturaMm;
            
            printDocument.DefaultPageSettings.Margins = new Margins(0, 0, 0, 0);
            
            printDocument.PrintPage += PrintDocument_PrintPage;
            
            printDocument.Print();
            
            return true;
        }
        catch (Exception ex)
        {
            // CORREÇÃO BUG 7: Loga erro específico
            System.Diagnostics.Debug.WriteLine($"Erro ao imprimir: {ex.Message}");
            throw;
        }
    }
    
    /// <summary>
    /// Procura um tamanho de papel compatível já configurado na impressora.
    /// </summary>
    private PaperSize? FindMatchingPaperSize(PrinterSettings settings, int targetMm, int targetAlturaMm)
    {
        foreach (PaperSize size in settings.PaperSizes)
        {
            // Converte de centésimos de polegada para mm
            int widthMm = (int)(size.Width * 25.4 / 100);
            int heightMm = (int)(size.Height * 25.4 / 100);
            
            // Tolerância de 2mm
            if (Math.Abs(widthMm - targetMm) <= 2 && Math.Abs(heightMm - targetAlturaMm) <= 2)
            {
                return size;
            }
        }
        return null;
    }

    private void PrintDocument_PrintPage(object sender, PrintPageEventArgs e)
    {
        if (e.Graphics == null) return;

        Graphics g = e.Graphics;
        
        // CORREÇÃO BUG 6: Define unidade de medida e qualidade
        g.PageUnit = GraphicsUnit.Pixel;
        g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.HighQuality;
        g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.AntiAliasGridFit;
        
        // Converte mm para pixels (considerando DPI da impressora)
        float dpiX = g.DpiX;  // Geralmente 203 DPI para Argox OS-2140
        float dpiY = g.DpiY;
        
        float larguraPx = MmToPixels(_larguraMm, dpiX);
        float alturaPx = MmToPixels(_alturaMm, dpiY);

        // Fundo branco
        g.Clear(Color.White);

        try
        {
            // CORREÇÃO BUG 1: Gera QR Code corretamente usando PixelData
            var writer = new BarcodeWriterPixelData
            {
                Format = BarcodeFormat.QR_CODE,
                Options = new EncodingOptions
                {
                    Height = 120,  // Reduzido para etiquetas 40x60mm
                    Width = 120,
                    Margin = 1
                }
            };

            var pixelData = writer.Write(_codigoBarras);
            
            // Converte PixelData para Bitmap corretamente
            using (var qrBitmap = new Bitmap(pixelData.Width, pixelData.Height, System.Drawing.Imaging.PixelFormat.Format32bppArgb))
            {
                var bitmapData = qrBitmap.LockBits(
                    new Rectangle(0, 0, pixelData.Width, pixelData.Height),
                    System.Drawing.Imaging.ImageLockMode.WriteOnly,
                    System.Drawing.Imaging.PixelFormat.Format32bppArgb);
                
                try
                {
                    System.Runtime.InteropServices.Marshal.Copy(
                        pixelData.Pixels, 
                        0, 
                        bitmapData.Scan0, 
                        pixelData.Pixels.Length);
                }
                finally
                {
                    qrBitmap.UnlockBits(bitmapData);
                }
            
                // CORREÇÃO BUG 5: Coordenadas proporcionais ao tamanho da etiqueta
                // Para etiquetas 40x60mm: QR Code menor, otimizado para espaço
                float qrSize = Math.Min(larguraPx * 0.5f, alturaPx * 0.35f);  // ~25mm para 40x60
                float qrX = 10;
                float qrY = (alturaPx - qrSize) / 2;
                
                g.DrawImage(qrBitmap, qrX, qrY, qrSize, qrSize);
                
                // Posiciona texto à direita do QR Code
                float textX = qrX + qrSize + 10;
                float textY = qrY;
                float textWidth = larguraPx - textX - 10;
                
                // Desenha texto do produto (fonte ajustada para etiqueta pequena)
                using (var font = new Font("Arial", 11, FontStyle.Bold))
                {
                    var textFormat = new StringFormat
                    {
                        Alignment = StringAlignment.Near,
                        LineAlignment = StringAlignment.Near,
                        Trimming = StringTrimming.EllipsisCharacter
                    };
                    
                    g.DrawString(_texto, font, Brushes.Black, 
                        new RectangleF(textX, textY, textWidth, 40), 
                        textFormat);
                }

                // Desenha código de barras como texto (fonte reduzida)
                using (var fontSmall = new Font("Arial", 8, FontStyle.Regular))
                {
                    g.DrawString(_codigoBarras, fontSmall, Brushes.Black, 
                        new PointF(textX, textY + 45));
                }
            }
        }
        catch (Exception ex)
        {
            // Fallback: apenas texto se houver erro
            System.Diagnostics.Debug.WriteLine($"Erro ao gerar etiqueta: {ex.Message}");
            
            using (var font = new Font("Arial", 12, FontStyle.Regular))
            {
                g.DrawString($"{_texto}\n{_codigoBarras}", 
                    font, 
                    Brushes.Black, 
                    new RectangleF(10, 10, larguraPx - 20, alturaPx - 20));
            }
        }

        e.HasMorePages = false;
    }

    /// <summary>
    /// Converte milímetros para centésimos de polegada (usado pelo PrintDocument).
    /// </summary>
    private static int MmToHundredthsOfInch(int mm)
    {
        return (int)(mm / 25.4 * 100);
    }

    /// <summary>
    /// Converte milímetros para pixels baseado no DPI.
    /// </summary>
    private static float MmToPixels(int mm, float dpi)
    {
        return mm / 25.4f * dpi;
    }

    /// <summary>
    /// Testa conexão com a impressora.
    /// </summary>
    public bool TestConnection()
    {
        try
        {
            var ps = new PrinterSettings { PrinterName = _printerName };
            return ps.IsValid;
        }
        catch
        {
            return false;
        }
    }
}

