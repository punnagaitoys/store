"""
scripts/organize-assets.py
Organizes all newly provided files and images into their respective project locations:
- Icons & Favicon: icons/ and root (favicon.png, favicon.ico, apple-touch-icon.png, icon-192.png, icon-512.png)
- Logos: logo.png (root), images/logo.png, images/logo.jpg
- Banners & Photography: images/banners/ and images/ (hero-banner, storefront promo, store interior, social share)
- Catalog & Spreadsheets: data/ (Excel sheet & branded images zip)
- Raw image uploads: moved from root to images/raw-uploads/
- Cleanup of temporary 'New folder' and loose files in root
"""
import os
import sys
import shutil
from PIL import Image

# Ensure utf-8 stdout
sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
NEW_FOLDER = os.path.join(BASE_DIR, "New folder")

# Ensure required directories exist
dirs = [
    os.path.join(BASE_DIR, "icons"),
    os.path.join(BASE_DIR, "images"),
    os.path.join(BASE_DIR, "images", "banners"),
    os.path.join(BASE_DIR, "images", "products"),
    os.path.join(BASE_DIR, "images", "raw-uploads"),
    os.path.join(BASE_DIR, "data")
]
for d in dirs:
    os.makedirs(d, exist_ok=True)
    print(f"Directory ready: {d}")

print("\n--- 1. Processing Icons & Brand Identity ---")

# Store Logo
store_logo_src = os.path.join(NEW_FOLDER, "Store Logo.png")
if os.path.exists(store_logo_src):
    shutil.copy2(store_logo_src, os.path.join(BASE_DIR, "logo.png"))
    shutil.copy2(store_logo_src, os.path.join(BASE_DIR, "images", "logo.png"))
    print("✓ Updated logo.png (root & images/logo.png)")

# Favicon
favicon_src = os.path.join(NEW_FOLDER, "Favicon.png")
if os.path.exists(favicon_src):
    shutil.copy2(favicon_src, os.path.join(BASE_DIR, "favicon.png"))
    shutil.copy2(favicon_src, os.path.join(BASE_DIR, "icons", "favicon.png"))
    
    # Generate multi-size favicon.ico
    with Image.open(favicon_src) as img:
        img_ico = img.convert("RGBA")
        img_ico.save(
            os.path.join(BASE_DIR, "favicon.ico"),
            format="ICO",
            sizes=[(16, 16), (32, 32), (48, 48)]
        )
        img_ico.save(
            os.path.join(BASE_DIR, "icons", "favicon.ico"),
            format="ICO",
            sizes=[(16, 16), (32, 32), (48, 48)]
        )
    print("✓ Created favicon.png & favicon.ico (root & icons/)")

# Apple Touch Icon (180x180)
apple_icon_src = os.path.join(NEW_FOLDER, "Apple Touch Icon  180px.png")
if os.path.exists(apple_icon_src):
    with Image.open(apple_icon_src) as img:
        img_180 = img.resize((180, 180), Image.Resampling.LANCZOS)
        img_180.save(os.path.join(BASE_DIR, "apple-touch-icon.png"), format="PNG")
        img_180.save(os.path.join(BASE_DIR, "icons", "apple-touch-icon.png"), format="PNG")
    print("✓ Created apple-touch-icon.png 180x180 (root & icons/)")

# PWA Icon 192px
pwa_192_src = os.path.join(NEW_FOLDER, "PWA Icon 192 px.png")
if os.path.exists(pwa_192_src):
    with Image.open(pwa_192_src) as img:
        img_192 = img.resize((192, 192), Image.Resampling.LANCZOS)
        img_192.save(os.path.join(BASE_DIR, "icons", "icon-192.png"), format="PNG")
    print("✓ Created icons/icon-192.png (192x192)")

# PWA Icon 512px
pwa_512_src = os.path.join(NEW_FOLDER, "PWA Large Icon 512 px.png")
if os.path.exists(pwa_512_src):
    with Image.open(pwa_512_src) as img:
        img_512 = img.resize((512, 512), Image.Resampling.LANCZOS)
        img_512.save(os.path.join(BASE_DIR, "icons", "icon-512.png"), format="PNG")
    print("✓ Created icons/icon-512.png (512x512)")

# logo.jpg
logo_jpg_src = os.path.join(BASE_DIR, "logo.jpg")
if os.path.exists(logo_jpg_src):
    shutil.copy2(logo_jpg_src, os.path.join(BASE_DIR, "images", "logo.jpg"))
    print("✓ Copied logo.jpg -> images/logo.jpg")

print("\n--- 2. Processing Banners & Photography ---")

# Social Share Image (1200x630)
social_share_src = os.path.join(NEW_FOLDER, "Social Share Image 1200  630 px.jpg")
if os.path.exists(social_share_src):
    shutil.copy2(social_share_src, os.path.join(BASE_DIR, "images", "social-share.jpg"))
    shutil.copy2(social_share_src, os.path.join(BASE_DIR, "images", "social-share-1200x630.jpg"))
    print("✓ Placed images/social-share.jpg (1200x630)")

# Store Interior Photo (1200x800)
store_interior_src = os.path.join(NEW_FOLDER, "Store  Interior Photo 1200  800px.png")
if os.path.exists(store_interior_src):
    shutil.copy2(store_interior_src, os.path.join(BASE_DIR, "images", "store-interior.png"))
    with Image.open(store_interior_src) as img:
        rgb_img = img.convert("RGB")
        rgb_img.save(os.path.join(BASE_DIR, "images", "store-interior.jpg"), quality=92)
        # Also update store-hero.jpg so existing views use real boutique photo
        rgb_img.save(os.path.join(BASE_DIR, "images", "store-hero.jpg"), quality=92)
    print("✓ Placed images/store-interior.png, store-interior.jpg & store-hero.jpg")

# Hero Banner 1 (1870x841)
hero_banner_src = os.path.join(NEW_FOLDER, "hero banner.png")
if os.path.exists(hero_banner_src):
    shutil.copy2(hero_banner_src, os.path.join(BASE_DIR, "images", "hero-banner.png"))
    shutil.copy2(hero_banner_src, os.path.join(BASE_DIR, "images", "banners", "hero-banner-1.png"))
    with Image.open(hero_banner_src) as img:
        rgb_img = img.convert("RGB")
        rgb_img.save(os.path.join(BASE_DIR, "images", "hero-banner.jpg"), quality=92)
    print("✓ Placed images/hero-banner.png, hero-banner.jpg & images/banners/hero-banner-1.png")

# Hero Banner 2 (1672x941)
hero_banner_2_src = os.path.join(BASE_DIR, "hero banner 2.png")
if os.path.exists(hero_banner_2_src):
    shutil.copy2(hero_banner_2_src, os.path.join(BASE_DIR, "images", "hero-banner-2.png"))
    shutil.copy2(hero_banner_2_src, os.path.join(BASE_DIR, "images", "banners", "hero-banner-2.png"))
    print("✓ Placed images/hero-banner-2.png & images/banners/hero-banner-2.png")

# Storefront Promo Banner (1535x1024)
promo_banner_src = os.path.join(NEW_FOLDER, "Storefront Promo Banner 1200   400 px.png")
if os.path.exists(promo_banner_src):
    shutil.copy2(promo_banner_src, os.path.join(BASE_DIR, "images", "banners", "storefront-promo-banner.png"))
    print("✓ Placed images/banners/storefront-promo-banner.png")

# Summer Sale Banner
benner2_src = os.path.join(BASE_DIR, "bennerimage2.jpg")
if os.path.exists(benner2_src):
    shutil.copy2(benner2_src, os.path.join(BASE_DIR, "images", "banners", "banner-summer-sale.jpg"))
    shutil.copy2(benner2_src, os.path.join(BASE_DIR, "images", "banners", "bennerimage2.jpg"))
    print("✓ Placed images/banners/banner-summer-sale.jpg")

print("\n--- 3. Organizing Catalog Spreadsheets & Archives ---")

# Excel Spreadsheet
excel_src = os.path.join(BASE_DIR, "Punnagai_Toys_42_Products_Website_Upload.xlsx")
if os.path.exists(excel_src):
    shutil.copy2(excel_src, os.path.join(BASE_DIR, "data", "Punnagai_Toys_42_Products_Website_Upload.xlsx"))
    print("✓ Placed data/Punnagai_Toys_42_Products_Website_Upload.xlsx")

# Branded Images Zip
zip_src = os.path.join(BASE_DIR, "Punnagai_Toys_Branded_42_Images.zip")
if os.path.exists(zip_src):
    shutil.copy2(zip_src, os.path.join(BASE_DIR, "data", "Punnagai_Toys_Branded_42_Images.zip"))
    print("✓ Placed data/Punnagai_Toys_Branded_42_Images.zip")

print("\n--- 4. Moving Loose Raw Image Uploads to images/raw-uploads/ ---")

root_files = [f for f in os.listdir(BASE_DIR) if os.path.isfile(os.path.join(BASE_DIR, f))]
moved_count = 0
for f in root_files:
    # Identify loose product photos
    is_raw_product = (
        "#punnagaitoys" in f.lower() or
        f in [
            "Dancing Elephant Musical Toy Adventure.jpg",
            "farmula racing-#punnagaitoys.jpg",
            "lectric Worm-#punnagaitoys.jpg",
            "rc sports car -punnagaitoys.jpg"
        ]
    )
    if is_raw_product:
        src_path = os.path.join(BASE_DIR, f)
        dest_path = os.path.join(BASE_DIR, "images", "raw-uploads", f)
        shutil.move(src_path, dest_path)
        moved_count += 1

print(f"✓ Moved {moved_count} loose product photos to images/raw-uploads/")

# Remove temporary loose root duplicates that are now safely in images/
for temp_root in ["hero banner 2.png", "bennerimage2.jpg"]:
    p = os.path.join(BASE_DIR, temp_root)
    if os.path.exists(p):
        os.remove(p)
        print(f"✓ Cleaned up redundant root file: {temp_root}")

# Clean up 'New folder'
if os.path.exists(NEW_FOLDER):
    shutil.rmtree(NEW_FOLDER)
    print("✓ Cleaned up temporary 'New folder'")

print("\n Asset Organization Complete!")
