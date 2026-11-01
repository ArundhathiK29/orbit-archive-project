$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeRoot = Join-Path $projectRoot 'tmp'
New-Item -ItemType Directory -Force -Path $runtimeRoot | Out-Null
$mysqlBinary = Get-ChildItem -Path 'C:\Program Files\MySQL' -Filter mysqld.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
$mongoBinary = Get-ChildItem -Path 'C:\Program Files\MongoDB' -Filter mongod.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
if (!$mysqlBinary -or !$mongoBinary) { throw 'Install MySQL and MongoDB, or configure .env.local for existing servers.' }
function Port-Open([int]$Port) {
  $client = New-Object System.Net.Sockets.TcpClient
  try { $client.Connect('127.0.0.1', $Port); return $true } catch { return $false } finally { $client.Dispose() }
}
$mysqlData = Join-Path $runtimeRoot 'mysql-data'
if (!(Port-Open 13317)) {
  if (!(Test-Path -LiteralPath (Join-Path $mysqlData 'mysql'))) {
    New-Item -ItemType Directory -Force -Path $mysqlData | Out-Null
    & $mysqlBinary --no-defaults --initialize-insecure "--datadir=$mysqlData" --console
    if ($LASTEXITCODE -ne 0) { throw 'MySQL initialization failed.' }
  }
  $arguments = @('--no-defaults', ('--datadir="{0}"' -f $mysqlData), '--port=13317', '--bind-address=127.0.0.1', '--mysqlx=OFF', '--log-bin-trust-function-creators=ON', ('--log-error="{0}"' -f (Join-Path $runtimeRoot 'mysql.log')))
  $process = Start-Process -FilePath $mysqlBinary -ArgumentList $arguments -WindowStyle Hidden -PassThru
  $process.Id | Set-Content -LiteralPath (Join-Path $runtimeRoot 'mysql.pid')
}
$mongoData = Join-Path $runtimeRoot 'mongo-data'
if (!(Port-Open 27027)) {
  New-Item -ItemType Directory -Force -Path $mongoData | Out-Null
  # The small teaching fixture does not need MongoDB's RAM-based default cache.
  # Bound the cache on student laptops; this is not a total process-memory cap.
  $arguments = @('--dbpath', ('"{0}"' -f $mongoData), '--port', '27027', '--bind_ip', '127.0.0.1', '--wiredTigerCacheSizeGB', '0.25', '--logappend', '--logpath', ('"{0}"' -f (Join-Path $runtimeRoot 'mongo.log')))
  $process = Start-Process -FilePath $mongoBinary -ArgumentList $arguments -WindowStyle Hidden -PassThru
  $process.Id | Set-Content -LiteralPath (Join-Path $runtimeRoot 'mongo.pid')
}
for ($attempt=0; $attempt -lt 60; $attempt++) {
  if ((Port-Open 13317) -and (Port-Open 27027)) { Write-Output 'Demo databases ready: MySQL 13317, MongoDB 27027 (loopback only).'; exit 0 }
  Start-Sleep -Seconds 1
}
throw 'Database startup timed out. Check tmp/mysql.log and tmp/mongo.log.'
