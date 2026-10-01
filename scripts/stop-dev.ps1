$processes = Get-Process node -ErrorAction SilentlyContinue
foreach ($p in $processes) {
  try {
    $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId=$($p.Id)").CommandLine
    if ($cmd -match "desktop-agent|mcp-server") {
      Stop-Process -Id $p.Id -Force
      Write-Host "Stopped PID $($p.Id)"
    }
  } catch {}
}
Write-Host "Desktop MCP development processes stopped."
