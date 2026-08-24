# Orchestrates the OAuth test cycle WITHOUT touching production .env state:
#   backup .env -> inject fixture Google config -> restart API -> run tests ->
#   restore .env -> restart API.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root ".env"
$backup = "$envFile.oauth-backup"

Copy-Item $envFile $backup -Force

function Stop-Api {
  Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $PID } |
    Where-Object { try { ($_ | Select-Object -ExpandProperty CommandLine -ErrorAction Stop) -match "ergon2.server.src" } catch { $false } } |
    Stop-Process -Force -ErrorAction SilentlyContinue
  # Fallback: kill any node listening on 4000 or the fixture port.
  foreach ($port in 4000, 9099) {
    Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
      ForEach-Object { try { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } catch {} }
  }
}

function Start-Api {
  Start-Process -FilePath "node" -ArgumentList "src\index.js" -WorkingDirectory $root -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $root "server.log") -RedirectStandardError (Join-Path $root "server.err.log")
  Start-Sleep -Seconds 4
}

try {
  # Inject TEST google config (fixture JWKS + fake client id)
  Add-Content -Path $envFile -Encoding Ascii -Value @"

GOOGLE_CLIENT_ID=test-client-id
GOOGLE_JWKS_URL=http://localhost:9099/certs
"@

  Stop-Api

  # Fixture JWKS server
  $fixture = Start-Process -FilePath "node" -ArgumentList (Join-Path $PSScriptRoot "oauth-fixture-server.mjs") `
    -WorkingDirectory (Join-Path $root "scripts") -WindowStyle Hidden -PassThru
  Start-Sleep -Seconds 2

  Start-Api
  powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "oauth-test.ps1")
  exit $LASTEXITCODE
}
finally {
  if ($fixture) { try { Stop-Process -Id $fixture.Id -Force -ErrorAction SilentlyContinue } catch {} }
  Copy-Item $backup $envFile -Force
  Remove-Item $backup -Force -ErrorAction SilentlyContinue
  Stop-Api
  Start-Api   # back to production config
}
