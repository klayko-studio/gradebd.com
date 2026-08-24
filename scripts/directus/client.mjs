/**
 * A very small Directus REST client for the bootstrap scripts.
 *
 * Not the official SDK on purpose: the bootstrap runs once against a fresh
 * instance, needs schema endpoints the SDK wraps only thinly, and shipping a
 * dependency for it would put a package in the site's tree that the site itself
 * never imports.
 */

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export function createClient({ url, email, password, token }) {
  const base = url.replace(/\/$/, '');
  let accessToken = token ?? null;

  async function login() {
    if (accessToken) return accessToken;
    if (!email || !password) {
      throw new Error('Directus needs either a token or an email and password.');
    }
    const res = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      throw new Error(`Could not log in to Directus (${res.status}). Check the admin credentials.`);
    }
    const body = await res.json();
    accessToken = body.data.access_token;
    return accessToken;
  }

  /**
   * Every call goes through here so one place knows how to turn a Directus error
   * envelope into a readable message. Directus reports the real reason in
   * `errors[].message`; without unwrapping it you get a bare 400 and no clue.
   */
  async function req(method, path, body) {
    await login();
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { ...JSON_HEADERS, Authorization: `Bearer ${accessToken}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (res.status === 204) return null;

    const text = await res.text();
    let parsed = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      /* Directus answered with something that is not JSON — keep the raw text. */
    }

    if (!res.ok) {
      const detail =
        parsed?.errors?.map((e) => e.message).join('; ') || text.slice(0, 300) || res.statusText;
      const error = new Error(`${method} ${path} → ${res.status}: ${detail}`);
      error.status = res.status;
      error.directus = parsed?.errors ?? null;
      throw error;
    }

    return parsed?.data ?? parsed;
  }

  /** Multipart upload. `file` is a Buffer/Uint8Array plus its metadata. */
  async function upload({ bytes, filename, type, title, description, folder }) {
    await login();
    const form = new FormData();
    if (title) form.append('title', title);
    // Directus' `description` is the alt text: its own image interface labels it
    // that way, and the site reads it as the alt attribute.
    if (description) form.append('description', description);
    if (folder) form.append('folder', folder);
    // The binary part must be appended last: Directus reads the preceding text
    // fields as the file's metadata, and anything after the file part is ignored.
    form.append('file', new Blob([bytes], { type }), filename);

    const res = await fetch(`${base}/files`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Upload of ${filename} failed (${res.status}): ${text.slice(0, 300)}`);
    }
    const body = await res.json();
    return body.data;
  }

  return {
    base,
    login,
    upload,
    get: (path) => req('GET', path),
    post: (path, body) => req('POST', path, body),
    patch: (path, body) => req('PATCH', path, body),
    delete: (path) => req('DELETE', path),

    /** True when the path resolves; used for "does this exist yet" checks. */
    async exists(path) {
      try {
        await req('GET', path);
        return true;
      } catch (error) {
        if (error.status === 403 || error.status === 404) return false;
        throw error;
      }
    },
  };
}

/** Wait for a freshly started Directus to answer /server/health. */
export async function waitForDirectus(url, { attempts = 60, delayMs = 2000 } = {}) {
  const base = url.replace(/\/$/, '');
  for (let i = 1; i <= attempts; i += 1) {
    try {
      const res = await fetch(`${base}/server/health`);
      if (res.ok) return;
      // 503 with a body means Directus is up but a dependency (usually the mail
      // transport) is unhealthy. The API still works, so that is good enough.
      if (res.status === 503) return;
    } catch {
      /* not listening yet */
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error(`Directus at ${base} did not become ready.`);
}
