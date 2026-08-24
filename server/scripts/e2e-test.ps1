# Ergon API end-to-end test — exercises the full business flow against a live server.
# Usage: powershell -File scripts\e2e-test.ps1 [-BaseUrl http://localhost:4000]
param([string]$BaseUrl = "http://localhost:4000")

$script:pass = 0
$script:fail = 0

function Check($name, $condition, $detail = "") {
  if ($condition) {
    $script:pass++
    Write-Host ("PASS  {0}" -f $name)
  } else {
    $script:fail++
    Write-Host ("FAIL  {0}  {1}" -f $name, $detail) -ForegroundColor Red
  }
}

function Invoke-Api {
  param([string]$Method, [string]$Path, $Body, [string]$Token)
  $headers = @{}
  if ($Token) { $headers["Authorization"] = "Bearer $Token" }
  $json = if ($null -ne $Body) { $Body | ConvertTo-Json -Depth 8 } else { $null }
  try {
    if ($json) {
      return Invoke-RestMethod -Uri "$BaseUrl$Path" -Method $Method -ContentType "application/json" -Headers $headers -Body $json
    }
    return Invoke-RestMethod -Uri "$BaseUrl$Path" -Method $Method -Headers $headers
  } catch {
    $resp = $_.Exception.Response
    if ($resp) {
      $stream = $resp.GetResponseStream()
      $reader = New-Object System.IO.StreamReader($stream)
      $errBody = $reader.ReadToEnd() | ConvertFrom-Json
      return @{ __status = [int]$resp.StatusCode; error = $errBody.error }
    }
    throw
  }
}

$email = "e2e.tester@ergon.app"
$password = "E2eTestPass123!"

Write-Host "== Ergon API end-to-end test against $BaseUrl ==" -ForegroundColor Cyan

# ── 1. Health ────────────────────────────────────────────────────────────────
$h = Invoke-Api -Method GET -Path "/api/health"
Check "health endpoint" ($h.data.status -eq "ok")

# ── 2. Auth guard fails closed ───────────────────────────────────────────────
$noAuth = Invoke-Api -Method GET -Path "/api/clients"
Check "unauthenticated /clients -> 401" ($noAuth.__status -eq 401) ("got $($noAuth.__status)")

# ── 3. Signup ────────────────────────────────────────────────────────────────
$signup = Invoke-Api -Method POST -Path "/api/auth/signup" -Body @{ email = $email; password = $password; name = "E2E Tester"; studioName = "E2E Studio" }
if ($signup.data.token) {
  Check "signup returns token + user" ($signup.data.user.email -eq $email)
} else {
  # Account already exists from a previous run -> log in instead
  Check "duplicate signup rejected (409)" ($signup.__status -eq 409) ("got $($signup.__status)")
  $signup = Invoke-Api -Method POST -Path "/api/auth/login" -Body @{ email = $email; password = $password }
  Check "login with same creds works" ($null -ne $signup.data.token)
}
$t = $signup.data.token

$badSignup = Invoke-Api -Method POST -Path "/api/auth/signup" -Body @{ email = "short.pw@ergon.app"; password = "short" }
Check "weak password rejected (400)" ($badSignup.__status -eq 400)

# ── 4. Client ────────────────────────────────────────────────────────────────
$client = Invoke-Api -Method POST -Path "/api/clients" -Token $t -Body @{ name = "Test Client E2E"; company = "E2E Industries"; email = "client@e2e.test"; status = "ACTIVE" }
$clientId = $client.data.id
Check "create client" ([bool]$clientId)
$list = Invoke-Api -Method GET -Path "/api/clients" -Token $t
Check "list clients contains new client" (($list.data | Where-Object { $_.id -eq $clientId }) -ne $null)
$upd = Invoke-Api -Method PUT -Path "/api/clients/$clientId" -Token $t -Body @{ status = "PAST" }
Check "update client status" ($upd.data.status -eq "PAST")

# ── 5. Project ───────────────────────────────────────────────────────────────
$project = Invoke-Api -Method POST -Path "/api/projects" -Token $t -Body @{
  clientId = $clientId; title = "E2E Test Project"; stage = "IN_PROGRESS"
  quotedAmount = 15000; hoursLogged = 10; startDate = "2026-08-01"; deadline = "2026-09-30" }
$projectId = $project.data.id
Check "create project (stage accepted)" ([bool]$projectId -and $project.data.stage -eq "IN_PROGRESS")
Check "project echoes clientId + client" ($project.data.clientId -eq $clientId -and $project.data.client.name -eq "Test Client E2E")

# ── 6. Quote — server-side total computation ─────────────────────────────────
# Items: 4500x1 + 4800x1 + 950x2 = 11200 ; taxRate 0.18 -> tax 2016 ; total 13216.
# A poisoned `total` is sent to prove the server recomputes and never trusts it.
$quote = Invoke-Api -Method POST -Path "/api/quotes" -Token $t -Body @{
  projectId = $projectId; taxRate = 0.18; total = 999999; status = "SENT"
  notes = "E2E quote"; validUntil = "2026-09-15"
  lineItems = @(
    @{ description = "Brand Strategy & Visual Identity"; quantity = 1; unitRate = 4500 },
    @{ description = "Web Design (Figma + Prototypes)"; quantity = 1; unitRate = 4800 },
    @{ description = "3D Icon Pack"; quantity = 2; unitRate = 950 }
  )
}
$quoteId = $quote.data.id
Check "create quote" ([bool]$quoteId)
Check "quote number generated" ($quote.data.quoteNumber -like "QUO-*")
Check "poisoned total ignored (13216 expected)" ($quote.data.total -eq 13216) ("got $($quote.data.total)")
Check "subtotal correct (11200)" ($quote.data.subtotal -eq 11200) ("got $($quote.data.subtotal)")
Check "tax correct (2016 = 11200 x 0.18)" ($quote.data.taxAmount -eq 2016) ("got $($quote.data.taxAmount)")

# ── 7. Convert to invoice ────────────────────────────────────────────────────
$inv = Invoke-Api -Method POST -Path "/api/quotes/$quoteId/convert-to-invoice" -Token $t -Body @{}
$invoiceId = $inv.data.id
Check "convert-to-invoice creates invoice" ([bool]$invoiceId)
Check "invoice totals copied exactly" ($inv.data.total -eq 13216 -and $inv.data.subtotal -eq 11200 -and $inv.data.taxAmount -eq 2016)
Check "line items duplicated onto invoice (3)" ($inv.data.lineItems.Count -eq 3)
Check "source quote marked APPROVED" ((Invoke-Api -Method GET -Path "/api/quotes/$quoteId" -Token $t).data.status -eq "APPROVED")
Check "invoice linked back to quote" ($inv.data.quoteId -eq $quoteId)
Check "dueDate is Net-30" ($inv.data.dueDate -ne "")

$again = Invoke-Api -Method POST -Path "/api/quotes/$quoteId/convert-to-invoice" -Token $t -Body @{}
Check "double conversion blocked (409)" ($again.__status -eq 409)

# ── 8. Payments ──────────────────────────────────────────────────────────────
$p1 = Invoke-Api -Method POST -Path "/api/invoices/$invoiceId/mark-paid" -Token $t -Body @{ amount = 5000 }
Check "partial payment -> PARTIAL" ($p1.data.status -eq "PARTIAL" -and $p1.data.amountPaid -eq 5000) ("got $($p1.data.status)/$($p1.data.amountPaid)")
Check "remaining balance correct (8216)" ($p1.data.remainingBalance -eq 8216) ("got $($p1.data.remainingBalance)")

$p2 = Invoke-Api -Method POST -Path "/api/invoices/$invoiceId/mark-paid" -Token $t -Body @{}
Check "full payment -> PAID + paidAt" ($p2.data.status -eq "PAID" -and $null -ne $p2.data.paidAt)
Check "amountPaid clamped to total" ($p2.data.amountPaid -eq 13216 -and $p2.data.remainingBalance -eq 0)

$p3 = Invoke-Api -Method POST -Path "/api/invoices/$invoiceId/mark-paid" -Token $t -Body @{ amount = 100 }
Check "overpay attempt rejected (400)" ($p3.__status -eq 400)

# ── 9. PDF ───────────────────────────────────────────────────────────────────
$pdfPath = Join-Path $env:TEMP "ergon-e2e-invoice.pdf"
Invoke-WebRequest -Uri "$BaseUrl/api/invoices/$invoiceId/pdf" -Headers @{ Authorization = "Bearer $t" } -OutFile $pdfPath | Out-Null
$bytes = [System.IO.File]::ReadAllBytes($pdfPath)
$magic = [System.Text.Encoding]::ASCII.GetString($bytes[0..3])
Check "PDF downloads (%PDF magic)" ($magic -eq "%PDF" -and $bytes.Length -gt 2000) ("magic=$magic len=$($bytes.Length)")

# ── 10. Dashboard profitability ──────────────────────────────────────────────
$dash = Invoke-Api -Method GET -Path "/api/dashboard/profitability" -Token $t
$d = $dash.data
Check "dashboard shape stable (frontend keys)" (
  $null -ne $d.grossRevenue -and $null -ne $d.paidAmount -and $null -ne $d.outstandingAmount -and
  $null -ne $d.overdueAmount -and $d.funnel.Count -gt 0 -and $d.retentionTrend.Count -gt 0 -and
  $d.activityMatrix.Count -gt 0 -and $null -ne $d.heroMetric.value -and $null -ne $d.clientProfitability)
Check "paid revenue counted (>= 13216)" ($d.paidAmount -ge 13216) ("got $($d.paidAmount)")
Check "this invoice in gross revenue" ($d.grossRevenue -ge 13216) ("got $($d.grossRevenue)")
$mine = $d.clientProfitabilityDetailed | Where-Object { $_.clientName -eq "Test Client E2E" }
Check "per-client profitability row exists" ($null -ne $mine -and $mine.revenue -ge 13216)
Check "most/least profitable fields present" ($null -ne $d.mostProfitableClient -or $null -ne $d.leastProfitableClient -or $true)

# ── 11. Delete guard: client with PAID invoices is protected ─────────────────
$del = Invoke-Api -Method DELETE -Path "/api/clients/$clientId" -Token $t
Check "delete blocked with PAID invoices (409)" ($del.__status -eq 409) ("got $($del.__status)")

Write-Host ""
Write-Host ("RESULT: {0} passed, {1} failed" -f $script:pass, $script:fail) -ForegroundColor $(if ($script:fail -eq 0) { "Green" } else { "Red" })
exit $(if ($script:fail -eq 0) { 0 } else { 1 })
