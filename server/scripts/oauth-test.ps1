# OAuth + security test suite for the Ergon API.
# Runs against a LOCAL fixture JWKS so no real Google credentials are needed.
param([string]$BaseUrl = "http://localhost:4000")

$script:pass = 0
$script:fail = 0

function Check($name, $condition, $detail = "") {
  if ($condition) { $script:pass++; Write-Host ("PASS  {0}" -f $name) }
  else { $script:fail++; Write-Host ("FAIL  {0}  {1}" -f $name, $detail) -ForegroundColor Red }
}

function Invoke-Api {
  param([string]$Method, [string]$Path, $Body)
  try {
    if ($null -ne $Body) {
      return Invoke-RestMethod -Uri "$BaseUrl$Path" -Method $Method -ContentType "application/json" -Body ($Body | ConvertTo-Json -Depth 5)
    }
    return Invoke-RestMethod -Uri "$BaseUrl$Path" -Method $Method
  } catch {
    $resp = $_.Exception.Response
    if (-not $resp) { throw }
    $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
    $raw = $sr.ReadToEnd()
    return @{ __status = [int]$resp.StatusCode; __raw = $raw }
  }
}

Write-Host "== Ergon OAuth & security tests ==" -ForegroundColor Cyan

$tokens = Get-Content (Join-Path $PSScriptRoot "oauth-tokens.json") | ConvertFrom-Json

# ── Health + headers ─────────────────────────────────────────────────────────
try {
  $req = [System.Net.HttpWebRequest]::Create("$BaseUrl/api/health")
  $resp = $req.GetResponse()
  $h = $resp.Headers
  $resp.Close()
} catch { $h = @{} }
Check "security: X-Content-Type-Options nosniff" ($h["X-Content-Type-Options"] -eq "nosniff")
Check "security: X-Frame-Options DENY" ($h["X-Frame-Options"] -eq "DENY")
Check "security: HSTS present" ($null -ne $h["Strict-Transport-Security"])
Check "security: x-powered-by removed" ($null -eq $h["X-Powered-By"])

# ── Google endpoint positive path ────────────────────────────────────────────
$r = Invoke-Api -Method POST -Path "/api/auth/google" -Body @{ credential = $tokens.valid }
$data = if ($r.data) { $r.data } else { $null }
Check "valid Google token -> app JWT + user" ($null -ne $data.token -and $data.user.email -eq "oauth.user@ergon.app") ($r.__raw)

$r2 = Invoke-Api -Method POST -Path "/api/auth/google" -Body @{ credential = $tokens.valid }
Check "repeat login links to SAME account" ($r2.data.user.id -eq $data.user.id)

$r3 = Invoke-Api -Method POST -Path "/api/auth/google" -Body @{ credential = $tokens.secondUser }
Check "second Google user created separately" ($r3.data.user.id -ne $data.user.id)

$appToken = $data.token
try {
  $me = Invoke-RestMethod -Uri "$BaseUrl/api/clients" -Headers @{ Authorization = "Bearer $appToken" }
  Check "issued app JWT works on protected routes" ($null -ne $me.data)
} catch {
  Check "issued app JWT works on protected routes" $false $_.Exception.Message
}

# ── Attack variants — every one MUST be rejected ────────────────────────────
function RejectCase($label, $cred) {
  $res = Invoke-Api -Method POST -Path "/api/auth/google" -Body @{ credential = $cred }
  Check "reject: $label" ($res.__status -ge 400 -and $res.__status -le 499) ("got $($res.__status)")
}

RejectCase "wrong audience"        $tokens.badAudience
RejectCase "expired token"         $tokens.expired
RejectCase "unverified email"      $tokens.unverifiedEmail
RejectCase "wrong issuer"          $tokens.wrongIssuer
RejectCase "not a JWT at all"      "garbage-nonsense-value"

# Tampered signature: flip chars in the final segment of a valid token.
$parts = $tokens.valid.Split('.')
$sig = $parts[2].ToCharArray(); $sig[3] = if ($sig[3] -eq 'A') { 'B' } else { 'A' }
$tampered = "$($parts[0]).$($parts[1]).$(-join $sig)"
RejectCase "tampered signature"    $tampered

# Token signed by a DIFFERENT key than the fixture publishes (alg-confusion style).
$foreign = node (Join-Path $PSScriptRoot "oauth-mint-foreign.mjs")
if ($foreign) { RejectCase "key not in JWKS (unknown kid/key)" $foreign.Trim() }

# ── Rate limiting ─────────────────────────────────────────────────────────────
$limited = $false
for ($i = 0; $i -lt 12; $i++) {
  $res = Invoke-Api -Method POST -Path "/api/auth/login" -Body @{ email = "rl.probe@ergon.app"; password = "WrongPass123!" }
  if ($res.__status -eq 429) { $limited = $true; break }
}
Check "rate limit kicks in on repeated logins (429)" $limited

# ── Unconfigured-mode check happens in prod .env; not testable here. ─────────
Write-Host ""
Write-Host ("RESULT: {0} passed, {1} failed" -f $script:pass, $script:fail) -ForegroundColor $(if ($script:fail -eq 0) { "Green" } else { "Red" })
exit $(if ($script:fail -eq 0) { 0 } else { 1 })
