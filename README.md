# Trello Image Annotator

Trello Power-Up pro kreslení anotací (šipky, obdélníky, volná kresba, text) přímo na obrázky v přílohách karet.

## Stack

- **Trello Power-Up** (iframe, JS SDK)
- **Fabric.js** — canvas a kreslicí nástroje
- **Vercel** — hosting statických souborů + serverless API
- **Upstash Redis** — ukládání anotací (REST API)

## Nasazení

### 1. GitHub repo
```bash
git init
git add .
git commit -m "init: trello image annotator"
git remote add origin https://github.com/UZIVATEL/trello-annotator.git
git push -u origin main
```

### 2. Vercel
1. https://vercel.com/new → importuj GitHub repo
2. **Settings → Environment Variables** — přidej:

| Proměnná | Kde ji najdeš |
|---|---|
| `TRELLO_API_KEY` | https://trello.com/power-ups/admin → tvůj Power-Up |
| `UPSTASH_REDIS_REST_URL` | https://console.upstash.com → databáze → REST API |
| `UPSTASH_REDIS_REST_TOKEN` | tamtéž |

3. Deploy → zkopíruj URL (např. `https://trello-annotator.vercel.app`)

### 3. Trello Power-Up
1. https://trello.com/power-ups/admin → **New Power-Up**
2. **Iframe connector URL**: `https://TVOJE_VERCEL_URL/index.html`
3. Ponech jako **Unlisted**
4. Zkopíruj **API Key** → do Vercel env jako `TRELLO_API_KEY`

### 4. Přidání na nástěnku (pro klienty)
Sdílej přímý odkaz:
```
https://trello.com/add-card-power-up?key=API_KEY&name=Image+Annotator&url=https://TVOJE_VERCEL_URL/index.html
```

## Lokální vývoj
```bash
cp .env.example .env.local
# Vyplň hodnoty
npm install
npx vercel dev
```

## API

| Metoda | Endpoint | Popis |
|---|---|---|
| GET | `/api/annotations?cardId=&attachmentId=` | Načte anotace |
| POST | `/api/annotations` | Uloží anotace |

Redis klíč: `trello:card:{cardId}:annotations:{attachmentId}`
