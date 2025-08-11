# Setting Up Custom Domain

## Frontend (Vercel):
1. Go to: https://vercel.com/priyanshu-bariks-projects/creditscoreplatform
2. Click "Settings" → "Domains"
3. Add your custom domain (e.g., `yourcreditplatform.com`)
4. Update DNS records as instructed

## Backend (Railway):
1. Go to: https://railway.com/project/9a44dd01-ed12-40e6-a039-45b76bcbef30
2. Click on "creditscoreplatform" service
3. Go to "Settings" → "Networking"
4. Add custom domain (e.g., `api.yourcreditplatform.com`)
5. Update DNS records as instructed

## Update Frontend API URL:
If you add a custom backend domain, update the API_BASE_URL in:
`react-frontend/src/components/WalletAnalyzer.tsx`

```tsx
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.yourcreditplatform.com';
```
