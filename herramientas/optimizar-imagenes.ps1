# Convierte las fotos de higgsfield-originales/ en JPG livianos dentro de img/ (los nombres que usa index.html).
# Uso:  powershell -ExecutionPolicy Bypass -File herramientas/optimizar-imagenes.ps1
Add-Type -AssemblyName System.Drawing
$raiz = Split-Path $PSScriptRoot -Parent
$origen = Join-Path $raiz 'higgsfield-originales'
$destino = Join-Path $raiz 'img'
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$parametros = New-Object System.Drawing.Imaging.EncoderParameters 1
$parametros.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 82L

Get-ChildItem $origen -Recurse -Include *.png, *.jpg, *.jpeg | ForEach-Object {
  $relativo = $_.FullName.Substring($origen.Length + 1)
  $salida = Join-Path $destino ([System.IO.Path]::ChangeExtension($relativo, '.jpg'))
  # Foto principal a 1000 px de ancho; miniaturas de platos a 320 px
  $anchoMax = if ($relativo -like 'platos*') { 320 } else { 1000 }
  $img = [System.Drawing.Image]::FromFile($_.FullName)
  $escala = [Math]::Min([double]1, [double]$anchoMax / $img.Width)
  $w = [int][Math]::Round($img.Width * $escala); $h = [int][Math]::Round($img.Height * $escala)
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($img, 0, 0, $w, $h)
  New-Item -ItemType Directory -Force (Split-Path $salida -Parent) | Out-Null
  $bmp.Save($salida, $codec, $parametros)
  $g.Dispose(); $bmp.Dispose(); $img.Dispose()
  "{0} -> img\{1} ({2}x{3}, {4:N0} KB)" -f $relativo, ([System.IO.Path]::ChangeExtension($relativo, '.jpg')), $w, $h, ((Get-Item $salida).Length / 1KB)
}
