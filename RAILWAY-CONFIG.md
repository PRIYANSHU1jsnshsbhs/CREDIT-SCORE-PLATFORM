# Railway Deployment Configuration

## Required Environment Variables
Set these in your Railway dashboard (railway.app):

```
NODE_ENV=production
PORT=9000
MORALIS_API_KEY=your_moralis_key_here
PRIVATE_KEY=your_private_key_here
CACHE_TTL_SECONDS=600
```

## Railway Configuration
1. Go to https://railway.app/project/9a44dd01-ed12-40e6-a039-45b76bcbef30
2. Click on your service
3. Go to Variables tab
4. Add the environment variables above
5. Redeploy the service

## Backend Entry Point
The main server file is: `real-server.js`

## Port Configuration
Railway will provide a PORT environment variable automatically.
Make sure real-server.js uses process.env.PORT.
