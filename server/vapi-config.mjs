import { parsePhoneNumberFromString } from 'libphonenumber-js';

const integer = (value, fallback, min, max) => {
  const n = value === undefined || value === '' ? fallback : Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error('Invalid Vapi numeric setting');
  return n;
};
const list = value => (value || '').split(',').map(v => v.trim()).filter(Boolean);
export function readVapiConfig(env) {
  const config = {
    enabled: env.VAPI_ENABLED === 'true', testMode: env.VAPI_TEST_MODE !== 'false',
    key: env.VAPI_API_KEY || '', assistantId: env.VAPI_ASSISTANT_ID || '350c38af-7b86-4ac4-b5c5-a8f3362d6d48', phoneNumberId: env.VAPI_PHONE_NUMBER_ID || '', structuredOutputId:env.VAPI_STRUCTURED_OUTPUT_ID || '705ce0dd-4adb-46d4-9179-a9563fc79ea3',
    webhookSecret: env.VAPI_WEBHOOK_SECRET || '', credentialId: env.VAPI_SERVER_CREDENTIAL_ID || '',
    serverUrl: (env.VAPI_SERVER_URL || '').replace(/\/$/, ''),
    testNumbers: list(env.VAPI_TEST_NUMBERS), callingCodes: list(env.VAPI_ALLOWED_CALLING_CODES || '91'),
    delaySeconds: integer(env.VAPI_CALL_DELAY_SECONDS, 30, 30, 3600),
    maxSeconds: integer(env.VAPI_MAX_CALL_SECONDS, 300, 60, 600),
    timezone: env.VAPI_TIMEZONE || 'Asia/Kolkata',
    startHour: integer(env.VAPI_CALL_START_HOUR, 9, 0, 23), endHour: integer(env.VAPI_CALL_END_HOUR, 17, 1, 24),
    blockedDates: list(env.VAPI_BLOCKED_DATES),
    transferNumber: env.VAPI_TRANSFER_NUMBER || '', businessEmail: env.VAPI_BUSINESS_EMAIL || '',
  };
  if (config.startHour >= config.endHour) throw new Error('Vapi call end hour must follow start hour');
  new Intl.DateTimeFormat('en-AU', {timeZone: config.timezone});
  for (const value of [...config.testNumbers, ...(config.transferNumber ? [config.transferNumber] : [])]) {
    const parsed = parsePhoneNumberFromString(value);
    if (!parsed?.isValid() || parsed.number !== value) throw new Error('Vapi numbers must use valid international +countrycode format');
  }
  if (config.blockedDates.some(value => !/^\d{4}-\d{2}-\d{2}$/.test(value))) throw new Error('Vapi blocked dates must use YYYY-MM-DD');
  if (config.enabled) {
    if (!config.key || !config.assistantId || !config.phoneNumberId || config.webhookSecret.length < 32 || !config.credentialId) throw new Error('Vapi requires API key, assistant ID, phone number ID, server credential ID and a webhook secret of at least 32 characters');
    if (!config.serverUrl || new URL(config.serverUrl).protocol !== 'https:') throw new Error('Vapi requires a public HTTPS VAPI_SERVER_URL');
    if (config.testMode && !config.testNumbers.length) throw new Error('Vapi test mode requires VAPI_TEST_NUMBERS');
    if (!config.callingCodes.length || config.callingCodes.some(v => !/^\d{1,3}$/.test(v))) throw new Error('Invalid Vapi calling codes');
    if (config.testMode && config.testNumbers.some(number => !config.callingCodes.includes(parsePhoneNumberFromString(number)?.countryCallingCode))) throw new Error('Every Vapi test number must use an allowed calling code');
  }
  return config;
}

export function callAllowed(number, config) {
  const parsed = parsePhoneNumberFromString(number);
  return !!parsed?.isValid() && config.callingCodes.includes(parsed.countryCallingCode) && (!config.testMode || config.testNumbers.includes(parsed.number));
}

const windowFormatter=config=>new Intl.DateTimeFormat('en-GB', {timeZone:config.timezone, year:'numeric', month:'2-digit', day:'2-digit', weekday:'short', hour:'2-digit', hourCycle:'h23'});
export function inCallWindow(date, config, formatter=windowFormatter(config)) {
  const parts = Object.fromEntries(formatter.formatToParts(date).map(p=>[p.type,p.value]));
  return !['Sat','Sun'].includes(parts.weekday) && !config.blockedDates.includes(`${parts.year}-${parts.month}-${parts.day}`) && Number(parts.hour) >= config.startHour && Number(parts.hour) < config.endHour;
}

export function nextCallTime(date, config) {
  // Minute-by-minute UTC iteration respects daylight-saving changes in the configured timezone.
  let candidate = new Date(date);
  const formatter=windowFormatter(config);
  if (inCallWindow(candidate, config,formatter)) return candidate;
  candidate = new Date(Math.ceil(candidate.getTime()/60000)*60000);
  for (let minute=0; minute<60*24*32; minute++, candidate=new Date(candidate.getTime()+60000)) {
    if (inCallWindow(candidate, config,formatter)) return candidate;
  }
  throw new Error('No Vapi calling window available in the next 32 days');
}
