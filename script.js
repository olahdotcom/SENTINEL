
'use strict';

// DOM Selection Helpers
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

// Toast Notification System
const toast = (message) => {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2400);
};

function addFlag(list, kind, message) {
  const item = document.createElement('li');
  item.className = kind;
  item.textContent = message;
  list.append(item);
}

async function copyText(value) {
  if (!value) {
    toast('Nothing to copy yet.');
    return;
  }
  try {
    await navigator.clipboard.writeText(value);
    toast('Copied to clipboard.');
  } catch {
    const area = document.createElement('textarea');
    area.value = value;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    toast(ok ? 'Copied to clipboard.' : 'Copy was blocked by this browser.');
  }
}

/* ==========================================================================
   Navigation & Theme Management
   ========================================================================== */
const pageInfo = {
  dashboard: ['Security overview', 'A clear view of the tools that help protect your digital life.'],
  password: ['Password lab', 'Evaluate password patterns and generate a stronger password.'],
  phishing: ['Phishing scanner', 'Inspect messages and links for common warning signs.'],
  twofa: ['2FA generator', 'Generate and verify time-based one-time passwords.']
};

function openPage(name) {
  if (!pageInfo[name]) return;
  $$('.content-section').forEach(section => section.classList.toggle('active', section.id === 'page-' + name));
  $$('.nav button').forEach(button => {
    if (button.dataset.page === name) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  $('#pageTitle').textContent = pageInfo[name][0];
  $('#pageSubtitle').textContent = pageInfo[name][1];
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

$$('.nav button').forEach(button => button.addEventListener('click', () => openPage(button.dataset.page)));
$$('[data-open]').forEach(button => button.addEventListener('click', () => openPage(button.dataset.open)));

$('#themeToggle').addEventListener('click', () => {
  const root = document.documentElement;
  const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = nextTheme;
  $('#themeToggle').textContent = nextTheme === 'dark' ? '☼' : '☾';
  $('#themeToggle').setAttribute('aria-label', nextTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
});

/* ==========================================================================
   Password Lab (Strength Evaluator & Generator)
   ========================================================================== */
const commonPasswords = [
  'password', '123456', '12345678', 'qwerty', 'letmein', 'admin', 'welcome',
  'iloveyou', 'monkey', 'dragon', 'football', 'abc123', 'login', 'master',
  'sunshine', 'princess', '111111', '000000', 'trustno1', 'starwars', 'lagos', 'naija'
];

const sequences = ['abcdefghijklmnopqrstuvwxyz', '0123456789', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

function containsSequence(value) {
  const text = value.toLowerCase();
  return sequences.some(sequence => {
    const reverse = [...sequence].reverse().join('');
    for (let i = 0; i <= text.length - 3; i++) {
      if (sequence.includes(text.slice(i, i + 3)) || reverse.includes(text.slice(i, i + 3))) return true;
    }
    return false;
  });
}

function evaluatePassword(password) {
  const tips = [];
  let score = 0;

  if (password.length >= 16) score += 2;
  else if (password.length >= 12) score += 1;

  const groups = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password)
  ].filter(Boolean).length;

  if (groups >= 3) score += 1;
  if (groups === 4) score += 1;

  const lower = password.toLowerCase();
  const normalized = lower
    .replace(/[@4]/g, 'a')
    .replace(/0/g, 'o')
    .replace(/[1!|]/g, 'i')
    .replace(/3/g, 'e')
    .replace(/[5$]/g, 's')
    .replace(/7/g, 't');

  const common = commonPasswords.find(word => lower.includes(word) || normalized.includes(word));
  if (common) {
    score = Math.min(score, 0);
    tips.push(['bad', `Contains a common password or predictable word ("${common}").`]);
  }

  if (/(.)\1{2,}/.test(password)) {
    score = Math.max(0, score - 1);
    tips.push(['warn', 'Repeated characters are a predictable pattern.']);
  }

  if (containsSequence(password)) {
    score = Math.max(0, score - 1);
    tips.push(['warn', 'Contains a sequence or keyboard pattern.']);
  }

  if (/(19|20)\d\d/.test(password)) {
    score = Math.max(0, score - 1);
    tips.push(['warn', 'Contains a year-like number that may be easy to guess.']);
  }

  if (password.length < 12) {
    tips.push(['bad', 'Use at least 12 characters; longer is generally better.']);
  } else if (password.length < 16) {
    tips.push(['warn', 'Consider 16 or more characters, especially for important accounts.']);
  }

  if (groups <= 1) {
    tips.push(['warn', 'Use a longer passphrase or a wider mix of character types.']);
  }

  if (!tips.length) {
    tips.push(['good', 'No obvious common-password or sequence patterns detected.']);
  }

  return { score: Math.max(0, Math.min(4, score)), tips };
}

const strengthLabels = ['Very weak', 'Weak', 'Fair', 'Strong', 'Excellent'];

function renderPassword() {
  const password = $('#pw').value;
  const tips = $('#pwTips');
  tips.replaceChildren();
  const segments = $$('#pwMeter span');

  if (!password) {
    segments.forEach(segment => segment.className = '');
    $('#pwLabel').textContent = 'Waiting for input';
    $('#pwMeta').textContent = '';
    return;
  }

  const result = evaluatePassword(password);
  segments.forEach((segment, index) => {
    segment.className = index < result.score ? 'on ' + (result.score >= 3 ? 'strong' : '') : '';
  });

  $('#pwLabel').textContent = strengthLabels[result.score];
  $('#pwMeta').textContent = ' · ' + password.length + ' characters';
  result.tips.forEach(tip => addFlag(tips, tip[0], tip[1]));
}

$('#pw').addEventListener('input', renderPassword);
$('#eye').addEventListener('click', () => {
  const field = $('#pw');
  const show = field.type === 'password';
  field.type = show ? 'text' : 'password';
  $('#eye').textContent = show ? 'Hide' : 'Show';
});

$('#pwLength').addEventListener('input', () => {
  $('#pwLengthValue').textContent = $('#pwLength').value;
});

function secureIndex(max) {
  if (!Number.isSafeInteger(max) || max < 1) throw new Error('Invalid random range.');
  const ceiling = Math.floor(0x100000000 / max) * max;
  const buffer = new Uint32Array(1);
  let value;
  do {
    crypto.getRandomValues(buffer);
    value = buffer[0];
  } while (value >= ceiling);
  return value % max;
}

let generatedPassword = '';
$('#generate').addEventListener('click', () => {
  if (!window.crypto?.getRandomValues) {
    toast('Secure random generation is unavailable in this browser.');
    return;
  }

  const sets = [];
  if ($('#useLower').checked) sets.push('abcdefghijkmnopqrstuvwxyz');
  if ($('#useUpper').checked) sets.push('ABCDEFGHJKLMNPQRSTUVWXYZ');
  if ($('#useNumbers').checked) sets.push('23456789');
  if ($('#useSymbols').checked) sets.push('!@#$%^&*()-_=+?');

  if (!sets.length) {
    toast('Select at least one character set.');
    return;
  }

  const all = sets.join('');
  const length = Number($('#pwLength').value);
  const chars = sets.map(set => set[secureIndex(set.length)]);

  while (chars.length < length) {
    chars.push(all[secureIndex(all.length)]);
  }

  for (let i = chars.length - 1; i > 0; i--) {
    const j = secureIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  generatedPassword = chars.join('');
  const output = $('#generated');
  output.textContent = generatedPassword;
  output.classList.add('mono');
});

$('#copyGenerated').addEventListener('click', () => copyText(generatedPassword));

/* ==========================================================================
   Phishing Scanner Heuristics
   ========================================================================== */
const brands = ['paypal', 'google', 'gmail', 'microsoft', 'apple', 'amazon', 'netflix', 'facebook', 'instagram', 'whatsapp', 'dhl', 'fedex', 'gtbank', 'paystack', 'binance'];
const shorteners = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'is.gd', 'cutt.ly', 'rb.gy', 'ow.ly'];
const suspiciousTlds = ['zip', 'top', 'click', 'link', 'icu', 'cfd', 'sbs', 'tk', 'ml', 'ga', 'cf', 'gq'];
const freeMail = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'proton.me'];

function registrableDomain(host) {
  const parts = host.toLowerCase().split('.');
  if (parts.length <= 2) return host.toLowerCase();
  const commonSecondLevels = ['co', 'com', 'org', 'net', 'gov', 'edu'];
  if (parts.length >= 3 && parts[parts.length - 1].length === 2 && commonSecondLevels.includes(parts[parts.length - 2])) {
    return parts.slice(-3).join('.');
  }
  return parts.slice(-2).join('.');
}

function brandWarnings(host, where, findings) {
  const root = registrableDomain(host);
  const rootName = root.split('.')[0];

  for (const brand of brands) {
    if (rootName === brand) continue;
    if (host.includes(brand)) {
      findings.push({ points: 24, kind: 'bad', text: `${where} contains the name "${brand}" but belongs to ${root}.` });
      return;
    }
    const lookalike = brand.replace(/a/g, '[a4@]').replace(/o/g, '[o0]').replace(/e/g, '[e3]').replace(/i/g, '[i1l]');
    if (new RegExp(lookalike, 'i').test(host)) {
      findings.push({ points: 22, kind: 'bad', text: `${where} may imitate the brand "${brand}" (${root}).` });
      return;
    }
  }
}

function inspectUrl(raw, findings) {
  let url;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw);
  } catch {
    return;
  }

  const host = url.hostname.toLowerCase();
  if (!host || !host.includes('.')) return;

  const label = 'Link ' + (raw.length > 55 ? raw.slice(0, 52) + '…' : raw);

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    findings.push({ points: 22, kind: 'bad', text: `${label} uses an IP address rather than a normal domain name.` });
  }
  if (host.includes('xn--')) {
    findings.push({ points: 18, kind: 'bad', text: `${label} uses punycode, which can disguise look-alike characters.` });
  }
  if (url.username || url.password) {
    findings.push({ points: 18, kind: 'bad', text: `${label} includes embedded login information in the URL.` });
  }
  if (shorteners.includes(host)) {
    findings.push({ points: 10, kind: 'warn', text: `${label} is shortened, so its destination is not clear.` });
  }
  if (suspiciousTlds.includes(host.split('.').pop())) {
    findings.push({ points: 8, kind: 'warn', text: `${label} uses a top-level domain that deserves extra scrutiny.` });
  }
  if (host.split('.').length > 4) {
    findings.push({ points: 7, kind: 'warn', text: `${label} has an unusually long chain of subdomains.` });
  }
  if (/^http:\/\//i.test(raw)) {
    findings.push({ points: 8, kind: 'warn', text: `${label} uses unencrypted HTTP.` });
  }

  brandWarnings(host, label, findings);
}

const messageRules = [
  [/\b(urgent|immediately|act now|final notice|within 24 hours|expires today|last warning|suspended|will be (closed|locked|terminated))\b/i, 12, 'warn', 'Uses urgency or threats to pressure you into acting quickly.'],
  [/\b(password|passcode|pin|otp|cvv|bvn|card number|verify your (account|identity)|confirm your (account|identity|details)|login details)\b/i, 20, 'bad', 'Mentions credentials or sensitive information. Do not share these in response to an unexpected message.'],
  [/dear (customer|user|client|member|account holder|sir|madam)/i, 6, 'warn', 'Uses a generic greeting rather than identifying you.'],
  [/\b(you(’|')ve won|winner|lottery|claim your (prize|reward)|gift card|inheritance|crypto giveaway|refund)\b/i, 10, 'warn', 'Uses a prize, refund or windfall as a possible lure.'],
  [/\.(exe|scr|zip|iso|js|vbs|docm|xlsm)\b/i, 10, 'warn', 'Mentions a file type that may be risky, especially when unexpected.']
];

function scanMessage() {
  const body = $('#message').value;
  const sender = $('#sender').value.trim();
  const output = $('#phOut');
  output.replaceChildren();

  if (!body.trim() && !sender) {
    toast('Paste message text or enter sender details first.');
    return;
  }

  const findings = [];
  messageRules.forEach(rule => {
    if (rule[0].test(body)) {
      findings.push({ points: rule[1], kind: rule[2], text: rule[3] });
    }
  });

  if (sender) {
    const match = sender.match(/([A-Z0-9._%+-]+)@([A-Z0-9.-]+\.[A-Z]{2,})/i);
    if (match) {
      const domain = match[2].toLowerCase();
      const display = sender.replace(/<.*>/, '').toLowerCase();
      const before = findings.length;

      brandWarnings(domain, 'Sender domain', findings);
      const brand = brands.find(item => display.includes(item));

      if (findings.length === before && brand && registrableDomain(domain).split('.')[0] !== brand) {
        findings.push({ points: 18, kind: 'bad', text: `The display name mentions "${brand}", but the email domain is ${domain}.` });
      }
      if (freeMail.includes(domain) && /(support|security|bank|service|billing|team)/.test(display)) {
        findings.push({ points: 10, kind: 'warn', text: `An official-sounding sender name is using a free email provider (${domain}).` });
      }
    } else {
      findings.push({ points: 0, kind: 'warn', text: 'The sender field could not be parsed as a standard email address; verify it independently.' });
    }
  }

  const urls = [...new Set((body.match(/(?:https?:\/\/|www\.)[^\s<>"')\]]+/gi) || []).map(val => val.replace(/[.,;:!?]+$/, '')))];
  urls.forEach(url => inspectUrl(url, findings));

  const total = Math.min(100, findings.reduce((sum, item) => sum + item.points, 0));
  const level = total >= 45 ? ['High number of warning signs', 'bad'] : total >= 20 ? ['Some warning signs found', 'warn'] : ['Few warning signs detected', 'good'];

  const summary = document.createElement('div');
  summary.className = 'output-box';

  const title = document.createElement('div');
  title.className = 'result-title';
  title.textContent = level[0];
  title.style.color = `var(--${level[1] === 'bad' ? 'bad' : level[1] === 'warn' ? 'warn' : 'good'})`;

  const meta = document.createElement('div');
  meta.className = 'result-meta';
  meta.textContent = `Heuristic indicator: ${total}/100 · ${urls.length} link(s) detected`;

  const bar = document.createElement('div');
  bar.className = 'progress';
  bar.style.marginTop = '12px';

  const fill = document.createElement('span');
  fill.style.width = total + '%';
  fill.style.background = level[1] === 'bad' ? 'var(--bad)' : level[1] === 'warn' ? 'var(--warn)' : 'var(--good)';
  bar.append(fill);

  summary.append(title, meta, bar);
  output.append(summary);

  const list = document.createElement('ul');
  list.className = 'flags';
  findings.sort((a, b) => b.points - a.points);

  if (findings.length) {
    findings.forEach(item => addFlag(list, item.kind, item.text));
  } else {
    addFlag(list, 'good', 'No warning patterns from this small ruleset were detected. This does not establish that the message is legitimate.');
  }
  output.append(list);

  const advice = document.createElement('p');
  advice.className = 'small-note';
  advice.textContent = total >= 20
    ? 'Recommended action: do not use the message links or attachments. Visit the service through its official app or a web address you already trust.'
    : 'Still verify unexpected requests through a separate, trusted channel. A low score is not proof of safety.';
  output.append(advice);
}

$('#scan').addEventListener('click', scanMessage);
$('#sample').addEventListener('click', () => {
  $('#sender').value = 'PayPal Security <support@paypa1-secure.top>';
  $('#message').value = 'Dear customer,\n\nYour account has been suspended. Verify your password immediately, within 24 hours, or it will be closed.\n\nhttp://203.0.113.9/paypal/login\nhttp://paypa1-secure.top/verify\n\nSee attached form: invoice.zip';
  scanMessage();
});
$('#clearScan').addEventListener('click', () => {
  $('#sender').value = '';
  $('#message').value = '';
  $('#phOut').replaceChildren();
});

/* ==========================================================================
   2FA Generator (TOTP RFC 6238, HMAC-SHA1)
   ========================================================================== */
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(bytes) {
  let bits = '';
  let output = '';
  for (const byte of bytes) {
    bits += byte.toString(2).padStart(8, '0');
  }
  for (let i = 0; i < bits.length; i += 5) {
    output += BASE32[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)];
  }
  return output;
}

function base32Decode(value) {
  const clean = value.toUpperCase().replace(/[\s=-]/g, '');
  if (!clean || [...clean].some(char => !BASE32.includes(char))) {
    throw new Error('Invalid Base32 secret.');
  }
  let bits = '';
  for (const char of clean) {
    bits += BASE32.indexOf(char).toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return new Uint8Array(bytes);
}

async function totp(secret, time = Date.now()) {
  const counter = Math.floor(time / 30000);
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint32(0, Math.floor(counter / 0x100000000));
  view.setUint32(4, counter >>> 0);

  const key = await crypto.subtle.importKey('raw', base32Decode(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const hash = new Uint8Array(await crypto.subtle.sign('HMAC', key, buffer));
  const offset = hash[hash.length - 1] & 15;
  const binary = ((hash[offset] & 127) << 24) | (hash[offset + 1] << 16) | (hash[offset + 2] << 8) | hash[offset + 3];
  return String((binary >>> 0) % 1000000).padStart(6, '0');
}

let currentSecret = '';
let ticker = null;

function setupUri() {
  const issuer = $('#issuer').value.trim() || 'Sentinel';
  const account = $('#account').value.trim() || 'account';
  const label = encodeURIComponent(issuer + ':' + account);
  return `otpauth://totp/${label}?secret=${currentSecret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

async function refreshTotp() {
  if (!currentSecret) return;
  try {
    const now = Date.now();
    const secondsLeft = 30 - Math.floor(now / 1000) % 30;
    const code = await totp(currentSecret, now);
    $('#currentCode').textContent = code.slice(0, 3) + ' ' + code.slice(3);
    $('#timeBar').style.width = (secondsLeft / 30 * 100) + '%';
    $('#timeLeft').textContent = `New code in ${secondsLeft} seconds`;
  } catch (error) {
    $('#currentCode').textContent = 'Unavailable';
    $('#timeLeft').textContent = 'Web Crypto is unavailable. Use a secure browser context (HTTPS or localhost).';
  }
}

function createSecret() {
  if (!window.crypto?.getRandomValues || !window.crypto?.subtle) {
    toast('Secure cryptography is unavailable. Use HTTPS or localhost.');
    return;
  }
  currentSecret = base32Encode(crypto.getRandomValues(new Uint8Array(20)));
  $('#secret').value = currentSecret;
  $('#verifyCode').value = '';
  $('#verifyResult').replaceChildren();
  refreshTotp();
}

$('#newSecret').addEventListener('click', createSecret);
$('#copySecret').addEventListener('click', () => copyText(currentSecret));
$('#copyUri').addEventListener('click', () => copyText(currentSecret ? setupUri() : ''));

$('#verify').addEventListener('click', async () => {
  const input = $('#verifyCode').value.replace(/\s/g, '');
  const result = $('#verifyResult');
  result.replaceChildren();

  if (!/^\d{6}$/.test(input)) {
    addFlag(result, 'warn', 'Enter a six-digit code.');
    return;
  }
  if (!currentSecret) {
    addFlag(result, 'warn', 'Generate a secret key first.');
    return;
  }

  try {
    let valid = false;
    for (const offset of [-30000, 0, 30000]) {
      if (input === await totp(currentSecret, Date.now() + offset)) valid = true;
    }
    addFlag(result, valid ? 'good' : 'bad', valid ? 'Code accepted for this locally generated secret.' : 'Code not accepted. Check the secret, device clock and current code.');
  } catch {
    addFlag(result, 'bad', 'Could not verify the code. Check browser cryptography support.');
  }
});

$('#verifyCode').addEventListener('input', () => {
  $('#verifyCode').value = $('#verifyCode').value.replace(/\D/g, '').slice(0, 6);
});

// Initialization
createSecret();
if (ticker) clearInterval(ticker);
ticker = setInterval(refreshTotp, 1000);