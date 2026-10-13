<#
.SYNOPSIS
  Erzeugt aus dem Quelldesign alle Logo-Dateien fuer die AllBattery-Integration
  und die Web-App.

.DESCRIPTION
  Quelle: assets/Logo.png (quadratisches Logo, schwarzes Artwork auf weissem
  oder transparentem Hintergrund).

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

function New-ArtworkBitmap {
  param([System.Drawing.Bitmap]$Artwork, [int]$Size)

  $bitmap = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.DrawImage($Artwork, 0, 0, $Size, $Size)
  $graphics.Dispose()
  return $bitmap
}

function New-BadgeBitmap {
  param([System.Drawing.Bitmap]$Artwork, [int]$Size, [switch]$Rounded)

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

  $graphics.DrawImage($Artwork, 0, 0, $Size, $Size)
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
$composite = New-WhiteComposite -Path $sourcePath
$darkArtwork = Get-Artwork -Composite $composite -Ink ([System.Drawing.Color]::Black)
$lightArtwork = Get-Artwork -Composite $composite -Ink ([System.Drawing.Color]::White)

foreach ($size in 256, 512) {
  $suffix = if ($size -eq 256) { '' } else { '@2x' }

  $icon = New-ArtworkBitmap -Artwork $darkArtwork -Size $size
  Save-Png -Bitmap $icon -Path (Join-Path $brandDir ("icon{0}.png" -f $suffix))
  $icon.Dispose()

  $darkIcon = New-ArtworkBitmap -Artwork $lightArtwork -Size $size
  Save-Png -Bitmap $darkIcon -Path (Join-Path $brandDir ("dark_icon{0}.png" -f $suffix))
  $darkIcon.Dispose()
}

$favicon = New-BadgeBitmap -Artwork $darkArtwork -Size 48 -Rounded
Save-Png -Bitmap $favicon -Path (Join-Path $publicDir 'favicon.png')
$favicon.Dispose()

$touchIcon = New-BadgeBitmap -Artwork $darkArtwork -Size 180
Save-Png -Bitmap $touchIcon -Path (Join-Path $publicDir 'apple-touch-icon.png')
$touchIcon.Dispose()

$headerLogo = New-BadgeBitmap -Artwork $darkArtwork -Size 96 -Rounded
Write-LogoModule -Bitmap $headerLogo -Path (Join-Path $srcDir 'logo.ts')
$headerLogo.Dispose()

$darkArtwork.Dispose()
$lightArtwork.Dispose()
$composite.Dispose()

Write-Host 'Logo-Dateien erzeugt.'
