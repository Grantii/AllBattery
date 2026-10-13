<#
.SYNOPSIS
  Erzeugt das Platzhalter-Brand-Logo (Icon + Logo) fuer die AllBattery-Integration.

.DESCRIPTION
  Erzeugt folgende Dateien:
    custom_components/allbattery/brand/icon.png         256 x 256
    custom_components/allbattery/brand/icon@2x.png      512 x 512
    custom_components/allbattery/brand/logo.png         helle Hintergruende
    custom_components/allbattery/brand/logo@2x.png
    custom_components/allbattery/brand/dark_logo.png    dunkle Hintergruende
    custom_components/allbattery/brand/dark_logo@2x.png
    public/favicon.png                                  48 x 48
    public/apple-touch-icon.png                        180 x 180

  Alle Bilder sind Platzhalter: eigenes Artwork einfach unter denselben
  Dateinamen (gleiche Groessen) ablegen - die Integration nutzt es sofort.
  Lokale Brand-Bilder werden ab Home Assistant 2026.3 automatisch erkannt
  (custom_components/<domain>/brand/), aeltere Versionen ignorieren den Ordner.

.NOTES
  Windows PowerShell 7+ (nutzt System.Drawing).
#>
[CmdletBinding()]
param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$brandDir = Join-Path $ProjectRoot 'custom_components/allbattery/brand'
$publicDir = Join-Path $ProjectRoot 'public'
New-Item -ItemType Directory -Force -Path $brandDir, $publicDir | Out-Null

# Markenfarben (Tailwind sky-400 -> sky-600)
$gradientTop = [System.Drawing.Color]::FromArgb(255, 56, 189, 248)
$gradientBottom = [System.Drawing.Color]::FromArgb(255, 2, 132, 199)
$textLight = [System.Drawing.Color]::FromArgb(255, 15, 23, 42)   # slate-900
$textDark = [System.Drawing.Color]::FromArgb(255, 248, 250, 252)  # slate-50

function New-RoundedRect {
  param([float]$X, [float]$Y, [float]$Width, [float]$Height, [float]$Radius)

  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  if ($Radius -le 0) {
    $path.AddRectangle((New-Object System.Drawing.RectangleF($X, $Y, $Width, $Height)))
    return $path
  }

  $d = $Radius * 2
  $path.AddArc($X, $Y, $d, $d, 180, 90)
  $path.AddArc($X + $Width - $d, $Y, $d, $d, 270, 90)
  $path.AddArc($X + $Width - $d, $Y + $Height - $d, $d, $d, 0, 90)
  $path.AddArc($X, $Y + $Height - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-Canvas {
  param([int]$Width, [int]$Height)

  $bitmap = New-Object System.Drawing.Bitmap($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  return @{ Bitmap = $bitmap; Graphics = $graphics }
}

function Save-Png {
  param($Canvas, [string]$Path)

  $Canvas.Graphics.Dispose()
  $Canvas.Bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $Canvas.Bitmap.Dispose()
  $info = New-Object System.IO.FileInfo($Path)
  Write-Host ("  {0} ({1} Bytes)" -f $info.Name, $info.Length)
}

function Add-Badge {
  param(
    [System.Drawing.Graphics]$Graphics,
    [float]$X,
    [float]$Y,
    [float]$Size,
    [switch]$Square
  )

  $rect = New-Object System.Drawing.RectangleF($X, $Y, $Size, $Size)
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $gradientTop, $gradientBottom, 90.0)
  if ($Square) {
    $Graphics.FillRectangle($brush, $rect)
  }
  else {
    $path = New-RoundedRect -X $X -Y $Y -Width $Size -Height $Size -Radius ($Size * 0.22)
    $Graphics.FillPath($brush, $path)
    $path.Dispose()
  }
  $brush.Dispose()

  # Batterie-Symbol in Weiss
  $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  $stroke = $Size * 0.075
  $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, $stroke)
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

  $bodyX = $X + $Size * 0.19
  $bodyY = $Y + $Size * 0.29
  $bodyW = $Size * 0.55
  $bodyH = $Size * 0.42

  $body = New-RoundedRect -X $bodyX -Y $bodyY -Width $bodyW -Height $bodyH -Radius ($Size * 0.075)
  $Graphics.DrawPath($pen, $body)
  $body.Dispose()

  $nub = New-RoundedRect -X ($bodyX + $bodyW + $stroke * 0.15) -Y ($bodyY + $bodyH * 0.32) -Width ($Size * 0.08) -Height ($bodyH * 0.36) -Radius ($Size * 0.02)
  $Graphics.FillPath($white, $nub)
  $nub.Dispose()

  $inset = $stroke * 0.9
  $fill = New-RoundedRect -X ($bodyX + $inset) -Y ($bodyY + $inset) -Width (($bodyW - $inset * 2) * 0.55) -Height ($bodyH - $inset * 2) -Radius ($Size * 0.03)
  $Graphics.FillPath($white, $fill)
  $fill.Dispose()

  $pen.Dispose()
  $white.Dispose()
}

function New-Logo {
  param([int]$Height, [System.Drawing.Color]$TextColor, [string]$Path)

  $fontSize = [float]($Height * 0.42)
  $font = New-Object System.Drawing.Font('Segoe UI', $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)

  $probe = New-Canvas -Width 8 -Height 8
  $textSize = $probe.Graphics.MeasureString('AllBattery', $font)
  $probe.Graphics.Dispose()
  $probe.Bitmap.Dispose()

  $gap = [float]($Height * 0.12)
  $width = [int][Math]::Ceiling($Height + $gap + $textSize.Width)

  $canvas = New-Canvas -Width $width -Height $Height
  Add-Badge -Graphics $canvas.Graphics -X 0 -Y 0 -Size $Height

  $brush = New-Object System.Drawing.SolidBrush($TextColor)
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment = [System.Drawing.StringAlignment]::Near
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $textRect = New-Object System.Drawing.RectangleF(($Height + $gap), 0, ($width - $Height - $gap), $Height)
  $canvas.Graphics.DrawString('AllBattery', $font, $brush, $textRect, $format)

  $brush.Dispose()
  $format.Dispose()
  $font.Dispose()
  Save-Png -Canvas $canvas -Path $Path
}

# --- Icons -------------------------------------------------------------------
foreach ($size in 256, 512) {
  $canvas = New-Canvas -Width $size -Height $size
  Add-Badge -Graphics $canvas.Graphics -X 0 -Y 0 -Size $size
  $name = if ($size -eq 256) { 'icon.png' } else { 'icon@2x.png' }
  Save-Png -Canvas $canvas -Path (Join-Path $brandDir $name)
}

# --- Logos (Badge + Wortmarke) -----------------------------------------------
New-Logo -Height 256 -TextColor $textLight -Path (Join-Path $brandDir 'logo.png')
New-Logo -Height 512 -TextColor $textLight -Path (Join-Path $brandDir 'logo@2x.png')
New-Logo -Height 256 -TextColor $textDark -Path (Join-Path $brandDir 'dark_logo.png')
New-Logo -Height 512 -TextColor $textDark -Path (Join-Path $brandDir 'dark_logo@2x.png')

# --- Web-App (Favicon / iOS-Homescreen) --------------------------------------
$favicon = New-Canvas -Width 48 -Height 48
Add-Badge -Graphics $favicon.Graphics -X 0 -Y 0 -Size 48
Save-Png -Canvas $favicon -Path (Join-Path $publicDir 'favicon.png')

$touch = New-Canvas -Width 180 -Height 180
Add-Badge -Graphics $touch.Graphics -X 0 -Y 0 -Size 180 -Square
Save-Png -Canvas $touch -Path (Join-Path $publicDir 'apple-touch-icon.png')

Write-Host 'Brand-Bilder erzeugt.'
