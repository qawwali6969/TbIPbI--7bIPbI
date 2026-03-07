const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const CLIENT_ID = process.env.PINTEREST_CLIENT_ID || '';
const CLIENT_SECRET = process.env.PINTEREST_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.PINTEREST_REDIRECT_URI || `http://localhost:${PORT}/callback.html`;
const DEFAULT_SCOPES = process.env.PINTEREST_SCOPES || 'boards:read,pins:read,pins:write';
const ETSY_API_KEY = process.env.ETSY_API_KEY || '';
const ETSY_API_SECRET = process.env.ETSY_API_SECRET || '';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8'
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(payload, null, 2));
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(text);
}

function collectJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error('Request body too large.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON body.'));
      }
    });
    req.on('error', reject);
  });
}

function getStaticFilePath(urlPath) {
  const normalizedPath = urlPath === '/' ? '/index.html' : urlPath;
  const resolvedPath = path.normalize(path.join(process.cwd(), normalizedPath));
  if (!resolvedPath.startsWith(process.cwd())) {
    return null;
  }
  return resolvedPath;
}

async function exchangeCodeForToken(code) {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Missing PINTEREST_CLIENT_ID or PINTEREST_CLIENT_SECRET.');
  }

  const basicAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`, 'utf8').toString('base64');
  const form = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    continuous_refresh: 'true'
  });

  const response = await fetch('https://api.pinterest.com/v5/oauth/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: form.toString()
  });

  const text = await response.text();
  let json;

  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    const message = json.message || json.error_description || json.error || 'Pinterest token exchange failed.';
    const error = new Error(message);
    error.statusCode = response.status;
    error.details = json;
    throw error;
  }

  return json;
}

async function fetchBoards(accessToken) {
  const response = await fetch('https://api.pinterest.com/v5/boards?page_size=5', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  const text = await response.text();
  let json;

  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    const message = json.message || json.error || 'Pinterest boards request failed.';
    const error = new Error(message);
    error.statusCode = response.status;
    error.details = json;
    throw error;
  }

  return json;
}

function getEtsyApiHeader() {
  if (!ETSY_API_KEY || !ETSY_API_SECRET) {
    throw new Error('Missing ETSY_API_KEY or ETSY_API_SECRET.');
  }

  return `${ETSY_API_KEY}:${ETSY_API_SECRET}`;
}

function extractEtsyListingId(listingUrl) {
  try {
    const parsedUrl = new URL(listingUrl);
    const match = parsedUrl.pathname.match(/\/listing\/(\d+)/i);
    return match ? match[1] : '';
  } catch {
    return '';
  }
}

async function etsyApiGet(pathname) {
  const response = await fetch(`https://api.etsy.com/v3/application${pathname}`, {
    headers: {
      'x-api-key': getEtsyApiHeader(),
      'User-Agent': 'KinosharaPinterestPublisher/1.0'
    }
  });

  const text = await response.text();
  let json;

  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    const message = json.error || json.message || json.detail || 'Etsy API request failed.';
    const error = new Error(message);
    error.statusCode = response.status;
    error.details = json;
    throw error;
  }

  return json;
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function extractMetaTag(html, propertyName) {
  const pattern = new RegExp(
    `<meta[^>]+(?:property|name)=["']${propertyName}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    'i'
  );
  const match = html.match(pattern);
  return match ? decodeHtml(match[1].trim()) : '';
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? decodeHtml(match[1].trim()) : '';
}

async function fetchEtsyPreview(listingUrl) {
  let parsedUrl;

  try {
    parsedUrl = new URL(listingUrl);
  } catch {
    throw new Error('Invalid listing URL.');
  }

  if (!/etsy\.com$/i.test(parsedUrl.hostname) && !/\.etsy\.com$/i.test(parsedUrl.hostname)) {
    throw new Error('Only Etsy listing URLs are supported for this preview.');
  }

  const listingId = extractEtsyListingId(parsedUrl.toString());

  if (listingId && ETSY_API_KEY && ETSY_API_SECRET) {
    try {
      const listing = await etsyApiGet(`/listings/${listingId}`);
      let imageUrl = '';

      try {
        const images = await etsyApiGet(`/shops/${listing.shop_id}/listings/${listingId}/images`);
        const firstImage = images.results?.[0] || images.items?.[0] || null;
        imageUrl = firstImage?.url_570xN || firstImage?.url_fullxfull || firstImage?.url || '';
      } catch {
        imageUrl = '';
      }

      return {
        source: 'etsy_api',
        listingId,
        listingUrl: listing.url || parsedUrl.toString(),
        title: listing.title || '',
        description: listing.description || '',
        imageUrl
      };
    } catch (error) {
      if (error.statusCode === 401 || error.statusCode === 403) {
        throw new Error(`Etsy API access is not active yet: ${error.message}`);
      }

      if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
        throw new Error(`Etsy API could not load this listing: ${error.message}`);
      }
    }
  }

  const response = await fetch(parsedUrl.toString(), {
    headers: {
      'User-Agent': 'KinosharaPinterestPublisher/1.0'
    }
  });

  const html = await response.text();

  if (!response.ok) {
    const error = new Error('Could not load the Etsy listing page.');
    error.statusCode = response.status;
    throw error;
  }

  const title = extractMetaTag(html, 'og:title') || extractTitle(html);
  const description = extractMetaTag(html, 'og:description') || extractMetaTag(html, 'description');
  const imageUrl = extractMetaTag(html, 'og:image');

  return {
    source: 'html_fallback',
    listingUrl: parsedUrl.toString(),
    title,
    description,
    imageUrl
  };
}

async function createPin(accessToken, payload) {
  const response = await fetch('https://api.pinterest.com/v5/pins', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let json;

  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    const message = json.message || json.error || 'Pinterest pin creation failed.';
    const error = new Error(message);
    error.statusCode = response.status;
    error.details = json;
    throw error;
  }

  return json;
}

async function handleApi(req, res, pathname) {
  if (pathname === '/health') {
    sendJson(res, 200, {
      ok: true,
      redirectUri: REDIRECT_URI,
      scopes: DEFAULT_SCOPES,
      hasClientId: Boolean(CLIENT_ID),
      hasClientSecret: Boolean(CLIENT_SECRET),
      hasEtsyApiKey: Boolean(ETSY_API_KEY),
      hasEtsyApiSecret: Boolean(ETSY_API_SECRET)
    });
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/pinterest/config') {
    sendJson(res, 200, {
      clientId: CLIENT_ID,
      redirectUri: REDIRECT_URI,
      scopes: DEFAULT_SCOPES,
      hasClientId: Boolean(CLIENT_ID),
      hasClientSecret: Boolean(CLIENT_SECRET)
    });
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/etsy/status') {
    sendJson(res, 200, {
      hasEtsyApiKey: Boolean(ETSY_API_KEY),
      hasEtsyApiSecret: Boolean(ETSY_API_SECRET)
    });
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/pinterest/token') {
    try {
      const body = await collectJsonBody(req);
      const code = typeof body.code === 'string' ? body.code.trim() : '';

      if (!code) {
        sendJson(res, 400, { error: 'Missing authorization code.' });
        return true;
      }

      const tokenPayload = await exchangeCodeForToken(code);
      sendJson(res, 200, tokenPayload);
      return true;
    } catch (error) {
      sendJson(res, error.statusCode || 500, {
        error: error.message,
        details: error.details || null
      });
      return true;
    }
  }

  if (req.method === 'POST' && pathname === '/api/pinterest/boards') {
    try {
      const body = await collectJsonBody(req);
      const accessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : '';

      if (!accessToken) {
        sendJson(res, 400, { error: 'Missing access token.' });
        return true;
      }

      const boards = await fetchBoards(accessToken);
      sendJson(res, 200, boards);
      return true;
    } catch (error) {
      sendJson(res, error.statusCode || 500, {
        error: error.message,
        details: error.details || null
      });
      return true;
    }
  }

  if (req.method === 'POST' && pathname === '/api/etsy/preview') {
    try {
      const body = await collectJsonBody(req);
      const listingUrl = typeof body.listingUrl === 'string' ? body.listingUrl.trim() : '';

      if (!listingUrl) {
        sendJson(res, 400, { error: 'Missing Etsy listing URL.' });
        return true;
      }

      const preview = await fetchEtsyPreview(listingUrl);
      sendJson(res, 200, preview);
      return true;
    } catch (error) {
      sendJson(res, error.statusCode || 500, {
        error: error.message,
        details: error.details || null
      });
      return true;
    }
  }

  if (req.method === 'POST' && pathname === '/api/pinterest/publish-pin') {
    try {
      const body = await collectJsonBody(req);
      const accessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : '';
      const boardId = typeof body.boardId === 'string' ? body.boardId.trim() : '';
      const title = typeof body.title === 'string' ? body.title.trim() : '';
      const description = typeof body.description === 'string' ? body.description.trim() : '';
      const destinationLink = typeof body.destinationLink === 'string' ? body.destinationLink.trim() : '';
      const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';

      if (!accessToken) {
        sendJson(res, 400, { error: 'Missing access token.' });
        return true;
      }

      if (!boardId || !title || !destinationLink || !imageUrl) {
        sendJson(res, 400, { error: 'Board, title, destination link, and image URL are required.' });
        return true;
      }

      const pinPayload = {
        board_id: boardId,
        title,
        description,
        link: destinationLink,
        media_source: {
          source_type: 'image_url',
          url: imageUrl
        }
      };

      const pin = await createPin(accessToken, pinPayload);
      sendJson(res, 200, pin);
      return true;
    } catch (error) {
      sendJson(res, error.statusCode || 500, {
        error: error.message,
        details: error.details || null
      });
      return true;
    }
  }

  return false;
}

function serveStaticFile(res, filePath) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      sendText(res, 404, 'Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream'
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  try {
    const handled = await handleApi(req, res, requestUrl.pathname);
    if (handled) {
      return;
    }

    if (!['GET', 'HEAD'].includes(req.method)) {
      sendJson(res, 405, { error: 'Method not allowed.' });
      return;
    }

    const filePath = getStaticFilePath(requestUrl.pathname);
    if (!filePath) {
      sendText(res, 400, 'Bad request');
      return;
    }

    serveStaticFile(res, filePath);
  } catch (error) {
    sendJson(res, 500, { error: error.message || 'Internal server error.' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Kinoshara server listening on http://${HOST}:${PORT}`);
  console.log(`Pinterest redirect URI: ${REDIRECT_URI}`);
});
