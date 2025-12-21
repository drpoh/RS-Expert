import os
import json
import glob
import datetime

PROFILE = os.environ.get("IG_PROFILE", "rs.expert")
MAX_ITEMS = int(os.environ.get("MAX_ITEMS", "9"))

ROOT = f"assets/ig/{PROFILE}"
OUT = "data/instagram.json"

os.makedirs("data", exist_ok=True)

# We prefer jpg thumbnails (instaloader often saves .jpg for images and thumbnails)
files = []
for ext in ("jpg", "jpeg", "png", "webp"):
    files.extend(glob.glob(os.path.join(ROOT, f"*.{ext}")))

# Keep only media (ignore sidecar metadata if any)
files = [f for f in files if os.path.isfile(f)]

# Sort newest first by filename (starts with date_utc)
files = sorted(files, reverse=True)

items = []
seen_shortcodes = set()

for f in files:
    name = os.path.basename(f)

    shortcode = ""
    if "_UTC_" in name:
        shortcode = name.split("_UTC_")[-1].split(".")[0].strip()

    # Avoid duplicates if multiple files exist for same post
    if shortcode and shortcode in seen_shortcodes:
        continue
    if shortcode:
        seen_shortcodes.add(shortcode)

    url = f"https://www.instagram.com/p/{shortcode}/" if shortcode else f"https://www.instagram.com/{PROFILE}/"

    # Path for the website
    web_path = "/" + f.replace("\\", "/")

    items.append(
        {
            "url": url,
            "image": web_path,
            "alt": f"Instagram post {shortcode}" if shortcode else f"Instagram {PROFILE}",
        }
    )

    if len(items) >= MAX_ITEMS:
        break

out = {
    "updatedAt": datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
    "profile": PROFILE,
    "items": items,
}

with open(OUT, "w", encoding="utf-8") as fp:
    json.dump(out, fp, ensure_ascii=False, indent=2)

print(f"Wrote {len(items)} items to {OUT}")
