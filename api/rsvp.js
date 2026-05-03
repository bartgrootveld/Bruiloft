// Vercel serverless function: POST /api/rsvp
// Verstuurt 2 e-mails via Resend:
//   1. Naar Sam met de volledige RSVP (reply-to = gast)
//   2. Bevestiging naar de gast (reply-to = Sam)

import { Resend } from 'resend';

const TO_HOSTS = 'bartgrootveld@gmail.com';
const FROM = 'Sam & Jurgen <rsvp@jurgenensam.nl>';

// Best-effort in-memory rate limit (per warm instance).
const RATE_BUCKET = new Map();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;

function rateLimited(ip) {
    const now = Date.now();
    const arr = (RATE_BUCKET.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
    arr.push(now);
    RATE_BUCKET.set(ip, arr);
    return arr.length > RATE_MAX;
}

function clean(v, max = 500) {
    if (typeof v !== 'string') return '';
    return v.trim().slice(0, max);
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[c]);
}

function isEmail(s) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 254;
}

function rowsHtml(rows) {
    return rows
        .filter(([, v]) => v)
        .map(
            ([k, v]) =>
                `<tr><td style="padding:6px 14px 6px 0;color:#7a7367;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;vertical-align:top;">${escapeHtml(k)}</td>` +
                `<td style="padding:6px 0;color:#1f1c18;font-size:15px;">${escapeHtml(v).replace(/\n/g, '<br>')}</td></tr>`
        )
        .join('');
}

function rowsText(rows) {
    return rows
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.error('RESEND_API_KEY niet ingesteld');
        return res.status(500).json({ error: 'Server niet geconfigureerd' });
    }

    const ip =
        (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() ||
        req.socket?.remoteAddress ||
        'unknown';
    if (rateLimited(ip)) {
        return res.status(429).json({ error: 'Te veel verzoeken — probeer het zo opnieuw.' });
    }

    // Body kan al geparsed zijn door Vercel, of een raw string zijn.
    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = null; }
    }
    if (!body || typeof body !== 'object') {
        return res.status(400).json({ error: 'Ongeldige body' });
    }

    // Honeypot: bots vullen dit veld in, mensen niet.
    if (clean(body.website, 50)) {
        return res.status(200).json({ ok: true }); // stilletjes accepteren
    }

    const naam = clean(body.naam, 200);
    const email = clean(body.email, 254).toLowerCase();
    const aanwezig = clean(body.aanwezig, 10);
    const speech = clean(body.speech, 10);
    const dieet = clean(body.dieet, 500);
    const bijzonderheden = clean(body.bijzonderheden, 1000);
    const bericht = clean(body.bericht, 2000);

    if (!naam) return res.status(400).json({ error: 'Naam ontbreekt' });
    if (!isEmail(email)) return res.status(400).json({ error: 'Ongeldig e-mailadres' });
    if (aanwezig !== 'ja' && aanwezig !== 'nee') {
        return res.status(400).json({ error: 'Aanwezig-keuze ontbreekt' });
    }

    const resend = new Resend(apiKey);

    const aanwezigLabel = aanwezig === 'ja' ? '✓ Komt' : '✗ Komt niet';
    const speechLabel = speech === 'ja' ? '🎤 Wil iets zeggen' : speech === 'nee' ? '🥂 Luistert mee' : '';

    const hostRows = [
        ['Naam', naam],
        ['E-mail', email],
        ['Aanwezig', aanwezigLabel],
        ['Speech', speechLabel],
        ['Dieet', dieet],
        ['Bijzonderheden', bijzonderheden],
        ['Bericht', bericht],
    ];

    const hostSubject = `RSVP — ${naam} — ${aanwezig === 'ja' ? 'JA' : 'NEE'}`;
    const hostHtml = `
<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f1ea;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:30px auto;background:#fffdf9;border:1px solid #e8e0d3;border-radius:18px;overflow:hidden;">
    <div style="padding:28px 32px 8px;">
      <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#a4977f;">Nieuwe RSVP · Sam &amp; Jurgen</div>
      <h1 style="font-family:Georgia,serif;font-weight:400;font-size:30px;margin:8px 0 4px;color:#1f1c18;">${escapeHtml(naam)}</h1>
      <div style="font-size:18px;color:#1f1c18;">${aanwezigLabel}</div>
    </div>
    <table style="width:100%;border-collapse:collapse;padding:20px 32px;margin:0 0 12px;">
      <tbody style="display:table-row-group;">${rowsHtml(hostRows)}</tbody>
    </table>
    <div style="padding:14px 32px 24px;border-top:1px solid #efe7d8;font-size:12px;color:#a4977f;">
      Reply op deze mail om direct ${escapeHtml(naam)} te antwoorden.
    </div>
  </div>
</body></html>`;
    const hostText =
        `Nieuwe RSVP — Sam & Jurgen\n` +
        `============================\n\n` +
        rowsText(hostRows) +
        `\n\n(Reply op deze mail om direct ${naam} te antwoorden.)\n`;

    try {
        const { error } = await resend.emails.send({
            from: FROM,
            to: [TO_HOSTS],
            replyTo: email,
            subject: hostSubject,
            html: hostHtml,
            text: hostText,
        });
        if (error) {
            console.error('Resend (host) error:', error);
            return res.status(502).json({ error: 'Kon de mail niet versturen. Probeer het later opnieuw.' });
        }
    } catch (err) {
        console.error('Resend (host) exception:', err);
        return res.status(502).json({ error: 'Kon de mail niet versturen. Probeer het later opnieuw.' });
    }

    // Bevestigingsmail aan gast — best-effort, faalt deze dan nog steeds 200.
    const guestSubject = aanwezig === 'ja'
        ? '¡Gracias! We hebben jullie RSVP ontvangen 🌞'
        : 'Bedankt voor het laten weten 💛';

    const guestRows = [
        ['Aanwezig', aanwezigLabel],
        ['Speech', speechLabel],
        ['Dieet', dieet],
        ['Bijzonderheden', bijzonderheden],
        ['Jullie bericht', bericht],
    ];

    const guestIntro = aanwezig === 'ja'
        ? `Wat leuk dat jullie erbij zijn! We hebben jullie aanmelding goed ontvangen. Dichter bij de datum sturen we meer praktische info — vluchten, hotels, het programma. Tot in Málaga!`
        : `Jammer dat jullie er niet bij kunnen zijn — bedankt dat jullie het laten weten. We zullen jullie missen. Een dikke knuffel uit de toekomst, vanuit de zon.`;

    const guestHtml = `
<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f1ea;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:30px auto;background:#fffdf9;border:1px solid #e8e0d3;border-radius:18px;overflow:hidden;">
    <div style="padding:32px 32px 8px;text-align:center;">
      <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#a4977f;">Sam &amp; Jurgen · 24 — 27 april 2027</div>
      <div style="font-family:Georgia,serif;font-style:italic;font-size:42px;color:#c97a5a;margin:14px 0 6px;">¡Gracias!</div>
    </div>
    <div style="padding:8px 32px 4px;color:#1f1c18;font-size:16px;line-height:1.6;">
      <p style="margin:0 0 14px;">Hoi ${escapeHtml(naam.split(/[\s&]/)[0])},</p>
      <p style="margin:0 0 18px;">${escapeHtml(guestIntro)}</p>
    </div>
    <div style="padding:6px 32px 12px;">
      <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#a4977f;margin:14px 0 8px;">Jullie antwoord</div>
      <table style="width:100%;border-collapse:collapse;">
        <tbody style="display:table-row-group;">${rowsHtml(guestRows)}</tbody>
      </table>
    </div>
    <div style="padding:18px 32px 28px;border-top:1px solid #efe7d8;color:#7a7367;font-size:13px;line-height:1.6;">
      Klopt er iets niet? Reply gewoon op deze mail, dan passen we het aan.<br><br>
      Un abrazo,<br>
      <span style="font-family:Georgia,serif;font-style:italic;color:#1f1c18;">Sam &amp; Jurgen</span>
    </div>
  </div>
</body></html>`;
    const guestText =
        `¡Gracias!\n\n` +
        `Hoi ${naam.split(/[\s&]/)[0]},\n\n` +
        guestIntro + `\n\n` +
        `Jullie antwoord\n---------------\n` +
        rowsText(guestRows) + `\n\n` +
        `Klopt er iets niet? Reply op deze mail.\n\n` +
        `Un abrazo,\nSam & Jurgen\n`;

    try {
        await resend.emails.send({
            from: FROM,
            to: [email],
            replyTo: TO_HOSTS,
            subject: guestSubject,
            html: guestHtml,
            text: guestText,
        });
    } catch (err) {
        console.error('Resend (guest) exception (non-fatal):', err);
    }

    return res.status(200).json({ ok: true });
}
