<#
.SYNOPSIS
  Erzeugt aus dem Quelldesign alle Logo-Dateien fuer die AllBattery-Integration
  und die Web-App.

.DESCRIPTION
  Quelle: assets/Logo.png (schwarzes Artwork auf weissem oder transparentem
  Hintergrund, quadratisch oder rechteckig). Das Seitenverhaeltnis des
  Artworks bleibt immer erhalten - es wird in die quadratischen Ziele
  eingepasst und zentriert, nie gestaucht. Transparente Raender werden
  automatisch abgeschnitten, das Motiv sitzt also formatfuellend.

  Erzeugt:
    custom_components/allbattery/brand/icon.png          256 x 256  helles Design
    custom_components/allbattery/brand/icon@2x.png       512 x 512
    custom_components/allbattery/brand/dark_icon.png     256 x 256  dunkles Design
    custom_components/allbattery/brand/dark_icon@2x.png  512 x 512
    public/favicon.png                                    48 x 48
    public/apple-touch-icon.png                          180 x 180
    src/logo.ts                          Logo als Data-URI fuer die App-Kopfzeile

  Warum keine logo.png? Laut Home-Assistant-Brand-Guidelines werden bei einem
  quadratischen Logo nur die Icon-Dateien abgelegt - Home Assistant nutzt das
  Icon automatisch als Logo-Fallback.

  Eigenes Artwork einfach unter demselben Pfad ablegen, danach `npm run brand`.

.NOTES
  Windows PowerShell 7+ (System.Drawing).
#>
[CmdletBinding()]
param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$SourceImage = 'assets/Logo.png'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$brandDir = Join-Path $ProjectRoot 'custom_components/allbattery/brand'
$publicDir = Join-Path $ProjectRoot 'public'
$srcDir = Join-Path $ProjectRoot 'src'
New-Item -ItemType Directory -Force -Path $brandDir, $publicDir | Out-Null

$sourcePath = Join-Path $ProjectRoot $SourceImage
if (-not (Test-Path $sourcePath)) { throw "Quelldatei nicht gefunden: $sourcePath" }

function New-WhiteComposite {
  param([string]$Path)

  $source = [System.Drawing.Image]::FromFile($Path)
  $bitmap = New-Object System.Drawing.Bitmap($source.Width, $source.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.Color]::White)
  $graphics.DrawImage($source, 0, 0, $source.Width, $source.Height)
  $graphics.Dispose()
  $source.Dispose()
  return $bitmap
}

function Get-Artwork {
  param([System.Drawing.Bitmap]$Composite, [System.Drawing.Color]$Ink)

  # Helligkeit wird zu Alpha: der weisse Hintergrund verschwindet, das Artwork
  # bleibt in der gewuenschten Farbe (schwarz fuer hell, weiss fuer dunkel).
  $bitmap = New-Object System.Drawing.Bitmap($Composite.Width, $Composite.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.Color]::Transparent)

  $matrix = New-Object System.Drawing.Imaging.ColorMatrix
  # Achtung: GDI+ nutzt Matrix<Quellkanal><Zielkanal> - die RGB-Anteile
  # muessen also auf Matrix03/13/23 liegen, der Offset fuer Alpha auf Matrix43.
  $matrix.Matrix00 = 0.0; $matrix.Matrix01 = 0.0; $matrix.Matrix02 = 0.0; $matrix.Matrix03 = -0.3333
  $matrix.Matrix10 = 0.0; $matrix.Matrix11 = 0.0; $matrix.Matrix12 = 0.0; $matrix.Matrix13 = -0.3333
  $matrix.Matrix20 = 0.0; $matrix.Matrix21 = 0.0; $matrix.Matrix22 = 0.0; $matrix.Matrix23 = -0.3333
  $matrix.Matrix30 = 0.0; $matrix.Matrix31 = 0.0; $matrix.Matrix32 = 0.0; $matrix.Matrix33 = 0.0
  $matrix.Matrix40 = 0.0; $matrix.Matrix41 = 0.0; $matrix.Matrix42 = 0.0; $matrix.Matrix43 = 1.0
  $matrix.Matrix44 = 1.0

  if ($Ink.R -gt 127) {
    # weisse Variante fuer das dunkle Design
    $matrix.Matrix40 = 1.0
    $matrix.Matrix41 = 1.0
    $matrix.Matrix42 = 1.0
  }

  $attributes = New-Object System.Drawing.Imaging.ImageAttributes
  $attributes.SetColorMatrix($matrix)
  $rect = New-Object System.Drawing.Rectangle(0, 0, $bitmap.Width, $bitmap.Height)
  $graphics.DrawImage($Composite, $rect, 0, 0, $Composite.Width, $Composite.Height, [System.Drawing.GraphicsUnit]::Pixel, $attributes)

  $graphics.Dispose()
  $attributes.Dispose()
  return $bitmap
}

function Save-Png {
  param($Bitmap, [string]$Path)

  $Bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $info = New-Object System.IO.FileInfo($Path)
  Write-Host ("  {0} ({1} Bytes)" -f $info.Name, $info.Length)
}

function Get-ContentBounds {
  param([System.Drawing.Bitmap]$Bitmap, [int]$Threshold = 16)

  # Ermittelt den sichtbaren Bereich des Artworks (Alpha >= Threshold), damit
  # transparente Raender aus dem Quellbild nicht als Leerraum uebernommen
  # werden.
  $rect = New-Object System.Drawing.Rectangle(0, 0, $Bitmap.Width, $Bitmap.Height)
  $data = $Bitmap.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  try {
    $stride = $data.Stride
    $bytes = New-Object byte[] ($stride * $Bitmap.Height)
    [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
  }
  finally {
    $Bitmap.UnlockBits($data)
  }

  $minX = $Bitmap.Width; $maxX = -1
  $minY = $Bitmap.Height; $maxY = -1

  for ($y = 0; $y -lt $Bitmap.Height; $y++) {
    $row = $y * $stride
    for ($x = 0; $x -lt $Bitmap.Width; $x++) {
      if ($bytes[$row + ($x * 4) + 3] -ge $Threshold) {
        if ($x -lt $minX) { $minX = $x }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }

  if ($maxX -lt 0) { throw 'Im Quellbild wurde kein Artwork gefunden (alle Pixel transparent).' }

  return New-Object System.Drawing.Rectangle($minX, $minY, ($maxX - $minX + 1), ($maxY - $minY + 1))
}

function New-FittedBitmap {
  param(
    [System.Drawing.Bitmap]$Artwork,
    [System.Drawing.Rectangle]$Bounds,
    [int]$Size,
    [double]$Padding = 0.0
  )

  # "contain": der sichtbare Ausschnitt ($Bounds) wird unter Beibehaltung des
  # Seitenverhaeltnisses in das Quadrat eingepasst und zentriert. $Padding ist
  # der Anteil je Seite, der als Sicherheitsabstand frei bleibt.
  $bitmap = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

  $available = $Size * (1.0 - (2.0 * $Padding))
  $scale = [Math]::Min($available / $Bounds.Width, $available / $Bounds.Height)
  $drawWidth = [int][Math]::Max(1, [Math]::Round($Bounds.Width * $scale))
  $drawHeight = [int][Math]::Max(1, [Math]::Round($Bounds.Height * $scale))
  $offsetX = [int][Math]::Round(($Size - $drawWidth) / 2.0)
  $offsetY = [int][Math]::Round(($Size - $drawHeight) / 2.0)

  $target = New-Object System.Drawing.Rectangle($offsetX, $offsetY, $drawWidth, $drawHeight)
  $graphics.DrawImage($Artwork, $target, $Bounds.X, $Bounds.Y, $Bounds.Width, $Bounds.Height, [System.Drawing.GraphicsUnit]::Pixel)
  $graphics.Dispose()
  return $bitmap
}

function New-BadgeBitmap {
  param(
    [System.Drawing.Bitmap]$Artwork,
    [System.Drawing.Rectangle]$Bounds,
    [int]$Size,
    [switch]$Rounded,
    [double]$Padding = 0.0
  )

  $bitmap = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

  $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  if ($Rounded) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $Size * 0.44
    $path.AddArc(0, 0, $d, $d, 180, 90)
    $path.AddArc($Size - $d, 0, $d, $d, 270, 90)
    $path.AddArc($Size - $d, $Size - $d, $d, $d, 0, 90)
    $path.AddArc(0, $Size - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    $graphics.FillPath($white, $path)
    $path.Dispose()
  }
  else {
    $graphics.FillRectangle($white, 0, 0, $Size, $Size)
  }
  $white.Dispose()

  $artworkBitmap = New-FittedBitmap -Artwork $Artwork -Bounds $Bounds -Size $Size -Padding $Padding
  $graphics.DrawImage($artworkBitmap, 0, 0, $Size, $Size)
  $artworkBitmap.Dispose()
  $graphics.Dispose()
  return $bitmap
}

function Write-LogoModule {
  param([System.Drawing.Bitmap]$Bitmap, [string]$Path)

  $buffer = New-Object System.IO.MemoryStream
  $Bitmap.Save($buffer, [System.Drawing.Imaging.ImageFormat]::Png)
  $base64 = [Convert]::ToBase64String($buffer.ToArray())
  $buffer.Dispose()

  $content = @"
// Automatisch erzeugt von scripts/generate-brand-images.ps1 - nicht manuell bearbeiten.
// Quelle: assets/Logo.png (neu erzeugen mit: npm run brand)
export const LOGO_DATA_URI =
  'data:image/png;base64,$base64';
"@
  Set-Content -Path $Path -Value $content -Encoding utf8
  Write-Host ("  {0} ({1} Bytes)" -f (Split-Path $Path -Leaf), (Get-Item $Path).Length)
}

# --- Generierung --------------------------------------------------------------
# Sicherheitsabstand je Seite fuer die Badges (Favicon, Apple-Touch-Icon,
# Kopfzeilen-Logo): haelt das Artwork von den abgerundeten Ecken fern.
$badgePadding = 0.08

$composite = New-WhiteComposite -Path $sourcePath
$darkArtwork = Get-Artwork -Composite $composite -Ink ([System.Drawing.Color]::Black)
$lightArtwork = Get-Artwork -Composite $composite -Ink ([System.Drawing.Color]::White)

$bounds = Get-ContentBounds -Bitmap $darkArtwork
Write-Host ("  Quelle {0} x {1} px, sichtbares Artwork {2} x {3} px" -f $composite.Width, $composite.Height, $bounds.Width, $bounds.Height)

foreach ($size in 256, 512) {
  $suffix = if ($size -eq 256) { '' } else { '@2x' }

  $icon = New-FittedBitmap -Artwork $darkArtwork -Bounds $bounds -Size $size
  Save-Png -Bitmap $icon -Path (Join-Path $brandDir ("icon{0}.png" -f $suffix))
  $icon.Dispose()

  $darkIcon = New-FittedBitmap -Artwork $lightArtwork -Bounds $bounds -Size $size
  Save-Png -Bitmap $darkIcon -Path (Join-Path $brandDir ("dark_icon{0}.png" -f $suffix))
  $darkIcon.Dispose()
}

$favicon = New-BadgeBitmap -Artwork $darkArtwork -Bounds $bounds -Size 48 -Rounded -Padding $badgePadding
Save-Png -Bitmap $favicon -Path (Join-Path $publicDir 'favicon.png')
$favicon.Dispose()

$touchIcon = New-BadgeBitmap -Artwork $darkArtwork -Bounds $bounds -Size 180 -Padding $badgePadding
Save-Png -Bitmap $touchIcon -Path (Join-Path $publicDir 'apple-touch-icon.png')
$touchIcon.Dispose()

$headerLogo = New-BadgeBitmap -Artwork $darkArtwork -Bounds $bounds -Size 96 -Rounded -Padding $badgePadding
Write-LogoModule -Bitmap $headerLogo -Path (Join-Path $srcDir 'logo.ts')
$headerLogo.Dispose()

$darkArtwork.Dispose()
$lightArtwork.Dispose()
$composite.Dispose()

Write-Host 'Logo-Dateien erzeugt.'
