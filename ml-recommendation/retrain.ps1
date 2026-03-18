# Retrain the recommendation model and optionally export recommendations.
# Run from ml-recommendation: .\retrain.ps1
# Or with custom paths: .\retrain.ps1 -ProfilesPath ..\my_profiles.json
#
# Prerequisites: Export skill profiles from Firebase to profiles.json (or use sample_profiles.json for testing).

param(
    [string]$ProfilesPath = "profiles.json",
    [string]$OutDir = "./output",
    [int]$Epochs = 50,
    [switch]$ExportAfter,
    [string]$UserProgressPath = "",
    [string]$ModulesPath = ""
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Resolve paths relative to ml-recommendation
if (-not [System.IO.Path]::IsPathRooted($ProfilesPath)) {
    $ProfilesPath = Join-Path $scriptDir $ProfilesPath
}
if (-not (Test-Path $ProfilesPath)) {
    Write-Host "Profiles file not found: $ProfilesPath" -ForegroundColor Red
    Write-Host "Export skill profiles from Firebase to a JSON file, or use sample_profiles.json for testing." -ForegroundColor Yellow
    exit 1
}

# Activate venv if present
$venvScript = Join-Path $scriptDir ".venv\Scripts\Activate.ps1"
if (Test-Path $venvScript) {
    & $venvScript
}

Write-Host "Training with: $ProfilesPath" -ForegroundColor Cyan
python train.py --data $ProfilesPath --epochs $Epochs --out-dir $OutDir
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Training done." -ForegroundColor Green

if ($ExportAfter) {
    $exportArgs = @(
        "export_recommendations.py",
        "--model-dir", $OutDir,
        "--profiles", $ProfilesPath,
        "--out", "recommendations.json",
        "--top-k-users", "5",
        "--top-k-modules", "10"
    )
    if ($UserProgressPath -and (Test-Path $UserProgressPath)) {
        $exportArgs += "--user-progress"; $exportArgs += $UserProgressPath
    }
    if ($ModulesPath -and (Test-Path $ModulesPath)) {
        $exportArgs += "--modules"; $exportArgs += $ModulesPath
        $exportArgs += "--merge-weight"; $exportArgs += "0.5"
    }
    Write-Host "Exporting recommendations..." -ForegroundColor Cyan
    & python @exportArgs
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    Write-Host "Recommendations written to recommendations.json" -ForegroundColor Green
}
