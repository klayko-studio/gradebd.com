import type { APIRoute } from 'astro';
import { enquirySchema } from '../../lib/schema';
import { getSite } from '../../lib/cms';
import { mailConfigured, sendEnquiry } from '../../lib/mail';

/** Pages are prerendered; this endpoint has to run per-request. */
export const prerender = false;

/** Runtime, not build-time — see the note in src/lib/cms.ts. */
const DIRECTUS_URL = process.env.DIRECTUS_URL || (import.meta.env.DIRECTUS_URL as string | undefined);
const DIRECTUS_TOKEN =
  process.env.DIRECTUS_TOKEN || (import.meta.env.DIRECTUS_TOKEN as string | undefined);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

/**
 * Crude in-memory rate limit. Enough to blunt a script hammering the form on a
 * single instance; a real deployment behind a proxy should also limit upstream.
 */
const hits = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!request.headers.get('content-type')?.includes('application/json')) {
    return json({ ok: false, message: 'Expected a JSON body.' }, 415);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ ok: false, message: 'That request could not be read. Please try again.' }, 400);
  }

  // Checked before validation: a bot that fills the trap gets the same plain
  // success a human gets, and learns nothing about which field caught it.
  const trap = (raw as { honeypot?: unknown } | null)?.honeypot;
  if (typeof trap === 'string' && trap.length > 0) {
    return json({ ok: true, message: 'Thank you — your enquiry has been sent.' });
  }

  const parsed = enquirySchema.safeParse(raw);
  if (!parsed.success) {
    return json(
      {
        ok: false,
        message: 'Please check the highlighted fields.',
        errors: parsed.error.flatten().fieldErrors,
      },
      422,
    );
  }

  const enquiry = parsed.data;

  if (rateLimited(clientAddress ?? 'unknown')) {
    return json(
      {
        ok: false,
        message:
          'That is a few enquiries in a short time. Please email info@gradebd.com and we will pick it up there.',
      },
      429,
    );
  }

  const record = {
    name: enquiry.name,
    organisation: enquiry.organisation || null,
    email: enquiry.email,
    phone: enquiry.phone,
    requirement: enquiry.requirement,
    status: 'new',
    received_at: new Date().toISOString(),
  };

  /*
    Two independent places the enquiry can land: the Directus record and the
    notification email. Both are attempted, and the visitor is only turned away
    if BOTH fail.

    This used to return 502 the moment the Directus write failed, which meant a
    CMS outage also threw away the email that would have rescued the lead — the
    one channel that does not depend on the CMS being up. They are separate
    channels and are treated as such.
  */
  let stored = false;
  if (DIRECTUS_URL && DIRECTUS_TOKEN) {
    try {
      const res = await fetch(`${DIRECTUS_URL.replace(/\/$/, '')}/items/enquiries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DIRECTUS_TOKEN}`,
        },
        body: JSON.stringify(record),
      });
      if (!res.ok) throw new Error(`Directus responded ${res.status}`);
      stored = true;
    } catch (error) {
      console.error('[enquiry] could not be stored:', error);
    }
  } else {
    // No CMS configured: log it so nothing submitted during review is dropped.
    console.info('[enquiry] received (no Directus configured):', record);
  }

  /*
    The email goes out after the record is safe, and its failure is logged
    rather than surfaced.

    That order matters. The stored row is the thing that must not be lost; the
    email is a convenience on top of it. Telling a visitor "that did not work"
    because a mail server was slow would send them away from an enquiry that is
    already captured, and they would either give up or submit it again.

    Recipients come from the CMS so a moderator can change who reads them
    without a deploy. Awaited rather than fired and forgotten: a serverless or
    container runtime can end the request's lifetime the moment the response is
    returned, which kills an in-flight send silently.
  */
  let mailed = false;
  if (mailConfigured) {
    try {
      const site = await getSite();
      const result = await sendEnquiry(record, site.enquiry_recipients);
      mailed = result.sent;
      if (!result.sent) console.warn('[enquiry] not emailed:', result.reason);
    } catch (error) {
      console.error('[enquiry] mail step failed:', error);
    }
  } else {
    console.info('[enquiry] SMTP not configured — recorded but not emailed.');
  }

  // Nothing captured it. Now it is worth telling them, with a route that works.
  if (!stored && !mailed) {
    return json(
      {
        ok: false,
        message:
          'We could not record your enquiry just now. Please email info@gradebd.com or call 01842-024378.',
      },
      502,
    );
  }

  return json({
    ok: true,
    message: 'Thank you — your enquiry has been sent. We reply within one working day.',
  });
};

/** Anything other than POST gets a clear answer rather than a framework error. */
export const ALL: APIRoute = () =>
  json({ ok: false, message: 'Send enquiries as a POST request.' }, 405);
