# Neon Auth delegation tests. Runs the API against the mock Better Auth
# fixture, verifies signup/login/migration behavior, then restores prod .env.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root ".env"
$backup = "$envFile.neon-backup"

$script:pass = 0; $script:fail = 0
function Check($name, $cond, $detail = "") {
  if ($cond) { $script:pass++; Write-Host ("PASS  {0}" -f $name) }
  else { $script:fail++; Write-Host ("FAIL  {0}  {1}" -f $name, $detail) -ForegroundColor Red }
}
function Invoke-Api {
  param([string]$Method, [string]$Path, $Body)
  try {
    if ($null -ne $Body) {
      return Invoke-RestMethod -Uri "http://localhost:4000$Path" -Method $Method -ContentType "application/json" -Body ($Body | ConvertTo-Json -Depth 5)
    }
    return Invoke-RestMethod -Uri "http://localhost:4000$Path" -Method $Method
  } catch {
    $resp = $_.Exception.Response
    if (-not $resp) { throw }
    $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
    return @{ __status = [int]$resp.StatusCode; __raw = $sr.ReadToEnd() }
  }
}

Copy-Item $envFile $backup -Force
function Stop-All {
  Get-NetTCPConnection -LocalPort 4000,9098 -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object { try { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } catch {} }
}
function Start-Api {
  Start-Process -FilePath "node" -ArgumentList "src\index.js" -WorkingDirectory $root -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $root "server.log") -RedirectStandardError (Join-Path $root "server.err.log")
  Start-Sleep -Seconds 4
}

try {
  Add-Content -Path $envFile -Encoding Ascii -Value "`nNEON_AUTH_BASE_URL=http://localhost:9098/api/auth"
  Stop-All
  $fixture = Start-Process -FilePath "node" -ArgumentList (Join-Path $PSScriptRoot "mock-neon-auth.mjs") `
    -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru
  Start-Sleep -Seconds 2
  Start-Api

  # 1) Signup goes through Neon (mock) and returns app JWT
  $r = Invoke-Api -Method POST -Path "/api/auth/signup" -Body @{ email="neon.user@ergon.app"; password="NeonPass123!"; name="Neon User" }
  Check "signup via Neon Auth returns token+user" ($r.data.token -and $r.data.user.email -eq "neon.user@ergon.app") ($r.__raw)

  # 2) Duplicate signup → 409 (from provider classification)
  $dup = Invoke-Api -Method POST -Path "/api/auth/signup" -Body @{ email="neon.user@ergon.app"; password="OtherPass123!" }
  Check "duplicate signup -> 409 USER_EXISTS" ($dup.__status -eq 409) ("got $($dup.__status)")

  # 3) Login with correct credentials through Neon
  $ok = Invoke-Api -Method POST -Path "/api/auth/login" -Body @{ email="neon.user@ergon.app"; password="NeonPass123!" }
  Check "login via Neon succeeds" ($ok.data.token -ne $null)

  # 4) Wrong password → generic 401
  $bad = Invoke-Api -Method POST -Path "/api/auth/login" -Body @{ email="neon.user@ergon.app"; password="WrongPass999!" }
  Check "wrong password -> 401" ($bad.__status -eq 401) ("got $($bad.__status)")

  # 5) Unknown user → same generic 401 (no enumeration)
  $unk = Invoke-Api -Method POST -Path "/api/auth/login" -Body @{ email="ghost@ergon.app"; password="Whatever123!" }
  Check "unknown user -> 401 (no leak)" ($unk.__status -eq 401)

  # 6) Migration: legacy local-only seeded account logs in under Neon mode
  #    (verified against local bcrypt, then registered at the provider).
  $mig = Invoke-Api -Method POST -Path "/api/auth/login" -Body @{ email="alex@ergonstudio.design"; password="ergon-demo-2026" }
  Check "legacy account migrates + signs in" ($mig.data.token -ne $null) ($mig.__raw)

  # 7) Second login for migrated account still works (now provider-managed)
  $mig2 = Invoke-Api -Method POST -Path "/api/auth/login" -Body @{ email="alex@ergonstudio.design"; password="ergon-demo-2026" }
  Check "migrated account re-login works" ($mig2.data.token -ne $null)

  Write-Host ""
  Write-Host ("RESULT: {0} passed, {1} failed" -f $script:pass, $script:fail) -ForegroundColor $(if ($script:fail -eq 0) { "Green" } else { "Red" })
  exit $(if ($script:fail -eq 0) { 0 } else { 1 })
}
finally {
  if ($fixture) { try { Stop-Process -Id $fixture.Id -Force -ErrorAction SilentlyContinue } catch {} }
  Copy-Item $backup $envFile -Force
  Remove-Item $backup -Force -ErrorAction SilentlyContinue
  Stop-All
  Start-Api   # restore production config API
}
