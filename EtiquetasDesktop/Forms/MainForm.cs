using EtiquetasDesktop.Services;

namespace EtiquetasDesktop.Forms;

public class MainForm : Form
{
    private readonly UpdateService _updateService;
    
    private ComboBox _cmbImpressoras = null!;
    private TextBox _txtTexto = null!;
    private TextBox _txtCodigoBarras = null!;
    private NumericUpDown _numLargura = null!;
    private NumericUpDown _numAltura = null!;
    private Button _btnImprimir = null!;
    private Button _btnAtualizar = null!;
    private Label _lblStatus = null!;

    public MainForm()
    {
        _updateService = new UpdateService();
        InitializeComponent();
    }

    private void InitializeComponent()
    {
        Text = "Etiquetas Desktop - Argox OS-2140";
        Size = new Size(550, 420);
        StartPosition = FormStartPosition.CenterScreen;
        FormBorderStyle = FormBorderStyle.FixedSingle;
        MaximizeBox = false;

        var mainPanel = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            Padding = new Padding(20),
            RowCount = 7,
            ColumnCount = 2
        };
        mainPanel.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 120));
        mainPanel.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));

        // Impressora
        mainPanel.Controls.Add(new Label { Text = "Impressora:", Anchor = AnchorStyles.Left, AutoSize = true }, 0, 0);
        
        var impressoraPanel = new FlowLayoutPanel { Dock = DockStyle.Fill, FlowDirection = FlowDirection.LeftToRight };
        _cmbImpressoras = new ComboBox { Width = 320, DropDownStyle = ComboBoxStyle.DropDownList };
        _btnAtualizar = new Button { Text = "↻", Width = 35, Height = 23 };
        _btnAtualizar.Click += BtnAtualizar_Click;
        impressoraPanel.Controls.Add(_cmbImpressoras);
        impressoraPanel.Controls.Add(_btnAtualizar);
        mainPanel.Controls.Add(impressoraPanel, 1, 0);

        // Texto
        mainPanel.Controls.Add(new Label { Text = "Texto:", Anchor = AnchorStyles.Left, AutoSize = true }, 0, 1);
        _txtTexto = new TextBox { Dock = DockStyle.Fill, Text = "Produto Teste" };
        mainPanel.Controls.Add(_txtTexto, 1, 1);

        // Código de barras
        mainPanel.Controls.Add(new Label { Text = "Código:", Anchor = AnchorStyles.Left, AutoSize = true }, 0, 2);
        _txtCodigoBarras = new TextBox { Dock = DockStyle.Fill, Text = "123456789" };
        mainPanel.Controls.Add(_txtCodigoBarras, 1, 2);

        // Largura
        mainPanel.Controls.Add(new Label { Text = "Largura (mm):", Anchor = AnchorStyles.Left, AutoSize = true }, 0, 3);
        _numLargura = new NumericUpDown { Minimum = 20, Maximum = 200, Value = 40, Width = 80 };  // Etiqueta 40x60mm
        mainPanel.Controls.Add(_numLargura, 1, 3);

        // Altura
        mainPanel.Controls.Add(new Label { Text = "Altura (mm):", Anchor = AnchorStyles.Left, AutoSize = true }, 0, 4);
        _numAltura = new NumericUpDown { Minimum = 10, Maximum = 200, Value = 60, Width = 80 };  // Etiqueta 40x60mm
        mainPanel.Controls.Add(_numAltura, 1, 4);

        // Botão imprimir
        _btnImprimir = new Button
        {
            Text = "🖨 Imprimir Etiqueta",
            Dock = DockStyle.Fill,
            Height = 45,
            Font = new Font(Font.FontFamily, 11, FontStyle.Bold),
            BackColor = Color.FromArgb(0, 120, 215),
            ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat
        };
        _btnImprimir.FlatAppearance.BorderSize = 0;
        _btnImprimir.Click += BtnImprimir_Click;
        mainPanel.SetColumnSpan(_btnImprimir, 2);
        mainPanel.Controls.Add(_btnImprimir, 0, 5);

        // Status
        _lblStatus = new Label
        {
            Text = $"Versão {UpdateService.CurrentVersion}",
            Dock = DockStyle.Fill,
            TextAlign = ContentAlignment.MiddleCenter,
            ForeColor = Color.Gray,
            Font = new Font(Font.FontFamily, 8)
        };
        mainPanel.SetColumnSpan(_lblStatus, 2);
        mainPanel.Controls.Add(_lblStatus, 0, 6);

        Controls.Add(mainPanel);

        Load += MainForm_Load;
    }

    private async void MainForm_Load(object? sender, EventArgs e)
    {
        CarregarImpressoras();

        // Verifica atualizações em segundo plano
        try
        {
            await _updateService.CheckAndNotifyAsync();
        }
        catch
        {
            // Ignora erros de atualização
        }
    }

    private void CarregarImpressoras()
    {
        _cmbImpressoras.Items.Clear();
        
        var impressoras = ArgoxPrinterService.GetInstalledPrinters();
        
        foreach (var impressora in impressoras)
        {
            _cmbImpressoras.Items.Add(impressora);
            
            if (impressora.Contains("Argox", StringComparison.OrdinalIgnoreCase))
            {
                _cmbImpressoras.SelectedItem = impressora;
            }
        }

        if (_cmbImpressoras.SelectedIndex < 0 && _cmbImpressoras.Items.Count > 0)
        {
            _cmbImpressoras.SelectedIndex = 0;
        }

        AtualizarStatus($"{impressoras.Count} impressora(s) encontrada(s)");
    }

    private void BtnAtualizar_Click(object? sender, EventArgs e)
    {
        CarregarImpressoras();
    }

    private void BtnImprimir_Click(object? sender, EventArgs e)
    {
        if (_cmbImpressoras.SelectedItem == null)
        {
            MessageBox.Show("Selecione uma impressora.", "Aviso", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }

        if (string.IsNullOrWhiteSpace(_txtTexto.Text))
        {
            MessageBox.Show("Informe o texto.", "Aviso", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            _txtTexto.Focus();
            return;
        }

        if (string.IsNullOrWhiteSpace(_txtCodigoBarras.Text))
        {
            MessageBox.Show("Informe o código de barras.", "Aviso", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            _txtCodigoBarras.Focus();
            return;
        }

        try
        {
            _btnImprimir.Enabled = false;
            _btnImprimir.Text = "Imprimindo...";
            AtualizarStatus("Enviando para impressora...");

            // Força atualização da UI
            Application.DoEvents();

            var printerService = new ArgoxPrinterService(_cmbImpressoras.SelectedItem.ToString()!);
            
            printerService.PrintLabel(
                _txtTexto.Text,
                _txtCodigoBarras.Text,
                (int)_numLargura.Value,
                (int)_numAltura.Value
            );

            AtualizarStatus("Etiqueta enviada com sucesso!");
            MessageBox.Show("Etiqueta enviada para impressão!", "Sucesso", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }
        catch (InvalidOperationException ex)
        {
            AtualizarStatus("Erro: Impressora não disponível");
            MessageBox.Show($"Impressora não disponível:\n\n{ex.Message}\n\nVerifique se a impressora está ligada e conectada.", "Erro", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
        catch (Exception ex)
        {
            AtualizarStatus("Erro na impressão");
            MessageBox.Show($"Erro ao imprimir:\n\n{ex.Message}\n\nDetalhes técnicos:\n{ex.GetType().Name}", "Erro", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
        finally
        {
            _btnImprimir.Enabled = true;
            _btnImprimir.Text = "🖨 Imprimir Etiqueta";
        }
    }

    private void AtualizarStatus(string mensagem)
    {
        _lblStatus.Text = $"Versão {UpdateService.CurrentVersion} | {mensagem}";
    }
}

