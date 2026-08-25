param([switch]$NoOpen)

$ErrorActionPreference = "Stop"

$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$appUrl = "http://localhost:3000/"
$localNode = Join-Path $projectDir "node_modules\.bin\node.exe"
$vinextCli = Join-Path $projectDir "node_modules\vinext\dist\cli.js"
$workDir = Join-Path $projectDir "work"
$logPath = Join-Path $workDir "tank-designer.log"

New-Item -ItemType Directory -Force -Path $workDir | Out-Null

function Test-TankDesigner {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $appUrl -TimeoutSec 2
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

if (-not (Test-TankDesigner)) {
  if (-not (Test-Path -LiteralPath $localNode) -or -not (Test-Path -LiteralPath $vinextCli)) {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show(
      "Application components are missing. Run npm install in the project folder first.",
      "TankWorks Tank Designer",
      "OK",
      "Information"
    ) | Out-Null
    exit 1
  }

  # Start-Process joins ArgumentList into one Windows command line. The quotes are
  # required because this project path contains spaces (for example "Fu Zhihao").
  Start-Process -FilePath $localNode `
    -ArgumentList @("`"$vinextCli`"", "dev", "--host", "127.0.0.1") `
    -WorkingDirectory $projectDir `
    -WindowStyle Hidden `
    -RedirectStandardOutput $logPath `
    -RedirectStandardError (Join-Path $workDir "tank-designer-error.log")

  $ready = $false
  for ($attempt = 0; $attempt -lt 120; $attempt++) {
    Start-Sleep -Milliseconds 500
    if (Test-TankDesigner) { $ready = $true; break }
  }

  if (-not $ready) {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show(
      "储罐设计器启动失败。请查看项目目录 work\tank-designer-error.log，或把该文件发给技术人员。",
      "TankWorks 储罐设计器",
      "OK",
      "Error"
    ) | Out-Null
    exit 1
  }
}

if ($NoOpen) { exit 0 }

$browserCandidates = @(
  "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "${env:LOCALAPPDATA}\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe"
)
$browserPath = $browserCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

if ($browserPath) {
  Start-Process -FilePath $browserPath -ArgumentList @(
    "--app=$appUrl",
    "--new-window",
    "--start-maximized",
    "--no-first-run"
  )
} else {
  Start-Process $appUrl
}
