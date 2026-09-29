import nodemailer, { type Transporter } from 'nodemailer';

/**
 * Outgoing mail for the enquiry form.
 *
 * Credentials come from the environment and the recipients come from the CMS,
 * and the split is deliberate: who reads the enquiries is a business decision a
 * moderator should be able to change, while an SMTP password is a secret that
 * must never sit in a database a moderator can open.
 *
 * Read at RUN time, `process.env` before `import.meta.env` — the same rule as
 * `src/lib/cms.ts`. Vite inlines `import.meta.env` at build, so an image built
 * once would otherwise carry the build box's mail settings forever.
 */
const env = (key: string): string | undefined =>
  process.env[key] || (import.meta.env[key] as string | undefined);

const HOST = env('EMAIL_SMTP_HOST');
const PORT = Number(env('EMAIL_SMTP_PORT') ?? 465);
const USER = env('EMAIL_SMTP_USER');
const PASS = env('EMAIL_SMTP_PASSWORD');
/** Gmail: 465 is implicit TLS, 587 is STARTTLS. Anything else, say so. */
const SECURE = (env('EMAIL_SMTP_SECURE') ?? String(PORT === 465)).toLowerCase() === 'true';
const FROM = env('EMAIL_FROM') || USER;

export const mailConfigured = Boolean(HOST && USER && PASS);

let transport: Transporter | null = null;
function getTransport(): Transporter | null {
  if (!mailConfigured) return null;
  // One pooled transport per process rather than one per enquiry: a fresh
  // connection and TLS handshake for every form submission is wasted work, and
  // Gmail rate-limits new connections harder than it rate-limits messages.
  transport ??= nodemailer.createTransport({
    host: HOST,
    port: PORT,
    secure: SECURE,
    auth: { user: USER, pass: PASS },
    pool: true,
    maxConnections: 2,
  });
  return transport;
}

export interface Enquiry {
  name: string;
  organisation?: string | null;
  email: string;
  phone: string;
  requirement: string;
  received_at: string;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Sends one enquiry to everyone on the list.
 *
 * Resolves either way — the caller has already stored the enquiry, and a mail
 * server having a bad afternoon must not turn a captured lead into an error on
 * the visitor's screen. The outcome is returned so it can be logged.
 */
export async function sendEnquiry(
  enquiry: Enquiry,
  recipients: string[],
): Promise<{ sent: boolean; reason?: string }> {
  const to = recipients.map((line) => line.trim()).filter(Boolean);
  if (to.length === 0) return { sent: false, reason: 'no recipients configured' };

  const mailer = getTransport();
  if (!mailer) return { sent: false, reason: 'SMTP is not configured' };

  const rows: [string, string][] = [
    ['Name', enquiry.name],
    ['Email', enquiry.email],
    ['Phone', enquiry.phone],
    ...(enquiry.organisation ? ([['Organisation', enquiry.organisation]] as [string, string][]) : []),
    ['Received', new Date(enquiry.received_at).toUTCString()],
  ];

  const text = [
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    'Message:',
    enquiry.requirement,
  ].join('\n');

  const html = `<table style="border-collapse:collapse;font:15px/1.5 Helvetica,Arial,sans-serif;color:#1B2026">
${rows
  .map(
    ([k, v]) =>
      `<tr><td style="padding:4px 16px 4px 0;color:#565E68;vertical-align:top">${k}</td><td style="padding:4px 0">${escapeHtml(v)}</td></tr>`,
  )
  .join('\n')}
<tr><td style="padding:12px 16px 4px 0;color:#565E68;vertical-align:top">Message</td><td style="padding:12px 0;white-space:pre-wrap">${escapeHtml(enquiry.requirement)}</td></tr>
</table>`;

  try {
    await mailer.sendMail({
      from: FROM,
      to,
      // So hitting reply in the inbox answers the person who wrote in, rather
      // than the site's own mailbox. The From stays the authenticated account:
      // Gmail rewrites a From it does not own, and SPF would fail anyway.
      replyTo: `${enquiry.name} <${enquiry.email}>`,
      subject: `Website enquiry — ${enquiry.name}`,
      text,
      html,
    });
    return { sent: true };
  } catch (error) {
    return { sent: false, reason: error instanceof Error ? error.message : String(error) };
  }
}
