# 🌐 Custom Curated CloudStream Extension Repository

An automated, multi-source **CloudStream extension repository** featuring Phisher's **WatchParty** and **Ultima**, combined with top streaming providers from **Adam Knight MegaRepo**, **SaurabhKaperwan CSX**, and the **Official CloudStream Repositories**.

---

## 📲 How to Add to CloudStream

### Option 1: Direct Repository URL
1. Open **CloudStream** on your Android phone, tablet, or Android TV.
2. Navigate to: **Settings ⚙️ ➔ Extensions ➔ Add Repository**.
3. Paste your repository manifest link:
   ```text
   https://raw.githubusercontent.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPO_NAME>/refs/heads/builds/repo.json
   ```
4. Click **Download / Add**.
5. Browse your newly added repository and install only the plugins you want!

### Option 2: 1-Click Android Launch
If browsing on an Android device:
```text
cloudstreamrepo://raw.githubusercontent.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPO_NAME>/refs/heads/builds/repo.json
```

---

## 🌟 Featured Extensions Included

| Extension | Developer / Source | Category | Description |
| :--- | :--- | :--- | :--- |
| **WatchParty** | Phisher98 | Social / Tools | Synchronized real-time watch party with live in-player chat, emoji reactions, and host controls. |
| **Ultima** | Phisher98 & RowdyRushya | All-in-One Home | Unified home screen combining content sections across multiple extensions, plus cross-device sync. |
| **CineStream** | Phisher98 | Movies & TV | High-speed, high-resolution scraper for Bollywood, Hollywood, and regional content. |
| **SuperStream** | MegaRepo | Movies & TV | Fast streaming source with multi-quality links. |
| **VegaMovies** | CSX (SaurabhKaperwan) | Hindi & Dubbed | Popular Indian and Hollywood dual-audio movies. |
| **Bollyflix** | CSX (SaurabhKaperwan) | Hindi & Regional | Direct download and stream links for Hindi series and movies. |
| **AnimePahe / HiAnime** | Phisher / MegaRepo | Anime | Fast anime streaming with subbed and dubbed options. |
| **YouTube / Twitch** | Official | Live & Video | Official video and live stream providers. |

*(Over 500+ curated and deduplicated extensions available)*

---

## 🎉 WatchParty (Watch Together) Setup

To watch movies and anime synchronously with friends using the included **WatchParty** plugin:

1. **Only the host needs a database.** Create a free Google Firebase Realtime Database:
   - Go to [Firebase Console](https://console.firebase.google.com/) and create a project.
   - Go to **Build ➔ Realtime Database ➔ Create Database** (Rules: `.read: true, .write: true`).
   - Copy your database reference URL (e.g., `https://my-party.firebaseio.com/`).
2. In CloudStream: **Settings ➔ Extensions ➔ WatchParty ➔ Open Settings** ➔ Paste your database URL.
3. Click **🎉 Create New Room** and copy your 1-click invite link:
   ```text
   https://my-party.firebaseio.com/#ROOM_CODE
   ```
4. **Friends join in 1 click!** When friends paste your invite link into CloudStream, their app automatically connects without them ever needing to configure Firebase.

📖 [Read the complete step-by-step Watch Party guide](docs/WATCH_PARTY_GUIDE.md)

---

## ⚙️ How It Works (Automated Aggregation)

This repository uses an automated Node.js aggregation pipeline running via **GitHub Actions**:

```
Upstream Sources (Phisher, MegaRepo, CSX, Official, doGior)
                          │
                          ▼
             Normalization & Reachability
        (Verifies HTTPS, .cs3 formats, schemas)
                          │
                          ▼
            Smart Deduplication Engine
       - Source Overrides (WatchParty -> Phisher)
       - Prefers Working (status: 1) over Broken (status: 0)
       - Prefers Higher Version (v2 > v1)
       - Priority Weighting
                          │
                          ▼
        Build Outputs (Published to 'builds' branch)
         ├── repo.json     (CloudStream Manifest)
         ├── plugins.json  (500+ extensions)
         ├── catalog.json  (Rich metadata)
         └── index.html    (Web catalog viewer)
```

- **Runs automatically every 6 hours** (`0 */6 * * *`) via `.github/workflows/build-repo.yml`.
- Never hosts or redistributes `.cs3` files directly; points CloudStream to original verified upstream binaries.

---

## 🛠️ Customization

You can fully customize which extensions are included, which developers take priority, or exclude categories by modifying [`config/sources.json`](config/sources.json):

```json
{
  "sources": [
    {
      "id": "phisher",
      "name": "Phisher98 Extensions",
      "url": "https://raw.githubusercontent.com/phisher98/cloudstream-extensions-phisher/refs/heads/builds/plugins.json",
      "priority": 100,
      "enabled": true
    }
  ],
  "preferredPlugins": {
    "WatchParty": "phisher",
    "Ultima": "phisher"
  },
  "filter": {
    "excludeNsfw": false,
    "excludeDown": true,
    "whitelist": [],
    "blacklist": []
  }
}
```

### Local Development & Testing

```bash
# Run unit tests
npm test

# Build repository outputs manually
npm run build
```

---

## 📄 License & Attribution

- Built for the CloudStream community.
- Individual extensions belong to their respective developers (Phisher98, Adam Knight, SaurabhKaperwan, doGior, and recloudstream authors) under GNU GPLv3 and MIT licenses.
