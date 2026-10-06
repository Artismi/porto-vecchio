# Porto Vecchio: un piccolo server sul tuo computer, così il browser può caricare i modelli della cartella assets.
# Non installa niente e non è raggiungibile da fuori: risponde solo su http://localhost.
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8642
$types = @{ '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.json'='application/json'; '.png'='image/png'; '.jpg'='image/jpeg'; '.glb'='model/gltf-binary'; '.gltf'='model/gltf+json'; '.bin'='application/octet-stream'; '.css'='text/css'; '.mp3'='audio/mpeg'; '.ogg'='audio/ogg'; '.wav'='audio/wav' }
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
try { $listener.Start() } catch { Write-Host "La porta $port è occupata: forse il gioco è già aperto. Vai su http://localhost:$port/"; Start-Process "http://localhost:$port/"; Read-Host "Invio per chiudere"; exit }
Write-Host "Porto Vecchio: http://localhost:$port/  (chiudi questa finestra per fermare il gioco)"
Start-Process "http://localhost:$port/"
$ritBackup = $false
while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
    if ($path -eq '') { $path = 'index.html' }
    # [editor] l'editor del gioco (F2) salva qui i ritocchi: ritocchi.json e le pitture in ritocchi\*.png
    if ($path.StartsWith('api/ritocchi')) {
      $res = $ctx.Response; $res.ContentType = 'application/json'; $out = '{"ok":false}'
      $origin = $ctx.Request.Headers['Origin']
      if ($origin -and $origin -notmatch '^https?://(localhost|127\.0\.0\.1)(:\d+)?$') { $res.StatusCode = 403 }
      elseif ($ctx.Request.HttpMethod -eq 'GET') { $out = '{"ok":true}' }
      elseif ($ctx.Request.HttpMethod -eq 'POST') {
        $ms = New-Object IO.MemoryStream; $ctx.Request.InputStream.CopyTo($ms); $bytes = $ms.ToArray()
        if ($path -eq 'api/ritocchi') {
          $f = Join-Path $root 'ritocchi.json'
          if (-not $ritBackup -and (Test-Path $f)) { Copy-Item $f (Join-Path $root 'ritocchi.backup.json') -Force }
          $ritBackup = $true
          [IO.File]::WriteAllBytes($f, $bytes); $out = '{"ok":true}'
        } elseif ($path -eq 'api/ritocchi/png') {
          $nome = $ctx.Request.QueryString['nome']
          if ($nome -match '^[\w.-]+\.png$' -and $bytes.Length -gt 8 -and $bytes[0] -eq 0x89) {
            $d = Join-Path $root 'ritocchi'; New-Item -ItemType Directory -Force -Path $d | Out-Null
            [IO.File]::WriteAllBytes((Join-Path $d $nome), $bytes); $out = '{"ok":true}'
          } else { $res.StatusCode = 400 }
        }
      }
      $b = [Text.Encoding]::UTF8.GetBytes($out); $res.ContentLength64 = $b.Length; $res.OutputStream.Write($b, 0, $b.Length); $res.OutputStream.Close()
      continue
    }
    $file = [IO.Path]::GetFullPath((Join-Path $root $path))
    if ($file.StartsWith($root) -and (Test-Path $file -PathType Leaf)) {
      $ext = [IO.Path]::GetExtension($file).ToLower()
      $ctx.Response.ContentType = if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' }
      $bytes = [IO.File]::ReadAllBytes($file)
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else { $ctx.Response.StatusCode = 404 }
    $ctx.Response.OutputStream.Close()
  } catch { }
}
