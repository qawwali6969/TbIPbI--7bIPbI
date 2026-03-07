# Kinoshara - Pinterest App Website

## Structure

```
/
├── index.html
├── privacy.html
├── callback.html
├── terms.html
├── server.js
├── package.json
├── .env.example
├── render.yaml
└── README.md
```

## Main use case

Kinoshara uses Pinterest API for a merchant publishing workflow:
- merchant authorizes a Pinterest account
- the workflow can read selected board data
- the system publishes original product Pins based on approved Kinoshara listings

## Pages

### 1. index.html
- Public landing page for Kinoshara Pinterest Publisher
- Describes the merchant publishing workflow
- Links to Privacy Policy and Terms

### 2. privacy.html
- Privacy Policy for website operations and Pinterest integration
- Describes scopes, OAuth flow, and data handling

### 3. callback.html
- Registered Pinterest OAuth callback page
- Displays authorization code or error state

### 4. terms.html
- Terms of use and returns information
- Explains the Pinterest integration in customer-facing language

### 5. server.js
- Static file server
- `/api/pinterest/config`
- `/api/pinterest/token`
- `/api/pinterest/boards`

## Pinterest setup

1. Create the app: https://developers.pinterest.com/apps/
2. Add redirect URI: `https://kinoshara.app/callback.html`
3. Request scopes: `boards:read`, `boards:write`, `pins:read`, `pins:write`
4. Set Privacy Policy URL: `https://kinoshara.app/privacy.html`

## Demo video checklist

1. Open the OAuth URL
2. Show Pinterest login
3. Show `Give access`
4. Show redirect to `callback.html`
5. Show receipt of authorization code
6. Show code exchange to token
7. Show real API usage such as reading boards or publishing a test product Pin

## Environment variables

- `PINTEREST_CLIENT_ID`
- `PINTEREST_CLIENT_SECRET`
- `PINTEREST_REDIRECT_URI`
- `PINTEREST_SCOPES` optional, default `boards:read,pins:read,pins:write`
- `PORT` optional
- `HOST` optional
