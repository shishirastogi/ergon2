# Starts the portable PostgreSQL 17 instance (local dev fallback).
# Usage: powershell -File scripts\pg-start.ps1
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
& (Join-Path $root ".pgsql\pgsql\bin\pg_ctl.exe") -D (Join-Path $root ".pgsql\data") -l (Join-Path $root ".pgsql\data\logfile.txt") start
Start-Sleep -Seconds 2
& (Join-Path $root ".pgsql\pgsql\bin\pg_isready.exe") -h localhost -p 5432
