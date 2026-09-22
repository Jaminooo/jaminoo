const TIMEOUT_MS = 25000;

export async function api<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData;
    const res = await fetch(url, {
      credentials: 'same-origin',
      ...init,
      signal: controller.signal,
      headers: isFormData
        ? { ...(init?.headers ?? {}) }
        : { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) {
      throw new Error(data?.error ?? `Request failed (${res.status})`);
    }
    return data;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function uploadWithProgress<T = unknown>(
  url: string,
  body: XMLHttpRequestBodyInit,
  onProgress?: (percent: number) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.withCredentials = true;
    xhr.setRequestHeader('Accept', 'application/json');

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress?.(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    };

    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.onabort = () => reject(new Error('Upload cancelled'));
    xhr.onload = () => {
      let data = {} as T & { error?: string };
      try {
        data = JSON.parse(xhr.responseText) as T & { error?: string };
      } catch {}

      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve(data);
      } else {
        reject(new Error(data.error ?? `Request failed (${xhr.status})`));
      }
    };

    xhr.send(body);
  });
}
