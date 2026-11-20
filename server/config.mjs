const bool = (v) => v === 'true';
const number = (v, fallback, min = 1, max = 1e6) => {
  const n = v === undefined || v === '' ? fallback : Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error('Invalid numeric server configuration');
  return n;
};
const real = value => value && !/your[-_ ]|replace[-_ ]|example\.com|your-project/i.test(value);
export function readConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const config = {
    production, port: number(env.PORT, 3001, 1, 65535), host: env.HOST || '127.0.0.1',
    origin: (env.PUBLIC_APP_URL || 'http://localhost:5173').replace(/\/$/, ''),
    supabaseUrl: env.SUPABASE_URL || '', supabaseKey: env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '',
    smsEnabled: bool(env.SMS_ENABLED), emailEnabled: bool(env.EMAIL_ENABLED), workerEnabled: env.WORKER_ENABLED !== 'false',
    sinchUrl: (env.SINCH_BASE_URL || 'https://au.app.api.sinch.com').replace(/\/$/, ''),
    sinchKey: env.SINCH_API_KEY || '', sinchSecret: env.SINCH_API_SECRET || '',
    sender: env.SINCH_SENDER_ID || '', senderType: env.SINCH_SENDER_TYPE || 'ALPHANUMERIC',
    channel: env.SINCH_CHANNEL || 'SMS', mediaUrl: env.SINCH_MEDIA_URL || '',
    rcsTitle: env.SINCH_RCS_TITLE || 'Your Raikan conveyancing quote',
    allowedCallingCodes: (env.SMS_ALLOWED_CALLING_CODES || '61').split(',').map(v => v.trim()),
    maxSegments: number(env.SMS_MAX_SEGMENTS, 10, 1, 30),
    smtpHost: env.SMTP_HOST || 'smtp.gmail.com', smtpPort: number(env.SMTP_PORT, 587, 1, 65535),
    smtpSecure: bool(env.SMTP_SECURE), smtpUser: env.SMTP_USER || '', smtpPassword: env.SMTP_PASSWORD || '',
    emailFrom: env.EMAIL_FROM || '', teamEmail: env.TEAM_EMAIL || '',
    turnstileSiteKey: env.TURNSTILE_SITE_KEY || '', turnstileSecret: env.TURNSTILE_SECRET_KEY || '',
    salt: env.RATE_LIMIT_SALT || 'local-development-only', tokenSecret: env.LEAD_TOKEN_SECRET || 'local-development-token-secret', trustProxy: bool(env.TRUST_PROXY),
    workerInterval: number(env.WORKER_INTERVAL_MS, 5000, 500, 60000),
    requestLimit: number(env.REQUESTS_PER_HOUR, 10, 1, 100),
    phoneLimit: number(env.QUOTES_PER_PHONE_PER_DAY, 3, 1, 100),
  };
  config.databaseReady = Boolean(real(config.supabaseUrl) && real(config.supabaseKey));
  config.smsReady = config.smsEnabled && Boolean(real(config.sinchKey) && real(config.sinchSecret));
  config.emailReady = config.emailEnabled && Boolean(real(config.smtpUser) && real(config.smtpPassword) && real(config.emailFrom));
  const origin = new URL(config.origin);
  if (!['http:', 'https:'].includes(origin.protocol) || origin.origin !== config.origin) throw new Error('PUBLIC_APP_URL must be an origin without a path');
  if (!/^https:\/\/(?:au|eu|us)\.app\.api\.sinch\.com$/.test(config.sinchUrl)) throw new Error('Use an official regional Sinch Engage API URL');
  if (!['SMS', 'MMS', 'RCS'].includes(config.channel)) throw new Error('SINCH_CHANNEL must be SMS, MMS or RCS');
  if (!['ALPHANUMERIC', 'INTERNATIONAL', 'SHORTCODE'].includes(config.senderType)) throw new Error('Invalid SINCH_SENDER_TYPE');
  if (config.mediaUrl && new URL(config.mediaUrl).protocol !== 'https:') throw new Error('SINCH_MEDIA_URL must use HTTPS');
  if (config.smsEnabled && !config.smsReady) throw new Error('SMS_ENABLED requires Sinch API key and secret');
  if (config.emailEnabled && !config.emailReady) throw new Error('EMAIL_ENABLED requires SMTP credentials and EMAIL_FROM');
  if (config.channel === 'MMS' && config.smsEnabled && !config.mediaUrl) throw new Error('MMS requires SINCH_MEDIA_URL');
  if (production && (origin.protocol !== 'https:' || !config.turnstileSecret || !config.turnstileSiteKey || config.salt.length < 32 || config.tokenSecret.length < 32 || config.tokenSecret === 'local-development-token-secret')) throw new Error('Production requires HTTPS, Turnstile keys and random RATE_LIMIT_SALT / LEAD_TOKEN_SECRET values of at least 32 characters');
  if (Boolean(config.turnstileSiteKey) !== Boolean(config.turnstileSecret)) throw new Error('Configure both Turnstile keys together');
  return config;
}
