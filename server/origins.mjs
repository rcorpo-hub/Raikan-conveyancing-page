const loopback = hostname => ['localhost', '127.0.0.1', '[::1]'].includes(hostname);

function parseOrigin(value, name) {
  const candidate = value.trim().replace(/\/$/, '');
  let url;
  try { url = new URL(candidate); } catch { throw new Error(`${name} must be a website origin without a path`); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hostname.includes('*') || url.origin !== candidate) {
    throw new Error(`${name} must be a website origin without a path`);
  }
  return url.origin;
}

export function readAppOrigins(env) {
  const vercel = env.VERCEL === '1';
  // Use server-provided deployment identities, never a request's Host/Forwarded headers.
  const deployed = vercel ? ['VERCEL_PROJECT_PRODUCTION_URL', 'VERCEL_URL', 'VERCEL_BRANCH_URL'].flatMap(key => {
    const host = env[key]?.trim();
    if (!host) return [];
    if (!/^[a-z0-9.-]+$/i.test(host)) throw new Error(`${key} must contain a hostname only`);
    return [parseOrigin(`https://${host.toLowerCase()}`, key)];
  }) : [];
  let origin = parseOrigin(env.PUBLIC_APP_URL || deployed[0] || 'http://localhost:5173', 'PUBLIC_APP_URL');
  // A copied local .env must not make the deployed site reject its own form submissions.
  if (vercel && loopback(new URL(origin).hostname)) {
    if (!deployed[0]) throw new Error('Set PUBLIC_APP_URL to the HTTPS website URL on Vercel');
    origin = deployed[0];
  }
  const extra = (env.ALLOWED_APP_ORIGINS || '').split(',').filter(value => value.trim()).map(value => parseOrigin(value, 'ALLOWED_APP_ORIGINS'));
  const allowedOrigins = [...new Set([origin, ...deployed, ...extra])];
  if ((env.NODE_ENV === 'production' || vercel) && allowedOrigins.some(value => new URL(value).protocol !== 'https:')) {
    throw new Error('Deployed application origins must use HTTPS');
  }
  return { origin, allowedOrigins, vercel };
}
