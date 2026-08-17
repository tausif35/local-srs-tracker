using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows.Forms;

namespace SrsTrackerLauncher
{
    internal static class Program
    {
        private const int Port = 3210;
        private const string HealthUrl = "http://127.0.0.1:3210/api/health";
        private const string AppUrl = "http://127.0.0.1:3210";

        [STAThread]
        private static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            string baseDirectory = AppDomain.CurrentDomain.BaseDirectory;
            string localRoot = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "SRS Tracker");
            string logDirectory = Path.Combine(localRoot, "logs");
            Directory.CreateDirectory(logDirectory);
            string logPath = Path.Combine(logDirectory, "launcher.log");

            try
            {
                Log(logPath, "Launcher started.");
                if (IsReady()) { Log(logPath, "Reusing running server."); OpenBrowser(); return; }

                string nodePath = Path.Combine(baseDirectory, "runtime", "node.exe");
                string serverPath = Path.Combine(baseDirectory, "app", "server.js");
                if (!File.Exists(nodePath) || !File.Exists(serverPath))
                    throw new FileNotFoundException("The packaged server is incomplete. Run npm run package:win again.");

                string dataDirectory = Path.Combine(localRoot, "data");
                Directory.CreateDirectory(dataDirectory);
                string registryPath = Path.Combine(dataDirectory, "registry.json");
                string seedRegistry = Path.Combine(baseDirectory, "seed", "registry.json");
                if (!File.Exists(registryPath)) File.Copy(seedRegistry, registryPath);

                string serverLog = Path.Combine(logDirectory, "server.log");
                string command = string.Format("\"\"{0}\" \"{1}\" >> \"{2}\" 2>&1\"", nodePath, serverPath, serverLog);
                ProcessStartInfo startInfo = new ProcessStartInfo
                {
                    FileName = Environment.GetEnvironmentVariable("COMSPEC") ?? "cmd.exe",
                    Arguments = "/d /s /c " + command,
                    WorkingDirectory = Path.Combine(baseDirectory, "app"),
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    WindowStyle = ProcessWindowStyle.Hidden
                };
                startInfo.EnvironmentVariables["PORT"] = Port.ToString();
                startInfo.EnvironmentVariables["HOSTNAME"] = "127.0.0.1";
                startInfo.EnvironmentVariables["TRACKER_REGISTRY_PATH"] = registryPath;

                Process server = Process.Start(startInfo);
                if (server == null) throw new InvalidOperationException("Unable to start the packaged server.");
                Log(logPath, "Started server process " + server.Id + ".");
                for (int attempt = 0; attempt < 60; attempt++)
                {
                    if (IsReady()) { Log(logPath, "Server is ready."); OpenBrowser(); return; }
                    if (server.HasExited)
                        throw new InvalidOperationException("The server exited with code " + server.ExitCode + ". See " + serverLog);
                    Thread.Sleep(500);
                }
                throw new TimeoutException("The server did not become ready within 30 seconds. See " + serverLog);
            }
            catch (Exception exception)
            {
                Log(logPath, exception.ToString());
                MessageBox.Show("SRS Tracker could not start.\n\n" + exception.Message + "\n\nLog: " + logPath, "SRS Tracker", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private static bool IsReady()
        {
            try
            {
                HttpWebRequest request = (HttpWebRequest)WebRequest.Create(HealthUrl);
                request.Timeout = 1000;
                request.ReadWriteTimeout = 1000;
                using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
                using (StreamReader reader = new StreamReader(response.GetResponseStream()))
                {
                    string body = reader.ReadToEnd().Replace(" ", "").Replace("\r", "").Replace("\n", "");
                    return response.StatusCode == HttpStatusCode.OK && body.Contains("\"app\":\"srs-tracker\"");
                }
            }
            catch { return false; }
        }

        private static void OpenBrowser() { Process.Start(AppUrl); }
        private static void Log(string path, string message) { File.AppendAllText(path, DateTimeOffset.Now.ToString("O") + " " + message + Environment.NewLine); }
    }
}
