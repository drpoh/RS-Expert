import os
import json
import glob
from datetime import datetime

PROFILE = os.environ.get("IG_PROFILE", "rs.expert")
MAX_ITEMS = int(os.environ.get("MAX_ITEMS", "30"))   # увеличил до 12 по умолчанию

ROOT = f"assets/ig/{PROFILE}"
OUT = "data/instagram.json"

os.makedirs("data", exist_ok=True)

# Собираем все изображения
files = []
for ext in ("jpg", "jpeg", "png", "webp"):
    files.extend(glob.glob(os.path.join(ROOT, f"*.{ext}")))

# Только реальные файлы
files = [f for f in files if os.path.isfile(f)]

# Сортируем по имени файла (новые сначала, т.к. имя начинается с даты)
files = sorted(files, reverse=True)

items = []
seen_shortcodes = set()

for f in files:
    name = os.path.basename(f)
    
    # Извлекаем shortcode
    shortcode = ""
    if "_UTC_" in name:
        try:
            shortcode = name.split("_UTC_")[-1].split(".")[0].strip()
        except:
            continue

    if shortcode and shortcode in seen_shortcodes:
        continue
    if shortcode:
        seen_shortcodes.add(shortcode)

    web_path = "/" + f.replace("\\", "/").replace(" ", "%20")  # безопасный URL

    url = f"https://www.instagram.com/p/{shortcode}/" if shortcode else f"https://www.instagram.com/{PROFILE}/"

    items.append({
        "image": web_path,
        "url": url,
        "alt": f"RS-Expert Instagram — {shortcode[:8]}" if shortcode else "Instagram post",
        "shortcode": shortcode
    })

    if len(items) >= MAX_ITEMS:
        break

# Финальный JSON
out = {
    "updatedAt": datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
    "profile": PROFILE,
    "itemCount": len(items),
    "items": items
}

with open(OUT, "w", encoding="utf-8") as fp:
    json.dump(out, fp, ensure_ascii=False, indent=2)

print(f"✅ Успешно записано {len(items)} фото из Instagram в {OUT}")
