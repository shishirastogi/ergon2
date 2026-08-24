# Stops the portable PostgreSQL 17 instance.
# Usage: powershell -File scripts\pg-stop.ps1
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
& (Join-Path $root ".pgsql\pgsql\bin\pg_ctl.exe") -D (Join-Path $root ".pgsql\data") stop -m fast
