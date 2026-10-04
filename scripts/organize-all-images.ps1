Add-Type -AssemblyName System.Drawing

function Resize-ImageFile {
    param(
        [string]$sourcePath,
        [string]$destPath,
        [int]$targetWidth,
        [int]$targetHeight,
        [string]$format = "JPEG",
        [long]$quality = 90
    )

    if (-not (Test-Path $sourcePath)) {
        Write-Warning "Source not found: $sourcePath"
        return
    }

    $srcImg = [System.Drawing.Image]::FromFile((Resolve-Path $sourcePath))
    $destBmp = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($destBmp)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    if ($format -eq "JPEG") {
        $graphics.Clear([System.Drawing.Color]::White)
    } else {
        $graphics.Clear([System.Drawing.Color]::Transparent)
    }

    $graphics.DrawImage($srcImg, 0, 0, $targetWidth, $targetHeight)
    $graphics.Dispose()
    $srcImg.Dispose()

    $destDir = [System.IO.Path]::GetDirectoryName($destPath)
    if ($destDir -and -not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }

    if ($format -eq "PNG") {
        $destBmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    } elseif ($format -eq "ICO") {
        $destBmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Icon)
    } else {
        $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
        $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, $quality)
        $destBmp.Save($destPath, $codec, $encoderParams)
        $encoderParams.Dispose()
    }
    $destBmp.Dispose()
    Write-Host "Created: $destPath ($targetWidth x $targetHeight)"
}

Write-Host "=== 1. Ensuring target folders ===" -ForegroundColor Cyan
@("images", "images/banners", "images/products", "images/store", "icons") | ForEach-Object {
    if (-not (Test-Path $_)) { New-Item -ItemType Directory -Path $_ -Force | Out-Null }
}

Write-Host "`n=== 2. Optimizing Brand & Favicons ===" -ForegroundColor Cyan
$logoSrc = "images/website images/New folder/Store Logo.png"
if (-not (Test-Path $logoSrc)) { $logoSrc = "logo.png" }

# Master logo: 512x512 transparent PNG
Resize-ImageFile -sourcePath $logoSrc -destPath "logo.png" -targetWidth 512 -targetHeight 512 -format "PNG"
Resize-ImageFile -sourcePath $logoSrc -destPath "images/logo.png" -targetWidth 512 -targetHeight 512 -format "PNG"

# Favicon 32x32 PNG (< 10 KB)
$favSrc = "images/website images/New folder/Favicon.png"
if (-not (Test-Path $favSrc)) { $favSrc = "favicon.png" }
Resize-ImageFile -sourcePath $favSrc -destPath "favicon.png" -targetWidth 32 -targetHeight 32 -format "PNG"
Resize-ImageFile -sourcePath $favSrc -destPath "icons/favicon.png" -targetWidth 32 -targetHeight 32 -format "PNG"
Resize-ImageFile -sourcePath $favSrc -destPath "favicon-32x32.png" -targetWidth 32 -targetHeight 32 -format "PNG"
Resize-ImageFile -sourcePath $favSrc -destPath "icons/favicon-32x32.png" -targetWidth 32 -targetHeight 32 -format "PNG"

# Apple Touch Icon 180x180 PNG (< 25 KB)
$appleSrc = "images/website images/New folder/Apple Touch Icon  180px.png"
if (-not (Test-Path $appleSrc)) { $appleSrc = "apple-touch-icon.png" }
Resize-ImageFile -sourcePath $appleSrc -destPath "apple-touch-icon.png" -targetWidth 180 -targetHeight 180 -format "PNG"
Resize-ImageFile -sourcePath $appleSrc -destPath "icons/apple-touch-icon.png" -targetWidth 180 -targetHeight 180 -format "PNG"

# PWA Icons: 192x192 & 512x512
$pwa192Src = "images/website images/New folder/PWA Icon 192 px.png"
if (-not (Test-Path $pwa192Src)) { $pwa192Src = "icons/icon-192.png" }
Resize-ImageFile -sourcePath $pwa192Src -destPath "icons/icon-192.png" -targetWidth 192 -targetHeight 192 -format "PNG"

$pwa512Src = "images/website images/New folder/PWA Large Icon 512 px.png"
if (-not (Test-Path $pwa512Src)) { $pwa512Src = "icons/icon-512.png" }
Resize-ImageFile -sourcePath $pwa512Src -destPath "icons/icon-512.png" -targetWidth 512 -targetHeight 512 -format "PNG"

Write-Host "`n=== 3. Hero & Banners ===" -ForegroundColor Cyan
$heroSrc = "images/website images/New folder/hero banner.png"
if (-not (Test-Path $heroSrc)) { $heroSrc = "images/hero-banner.png" }

# Hero Banner: 1600x720 JPEG (< 200 KB) and PNG
Resize-ImageFile -sourcePath $heroSrc -destPath "images/hero-banner.jpg" -targetWidth 1600 -targetHeight 720 -format "JPEG" -quality 85
Resize-ImageFile -sourcePath $heroSrc -destPath "images/hero-banner.png" -targetWidth 1600 -targetHeight 720 -format "PNG"
Resize-ImageFile -sourcePath $heroSrc -destPath "images/banners/hero-banner-1.png" -targetWidth 1600 -targetHeight 720 -format "PNG"

$hero2Src = "images/hero-banner-2.png"
if (Test-Path $hero2Src) {
    Copy-Item $hero2Src "images/banners/hero-banner-2.png" -Force
}

$promoBannerSrc = "images/website images/New folder/Storefront Promo Banner 1200   400 px.png"
if (Test-Path $promoBannerSrc) {
    Resize-ImageFile -sourcePath $promoBannerSrc -destPath "images/banners/storefront-promo-banner.png" -targetWidth 1200 -targetHeight 400 -format "PNG"
}

Write-Host "`n=== 4. Social Share & Store Photography ===" -ForegroundColor Cyan
$socialSrc = "images/website images/New folder/Social Share Image 1200  630 px.jpg"
if (Test-Path $socialSrc) {
    Copy-Item $socialSrc "images/social-share.jpg" -Force
    Copy-Item $socialSrc "images/social-share-1200x630.jpg" -Force
    Copy-Item $socialSrc "images/store-hero.jpg" -Force
}

$interiorSrc = "images/website images/New folder/Store  Interior Photo 1200  800px.png"
if (-not (Test-Path $interiorSrc)) { $interiorSrc = "images/store-interior.png" }
if (Test-Path $interiorSrc) {
    # 1200x800 JPEG (< 200 KB)
    Resize-ImageFile -sourcePath $interiorSrc -destPath "images/store/store-entrance.jpg" -targetWidth 1200 -targetHeight 800 -format "JPEG" -quality 88
    Resize-ImageFile -sourcePath $interiorSrc -destPath "images/store/store-interior.jpg" -targetWidth 1200 -targetHeight 800 -format "JPEG" -quality 88
    Resize-ImageFile -sourcePath $interiorSrc -destPath "images/store-interior.jpg" -targetWidth 1200 -targetHeight 800 -format "JPEG" -quality 88
    Copy-Item $interiorSrc "images/store-interior.png" -Force
}

Write-Host "`n=== 5. Product Catalog 800x800 Photos (41 items) ===" -ForegroundColor Cyan
$mapping = @{
    "3D Ludo Wooden Family Game Set-#punnagaitoys.jpg" = "wooden-3d-ludo-family-board-game-punnagai.jpg"
    "Bubble Gun Toy Advertisement-#punnagaitoys.jpg" = "automatic-bubble-gun-blaster-toy-punnagai.jpg"
    "Catan Trade, Build, Settle-#punnagaitoys.jpg" = "catan-trade-build-settle-board-game-punnagai.jpg"
    "Crossword Think, Learn, Explore-#punnagaitoys.jpg" = "crossword-educational-word-game-punnagai.jpg"
    "Cute Strawberry Bunny Plush-#punnagaitoys.jpg" = "cute-strawberry-bunny-soft-plush-toy-punnagai.jpg"
    "Dancing Ange-#punnagaitoysl.jpg" = "dancing-angel-doll-lights-music-punnagai.jpg"
    "Dancing Bunny Musical Toy-#punnagaitoys.jpg" = "dancing-bunny-musical-light-toy-punnagai.jpg"
    "Dancing Elephant Musical Toy Adventure.jpg" = "dancing-elephant-musical-toy-adventure-punnagai.jpg"
    "Electric Swan Lights, Music & Motion-#punnagaitoys.jpg" = "electric-swan-lights-music-motion-punnagai.jpg"
    "Excavator jcb-#punnagaitoys.jpg" = "construction-jcb-excavator-truck-toy-punnagai.jpg"
    "Hanging Windmill Toy-#punnagaitoys.jpg" = "hanging-windmill-infant-crib-toy-punnagai.jpg"
    "Hover Soccer Ball Indoor Fun in Motion-#punnagaitoys.jpg" = "hover-soccer-ball-indoor-sports-toy-punnagai.jpg"
    "Ice Cream vandi Small Cart, Big Smiles-#punnagaitoys.jpg" = "ice-cream-cart-vandi-pretend-play-punnagai.jpg"
    "Little Doctor Set Toy-#punnagaitoys.jpg" = "little-doctor-medical-kit-pretend-play-punnagai.jpg"
    "Monopoly India Edition Board Game Showcase-#punnagaitoys.jpg" = "monopoly-india-edition-board-game-punnagai.jpg"
    "Neon RC Stunt Car Adventure-#punnagaitoys.jpg" = "neon-rc-stunt-car-adventure-punnagai.jpg"
    "Pictureka! Fast-Paced Picture Hunt-#punnagaitoys.jpg" = "pictureka-fast-paced-picture-hunt-game-punnagai.jpg"
    "Premium Wooden Chess Set-#punnagaitoys.jpg" = "premium-wooden-chess-set-punnagai.jpg"
    "RC Fighter Jet-#punnagaitoys.jpg" = "rc-fighter-jet-airplane-toy-punnagai.jpg"
    "RC Helicopter Smooth Flight Endless Fun-#punnagaitoys.jpg" = "rc-helicopter-smooth-flight-toy-punnagai.jpg"
    "Rainbow Teddy Bear-#punnagaitoys.jpg" = "rainbow-teddy-bear-soft-plush-toy-punnagai.jpg"
    "Smart Robot Lights, Sounds and Fun-#punnagaitoys.jpg" = "smart-robot-lights-sounds-fun-punnagai.jpg"
    "Soft Teddy Bear Ad-#punnagaitoys.jpg" = "soft-classic-teddy-bear-plush-punnagai.jpg"
    "SpaceGUN G-STRIKE Toy Blaster Ad-#punnagaitoys.jpg" = "space-gun-g-strike-toy-blaster-punnagai.jpg"
    "Splendor Strategy, Gems and Greatness-#punnagaitoys.jpg" = "splendor-strategy-board-game-punnagai.jpg"
    "Thomas Train Set Build, Play, Imagine-#punnagaitoys.jpg" = "thomas-train-track-set-punnagai.jpg"
    "Thunder Foam Dart Blaster Adventure-#punnagaitoys.jpg" = "thunder-foam-dart-blaster-gun-punnagai.jpg"
    "Thunder Strike Toy Blaster Ad-#punnagaitoys.jpg" = "thunder-strike-toy-blaster-gun-punnagai.jpg"
    "Transforming Robot Car Adventure-#punnagaitoys.jpg" = "transforming-robot-car-action-toy-punnagai.jpg"
    "Ultimate RC Stunt Car Adventure-#punnagaitoys.jpg" = "ultimate-rc-stunt-car-adventure-punnagai.jpg"
    "Unicorn Plush Toy-#punnagaitoys.jpg" = "unicorn-soft-plush-toy-punnagai.jpg"
    "WALKITALKI-#PUNNAGAITOYS.jpg" = "walkie-talkie-kids-adventure-set-punnagai.jpg"
    "Wooden Jenga Toy Advertisement-#punnagaitoys.jpg" = "wooden-jenga-tumbling-tower-game-punnagai.jpg"
    "Wooden Ludo Family Game-#punnagaitoys.jpg" = "wooden-ludo-classic-family-game-punnagai.jpg"
    "Wooden Memory Chess Game-#punnagaitoys.jpg" = "wooden-memory-chess-educational-game-punnagai.jpg"
    "Wooden Number Puzzle-#punnagaitoys.jpg" = "wooden-number-puzzle-math-toy-punnagai.jpg"
    "Wooden Shape Sorter Learn Through Play-#punnagaitoys.jpg" = "wooden-shape-sorter-educational-toy-punnagai.jpg"
    "Wooden Tic Tac Toe Play, Think, Grow-#punnagaitoys.jpg" = "wooden-tic-tac-toe-puzzle-game-punnagai.jpg"
    "farmula racing-#punnagaitoys.jpg" = "formula-one-racing-car-toy-punnagai.jpg"
    "lectric Worm-#punnagaitoys.jpg" = "electric-crawling-worm-musical-toy-punnagai.jpg"
    "rc sports car -punnagaitoys.jpg" = "rc-sports-racing-car-toy-punnagai.jpg"
}

$prodSrcDir = "images/punnagai_toys_products_800x800"
$placedCount = 0
foreach ($srcName in $mapping.Keys) {
    $srcFile = Join-Path $prodSrcDir $srcName
    $destFile = Join-Path "images/products" $mapping[$srcName]
    if (Test-Path $srcFile) {
        # Optimize to 800x800 JPEG quality 85 for < 100 KB target size
        Resize-ImageFile -sourcePath $srcFile -destPath $destFile -targetWidth 800 -targetHeight 800 -format "JPEG" -quality 85
        $placedCount++
    } else {
        Write-Warning "Missing 800x800 source: $srcFile"
    }
}
Write-Host "Placed $placedCount product photos into images/products/ at 800x800 px." -ForegroundColor Green

Write-Host "`nAll image placements complete!" -ForegroundColor Green
