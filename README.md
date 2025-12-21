# RS-Expert Oy — Website (v0.1.0)

Static website for **RS-Expert Oy** hosted on **Cloudflare Pages**.  
Content is managed by editing a single JSON file and uploading images/PDFs into the repository.

✅ No CMS / no Workers / no paid hosting required  
✅ Updates publish automatically after each GitHub commit

---

## 🔥 Live site
- Cloudflare Pages: `https://rs-expert.pages.dev/`

---

## 📁 Project structure

/
├─ index.html
├─ services.html
├─ gallery.html
├─ documents.html
├─ tarjouspyynto.html
├─ contact.html
├─ data/
│ └─ site.json
└─ assets/
├─ site.js
├─ styles.css
└─ uploads/
├─ example-1.jpg
├─ example-2.jpg
├─ example-3.jpg
├─ terms.pdf
└─ safety.pdf

### What files do what
- **`data/site.json`** — all site content (texts, menu, services, gallery items, documents, reviews, FAQ, Tally ID).
- **`assets/site.js`** — loads `data/site.json` and renders content into the pages.
- **`assets/styles.css`** — premium UI styling + animations.
- **`assets/uploads/`** — your images and PDF documents.

---

## ✅ How to edit site content (main workflow)

### 1) Edit texts / menu / services / gallery / documents / FAQ / reviews
Open:
- `data/site.json`

Update values and commit.

### 2) Add images and PDFs
Upload files into:
- `assets/uploads/`

Then reference them in `data/site.json` using paths like:
- `"/assets/uploads/my-photo.jpg"`
- `"/assets/uploads/price-list.pdf"`

**Tip:** use simple filenames (no spaces), e.g.:
- `kitchen-outlets.jpg`
- `electrical-panel.pdf`

---

## 🔧 Change Tally form ID (Tarjouspyyntö popup)

Tally popup is used for “Pyydä tarjous” buttons.

Open:
- `data/site.json`

Find:
```json
"tallyFormId": "81z8Dk"

📞 Change phone and email

In data/site.json update:

"phone": "+358 XX XXX XXXX",
"email": "info@rs-expert.fi"


These values will update in the header/footer buttons automatically.

🖼️ Add / edit gallery items

In data/site.json → gallery array:

{
  "title": "Ulkovalaistus + tunnistin",
  "city": "Kerava",
  "type": "Valaistus",
  "image": "/assets/uploads/example-2.jpg",
  "text": "Energiatehokas LED + liiketunnistin.",
  "order": 2,
  "enabled": true
}


image must point to a file in /assets/uploads/

enabled: true shows it

order controls sorting

📄 Add / edit documents (PDF)

In data/site.json → documents array:

{
  "title": "Turvallisuusohje (PDF)",
  "category": "Ohjeet",
  "url": "/assets/uploads/safety.pdf",
  "order": 2,
  "enabled": true
}


Upload the PDF into:

assets/uploads/

Then set url to that path.

✅ Enable/disable any item

Most lists support:

enabled: true/false

Set enabled: false to hide an item without deleting it.

🚀 Deployment (Cloudflare Pages)

This site is a pure static site.
Cloudflare Pages should use no build commands:

Build command: None

Deploy command: None

Root directory: (empty)

After you commit to main, Pages updates automatically.

🧪 Quick checks

After changes, verify:

https://rs-expert.pages.dev/data/site.json loads JSON

Home page shows services/gallery

“Pyydä tarjous” button opens Tally popup

If something is empty, check:

data/site.json must be valid JSON (no comments)

file paths in /assets/uploads/ are correct (case sensitive)
