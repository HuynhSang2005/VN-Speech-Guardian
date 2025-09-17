<#
Setup script for AI Worker (PowerShell)

Creates venv, installs deps, and runs a quick server to verify.
#>
param(
    [string]$Python = "python",
    [string]$Port = "8001"
)

Set-Location -Path "$(Split-Path -Parent $MyInvocation.MyCommand.Definition)\..\apps\ai-worker"

if (-not (Test-Path .venv)) {
    & $Python -m venv .venv
}

Write-Host "Activating venv and installing deps..."
. .\.venv\Scripts\Activate
pip install -r requirements.txt
Write-Host "(Optional) To enable ONNX export & ORT: pip install -r requirements-onnx.txt"

Write-Host "Running quick server (press Ctrl+C to stop)"
. .venv\Scripts\python.exe -m uvicorn app.main:create_app --host 0.0.0.0 --port $Port
