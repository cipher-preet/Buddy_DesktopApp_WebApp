# Generates Microsoft Store (AppX/MSIX) tile assets in build/appx from build/icon.png.
# Run: powershell -ExecutionPolicy Bypass -File scripts/generate-appx-assets.ps1
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $root 'build\icon.png'
$outDir = Join-Path $root 'build\appx'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$source = [System.Drawing.Image]::FromFile($sourcePath)
$background = ([System.Drawing.Bitmap]$source).GetPixel(4, 4)

function Save-Asset([string]$name, [int]$width, [int]$height, [double]$iconScale) {
  $bitmap = New-Object System.Drawing.Bitmap $width, $height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.Clear($background)

  $size = [int][Math]::Round([Math]::Min($width, $height) * $iconScale)
  $x = [int](($width - $size) / 2)
  $y = [int](($height - $size) / 2)
  $graphics.DrawImage($source, $x, $y, $size, $size)

  $bitmap.Save((Join-Path $outDir $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()
}

# Base (scale-100) assets plus scale-200 variants for high-DPI displays.
foreach ($scale in @(100, 200)) {
  $f = $scale / 100
  $suffix = if ($scale -eq 100) { '' } else { ".scale-$scale" }
  Save-Asset "StoreLogo$suffix.png" (50 * $f) (50 * $f) 1.0
  Save-Asset "Square44x44Logo$suffix.png" (44 * $f) (44 * $f) 1.0
  Save-Asset "Square150x150Logo$suffix.png" (150 * $f) (150 * $f) 1.0
  Save-Asset "SmallTile$suffix.png" (71 * $f) (71 * $f) 1.0
  Save-Asset "LargeTile$suffix.png" (310 * $f) (310 * $f) 1.0
  Save-Asset "Wide310x150Logo$suffix.png" (310 * $f) (150 * $f) 0.9
  Save-Asset "SplashScreen$suffix.png" (620 * $f) (300 * $f) 0.6
}

# Unplated taskbar/Start icons so Windows does not draw a coloured plate around the icon.
foreach ($target in @(16, 24, 32, 48, 256)) {
  Save-Asset "Square44x44Logo.targetsize-$target.png" $target $target 1.0
  Save-Asset "Square44x44Logo.targetsize-${target}_altform-unplated.png" $target $target 1.0
}

$source.Dispose()
'#{0:X2}{1:X2}{2:X2}' -f $background.R, $background.G, $background.B | Write-Output
