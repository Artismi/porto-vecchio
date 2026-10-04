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
while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
    if ($path -eq '') { $path = 'index.html' }
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
