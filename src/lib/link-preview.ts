// Safe link previews: extract first URL from text, fetch + parse OG tags,
// with SSRF protection (no private/loopback hosts) and a short-lived cache.

export interface LinkPreview {
  url: string;
  title: string;
  description: string;
  image: string | null;
  siteName: string | null;
}

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_FETCH_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 5000;

const cache = new Map<string, { at: number; value: LinkPreview }>();

export function extractFirstUrl(text: string): string | null {
  const match = /https?:\/\/[^\s<>"']+/i.exec(text);
  if (!match) return null;
  const raw = match[0].replace(/[),.\]]+$/, '');
  try {
    const url = new URL(raw);
    return url.href;
  } catch {
    return null;
  }
}

function isIpv4(value: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(value);
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map((n) => Number(n));
  const [a, b] = parts;
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 127) return true; // loopback
  if (a === 0) return true;
  if (a === 169 && b === 254) return true; // link-local
  if (a >= 224) return true; // multicast/reserved
  return false;
}

function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (host === 'localhost' || host === 'localhost.localdomain') return true;
  if (host.endsWith('.local')) return true;
  if (host.endsWith('.internal')) return true;
  if (isIpv4(host)) return isPrivateIpv4(host);
  return host.includes('[') && host.includes(']') && (host.includes('::1') || host.startsWith('[f'));
}

async function validateHost(hostname: string): Promise<void> {
  if (isPrivateHost(hostname)) throw new Error('Blocked host');
  // Resolve to check for private IPs lurking behind DNS.
  try {
    const dns = await import('dns/promises');
    const addresses = await dns.lookup(hostname, { all: true });
    for (const { address } of addresses) {
      if (address.includes(':')) {
        // Only block obvious loopback/link-local v6.
        if (address === '::1' || address.toLowerCase().startsWith('fe80') || address.toLowerCase().startsWith('fc') || address.toLowerCase().startsWith('fd')) {
          throw new Error('Blocked host');
        }
        continue;
      }
      if (isIpv4(address) && isPrivateIpv4(address)) throw new Error('Blocked host');
    }
  } catch {
    throw new Error('Host blocked');
  }
}

function safeAbsoluteUrl(value: string, base: string): string | null {
  try {
    const url = new URL(value, base);
    if (!ALLOWED_PROTOCOLS.has(url.protocol)) return null;
    if (isPrivateHost(url.hostname)) return null;
    return url.href;
  } catch {
    return null;
  }
}

function htmlEntities(text: string): string {
  return text
    .replace(/&#x27;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/&#039;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ');
}

function metaAttribute(html: string, property: string): string | null {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`<meta[^>]*property=["']${escaped}["'][^>]*>|<meta[^>]*content=["'][^>]*${escaped}["'][^>]*>`, 'i').exec(html);
  if (!match) return null;
  const content = /content=["']([^"']*)["']/i.exec(match[0]);
  return content ? htmlEntities(content[1].trim()).slice(0, 500) : null;
}

function titleOf(html: string): string {
  const og = metaAttribute(html, 'og:title');
  if (og) return og.slice(0, 200);
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return match ? htmlEntities(match[1].trim().replace(/\s+/g, ' ')).slice(0, 200) : '';
}

function descriptionOf(html: string): string {
  const og = metaAttribute(html, 'og:description');
  if (og) return og.slice(0, 280);
  const match = /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i.exec(html);
  return match ? htmlEntities(match[1].trim()).slice(0, 280) : '';
}

export async function fetchLinkPreview(url: string): Promise<LinkPreview> {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

  const parsed = new URL(url);
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) throw new Error('Only http(s) links are supported');
  await validateHost(parsed.hostname);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let html = '';
  let finalUrl = url;
  try {
    const res = await fetch(url, { redirect: 'follow', signal: controller.signal, headers: { 'User-Agent': 'JaminoBot/1.0 (+link preview)' } });
    finalUrl = res.url || url;
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      throw new Error('Not an HTML page');
    }
    const contentLength = Number(res.headers.get('content-length') ?? 0);
    if (contentLength > MAX_FETCH_BYTES) throw new Error('Page too large');
    const reader = res.body?.getReader();
    if (!reader) throw new Error('No body');
    const bytes: number[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_FETCH_BYTES) throw new Error('Page too large');
      for (const b of value) bytes.push(b);
    }
    html = new TextDecoder('utf-8').decode(new Uint8Array(bytes)).slice(0, 200000);
  } catch (error) {
    if (error instanceof Error && error.message === 'This operation was aborted') throw new Error('Preview timed out');
    throw error;
  } finally {
    clearTimeout(timer);
  }

  const preview: LinkPreview = {
    url: finalUrl,
    title: titleOf(html) || new URL(finalUrl).hostname,
    description: descriptionOf(html),
    image: safeAbsoluteUrl(metaAttribute(html, 'og:image') ?? '', finalUrl),
    siteName: metaAttribute(html, 'og:site_name'),
  };
  cache.set(url, { at: Date.now(), value: preview });
  return preview;
}