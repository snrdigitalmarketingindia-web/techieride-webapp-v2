/**
 * Mappls OAuth2 token cache
 *
 * The Static Key from the Mappls console is the client_id.
 * We exchange it for a short-lived access_token via the token endpoint.
 * Tokens are valid for 24h — cached in module scope (survives hot-reload
 * on the server process but is reset on full restart).
 */

const TOKEN_URL = 'https://outpost.mappls.com/api/security/oauth/token';

let cachedToken: string | null = null;
let tokenExpiry = 0; // unix ms

export async function getMaplsToken(): Promise<string | null> {
  const key = process.env.NEXT_PUBLIC_MAPPLS_KEY ?? '';
  if (!key) return null;

  // Return cached token if still valid (with 5-min buffer)
  if (cachedToken && Date.now() < tokenExpiry - 5 * 60 * 1000) {
    return cachedToken;
  }

  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      // Static key acts as client_id; Mappls uses client_credentials grant
      body: `grant_type=client_credentials&client_id=${key}&client_secret=${key}`,
    });

    const data = await res.json();
    console.log('[mappls-token] response:', JSON.stringify(data).slice(0, 200));

    if (data.access_token) {
      cachedToken = data.access_token;
      // expires_in is in seconds; default 24h if not provided
      const expiresIn = (data.expires_in ?? 86400) * 1000;
      tokenExpiry   = Date.now() + expiresIn;
      return cachedToken;
    }

    console.error('[mappls-token] no access_token in response:', data);
    return null;
  } catch (err) {
    console.error('[mappls-token] fetch error:', err);
    return null;
  }
}
