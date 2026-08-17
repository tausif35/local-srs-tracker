param([switch]$SkipNextBuild)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$distributionRoot = Join-Path $projectRoot "dist\SRS Tracker"
$standaloneRoot = Join-Path $projectRoot ".next\standalone"
$appRoot = Join-Path $distributionRoot "app"

Push-Location $projectRoot
try {
    if (-not $SkipNextBuild) {
        & npm.cmd run build
        if ($LASTEXITCODE -ne 0) { throw "Next.js production build failed." }
    }

    $resolvedProject = [IO.Path]::GetFullPath($projectRoot)
    $resolvedDistribution = [IO.Path]::GetFullPath($distributionRoot)
    if (-not $resolvedDistribution.StartsWith($resolvedProject + [IO.Path]::DirectorySeparatorChar)) {
        throw "Refusing to replace distribution outside the project directory."
    }
    if (Test-Path -LiteralPath $distributionRoot) { Remove-Item -LiteralPath $distributionRoot -Recurse -Force }

    New-Item -ItemType Directory -Path $appRoot -Force | Out-Null
    Copy-Item -Path (Join-Path $standaloneRoot "*") -Destination $appRoot -Recurse -Force
    New-Item -ItemType Directory -Path (Join-Path $appRoot ".next\static") -Force | Out-Null
    Copy-Item -Path (Join-Path $projectRoot ".next\static\*") -Destination (Join-Path $appRoot ".next\static") -Recurse -Force
    Copy-Item -LiteralPath (Join-Path $projectRoot "public") -Destination (Join-Path $appRoot "public") -Recurse -Force

    $node = (Get-Command node.exe -ErrorAction Stop).Source
    New-Item -ItemType Directory -Path (Join-Path $distributionRoot "runtime") -Force | Out-Null
    Copy-Item -LiteralPath $node -Destination (Join-Path $distributionRoot "runtime\node.exe") -Force
    New-Item -ItemType Directory -Path (Join-Path $distributionRoot "seed") -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $projectRoot "data\registry.json") -Destination (Join-Path $distributionRoot "seed\registry.json") -Force

    $compiler = "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
    if (-not (Test-Path -LiteralPath $compiler)) { throw "Windows C# compiler not found at $compiler" }
    $launcherExe = Join-Path $distributionRoot "SRS Tracker.exe"
    & $compiler /nologo /target:winexe /optimize+ "/win32icon:$projectRoot\public\icon.ico" "/out:$launcherExe" /reference:System.Windows.Forms.dll (Join-Path $projectRoot "launcher\Program.cs")
    if ($LASTEXITCODE -ne 0) { throw "Launcher build failed." }
    Copy-Item -LiteralPath (Join-Path $projectRoot "public\icon.ico") -Destination (Join-Path $distributionRoot "icon.ico") -Force
    Write-Host "Built $distributionRoot"
} finally {
    Pop-Location
}
