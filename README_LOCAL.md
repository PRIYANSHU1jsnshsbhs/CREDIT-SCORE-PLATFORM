Local development

1) Copy .env.example to .env and set PRIVATE_KEY and MORALIS_API_KEYS or MORALIS_API_KEY.

2) Install dependencies and start server:

```bash
npm install
node real-server.js
```

3) Frontend (dev):

```bash
cd react-frontend
npm install
npm run dev
```

4) Test endpoints locally:

```bash
curl -s http://localhost:9000/debug/env | python3 -m json.tool
curl -s -X POST http://localhost:9000/api/calculate-onchain-score -H "Content-Type: application/json" -d '{"walletAddress":"0x1234..."}' | python3 -m json.tool
curl -s -X POST http://localhost:9000/api/mint-certificate -H "Content-Type: application/json" -d '{"walletAddress":"0x1234...","score":75}' -i
```

Notes:
- The server binds to the port defined by PORT in .env (default 9000). If port in use, stop existing server or change PORT.
- Badge images are loaded from `images/badges/badge-mapping-ipfs.json` if present; ensure `images/` is included in deploy.
