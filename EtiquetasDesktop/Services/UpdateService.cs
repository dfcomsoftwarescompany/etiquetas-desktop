using System.Net.Http.Json;
using EtiquetasDesktop.Models;

namespace EtiquetasDesktop.Services;

public class UpdateService
{
    private const string VersionUrl = "http://meuservidor.com/update/version.json";
    public const string CurrentVersion = "1.0.0";

    private readonly HttpClient _httpClient;

    public UpdateService()
    {
        _httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
    }

    public async Task<(bool HasUpdate, VersionInfo? VersionInfo)> CheckForUpdatesAsync()
    {
        try
        {
            var versionInfo = await _httpClient.GetFromJsonAsync<VersionInfo>(VersionUrl);
            if (versionInfo == null) return (false, null);

            bool hasUpdate = CompareVersions(versionInfo.Version, CurrentVersion) > 0;
            return (hasUpdate, versionInfo);
        }
        catch
        {
            return (false, null);
        }
    }

    public async Task<string?> DownloadUpdateAsync(string downloadUrl, IProgress<int>? progress = null)
    {
        try
        {
            string tempPath = Path.Combine(Path.GetTempPath(), "EtiquetasDesktop_Update.exe");

            using var response = await _httpClient.GetAsync(downloadUrl, HttpCompletionOption.ResponseHeadersRead);
            response.EnsureSuccessStatusCode();

            var totalBytes = response.Content.Headers.ContentLength ?? -1;
            var downloadedBytes = 0L;

            await using var contentStream = await response.Content.ReadAsStreamAsync();
            await using var fileStream = new FileStream(tempPath, FileMode.Create, FileAccess.Write, FileShare.None);

            var buffer = new byte[8192];
            int bytesRead;

            while ((bytesRead = await contentStream.ReadAsync(buffer)) > 0)
            {
                await fileStream.WriteAsync(buffer.AsMemory(0, bytesRead));
                downloadedBytes += bytesRead;

                if (totalBytes > 0 && progress != null)
                {
                    progress.Report((int)((downloadedBytes * 100) / totalBytes));
                }
            }

            return tempPath;
        }
        catch
        {
            return null;
        }
    }

    private static int CompareVersions(string v1, string v2)
    {
        var parts1 = v1.Split('.').Select(int.Parse).ToArray();
        var parts2 = v2.Split('.').Select(int.Parse).ToArray();

        int maxLength = Math.Max(parts1.Length, parts2.Length);

        for (int i = 0; i < maxLength; i++)
        {
            int p1 = i < parts1.Length ? parts1[i] : 0;
            int p2 = i < parts2.Length ? parts2[i] : 0;

            if (p1 != p2) return p1 - p2;
        }

        return 0;
    }

    public async Task CheckAndNotifyAsync()
    {
        var (hasUpdate, versionInfo) = await CheckForUpdatesAsync();

        if (!hasUpdate || versionInfo == null) return;

        var result = MessageBox.Show(
            $"Nova versão ({versionInfo.Version}) disponível!\n\n" +
            $"Versão atual: {CurrentVersion}\n\nBaixar agora?",
            "Atualização Disponível",
            MessageBoxButtons.YesNo,
            MessageBoxIcon.Information
        );

        if (result == DialogResult.Yes)
        {
            await DownloadAndInstallAsync(versionInfo.DownloadUrl);
        }
    }

    private async Task DownloadAndInstallAsync(string downloadUrl)
    {
        var progressForm = new Form
        {
            Text = "Baixando Atualização",
            Size = new Size(400, 100),
            StartPosition = FormStartPosition.CenterScreen,
            FormBorderStyle = FormBorderStyle.FixedDialog,
            MaximizeBox = false,
            MinimizeBox = false
        };

        var progressBar = new ProgressBar { Dock = DockStyle.Fill, Style = ProgressBarStyle.Continuous };
        progressForm.Controls.Add(progressBar);
        progressForm.Show();

        try
        {
            var progress = new Progress<int>(percent => progressBar.Value = percent);
            string? installerPath = await DownloadUpdateAsync(downloadUrl, progress);

            progressForm.Close();

            if (installerPath != null)
            {
                var startResult = MessageBox.Show(
                    "Download concluído!\n\nIniciar instalação?",
                    "Instalação",
                    MessageBoxButtons.YesNo,
                    MessageBoxIcon.Question
                );

                if (startResult == DialogResult.Yes)
                {
                    System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
                    {
                        FileName = installerPath,
                        UseShellExecute = true
                    });
                    Application.Exit();
                }
            }
            else
            {
                MessageBox.Show("Falha ao baixar atualização.", "Erro", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
        catch
        {
            progressForm.Close();
            MessageBox.Show("Erro durante download.", "Erro", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}


