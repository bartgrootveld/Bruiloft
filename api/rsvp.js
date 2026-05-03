// Vercel serverless function: POST /api/rsvp
// Verstuurt 2 e-mails via Resend:
//   1. Naar Sam met de volledige RSVP (reply-to = gast)
//   2. Bevestiging naar de gast (reply-to = Sam)

import { Resend } from 'resend';

const TO_HOSTS = 'sam@nicedoingbusiness.nl';
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
            ([k, v]) => `
            <tr>
                <td style="padding:14px 0 6px;color:#8a8076;font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;border-bottom:1px solid #efe7d8;">${escapeHtml(k)}</td>
            </tr>
            <tr>
                <td style="padding:8px 0 18px;color:#2b2722;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.5;">${escapeHtml(v).replace(/\n/g, '<br>')}</td>
            </tr>`
        )
        .join('');
}

function rowsText(rows) {
    return rows
        .filter(([, v]) => v)
        .map(([k, v]) => `${k.toUpperCase()}\n${v}`)
        .join('\n\n');
}

// Gedeelde shell voor beide mails. Gmail/Outlook-veilige nested tables.
function emailShell({ preheader, eyebrow, title, accent, body }) {
    return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f6efe6;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6efe6;">
    <tr>
        <td align="center" style="padding:48px 16px;">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#fbf6ef;border:1px solid #ece2d0;border-radius:20px;">
                <tr>
                    <td style="padding:8px 8px 0;">
                        <div style="height:6px;background:${accent};border-radius:14px 14px 0 0;"></div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:36px 48px 8px;">
                        <div style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#8a8076;">${escapeHtml(eyebrow)}</div>
                    </td>
                </tr>
                ${body}
                <tr>
                    <td style="padding:28px 48px 36px;border-top:1px solid #efe7d8;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                                <td style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#a4977f;">Sam &amp; Jurgen</td>
                                <td align="right" style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#a4977f;">24&nbsp;—&nbsp;27 abril 2027</td>
                            </tr>
                            <tr>
                                <td colspan="2" style="padding-top:6px;font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#a4977f;">Fuente del Sol &middot; Málaga</td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
            <div style="padding:18px 0 0;font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#a4977f;">sí, quiero.</div>
        </td>
    </tr>
</table>
</body>
</html>`;
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

    const aanwezigJa = aanwezig === 'ja';
    const aanwezigLabel = aanwezigJa ? 'Komt' : 'Komt niet';
    const speechLabel = speech === 'ja' ? 'Wil iets zeggen' : speech === 'nee' ? 'Luistert mee' : '';
    const accentColor = aanwezigJa ? '#b56b4a' : '#c8d3b7';
    const firstName = naam.split(/[\s&]/)[0] || naam;

    // ============================================
    // Mail aan host (Sam)
    // ============================================
    const hostRows = [
        ['E-mail', email],
        ['Aanwezig', aanwezigLabel],
        ['Speech', speechLabel],
        ['Dieet', dieet],
        ['Bijzonderheden', bijzonderheden],
        ['Bericht', bericht],
    ];

    const hostBody = `
                <tr>
                    <td style="padding:6px 48px 8px;">
                        <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:42px;line-height:1.1;color:#2b2722;letter-spacing:-0.01em;">${escapeHtml(naam)}</h1>
                    </td>
                </tr>
                <tr>
                    <td style="padding:14px 48px 0;">
                        <span style="display:inline-block;padding:8px 16px;border-radius:999px;background:${accentColor};color:#fbf6ef;font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;">${escapeHtml(aanwezigLabel)}</span>
                    </td>
                </tr>
                <tr>
                    <td style="padding:32px 48px 8px;">
                        <div style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#a4977f;">Antwoord</div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:0 48px 8px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rowsHtml(hostRows)}</table>
                    </td>
                </tr>
                <tr>
                    <td style="padding:24px 48px 8px;">
                        <div style="padding:16px 20px;background:#f6efe6;border-radius:12px;font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:1.6;color:#5b5249;font-style:italic;">
                            Reply op deze mail om direct ${escapeHtml(firstName)} te antwoorden.
                        </div>
                    </td>
                </tr>`;

    const hostHtml = emailShell({
        preheader: `${naam} — ${aanwezigLabel.toLowerCase()}`,
        eyebrow: 'Nieuwe RSVP',
        title: `RSVP — ${naam}`,
        accent: accentColor,
        body: hostBody,
    });

    const hostText =
        `NIEUWE RSVP — Sam & Jurgen\n` +
        `==========================\n\n` +
        `${naam}\n${aanwezigLabel}\n\n` +
        `ANTWOORD\n--------\n\n` +
        rowsText(hostRows) +
        `\n\n— Reply op deze mail om direct ${firstName} te antwoorden.\n`;

    const hostSubject = `RSVP — ${naam} — ${aanwezigJa ? 'JA' : 'NEE'}`;

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

    // ============================================
    // Bevestigingsmail aan gast — best-effort
    // ============================================
    const guestSubject = aanwezigJa
        ? '¡Gracias! We hebben jullie RSVP ontvangen'
        : 'Bedankt voor het laten weten';

    const guestRows = [
        ['Aanwezig', aanwezigLabel],
        ['Speech', speechLabel],
        ['Dieet', dieet],
        ['Bijzonderheden', bijzonderheden],
        ['Jullie bericht', bericht],
    ];

    const guestIntro = aanwezigJa
        ? `Wat leuk dat jullie erbij zijn! We hebben jullie aanmelding goed ontvangen. Dichter bij de datum sturen we meer praktische info — vluchten, hotels, het programma. Tot in Málaga.`
        : `Jammer dat jullie er niet bij kunnen zijn — bedankt dat jullie het laten weten. We zullen jullie missen, maar zijn blij dat we het weten.`;

    const guestHeading = aanwezigJa ? '¡Gracias!' : 'Gracias.';

    const guestBody = `
                <tr>
                    <td align="center" style="padding:8px 48px 0;">
                        <div style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-weight:400;font-size:64px;line-height:1;color:${accentColor};letter-spacing:-0.02em;">${escapeHtml(guestHeading)}</div>
                    </td>
                </tr>
                <tr>
                    <td align="center" style="padding:18px 48px 0;">
                        <div style="font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.6;color:#5b5249;letter-spacing:0.02em;">
                            Sam <em>&amp;</em> Jurgen &middot; 24 — 27 april 2027
                        </div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:36px 48px 0;">
                        <div style="height:1px;background:#efe7d8;"></div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:32px 48px 0;">
                        <p style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:18px;line-height:1.6;color:#2b2722;">Hoi ${escapeHtml(firstName)},</p>
                        <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.7;color:#2b2722;">${escapeHtml(guestIntro)}</p>
                    </td>
                </tr>
                <tr>
                    <td style="padding:36px 48px 8px;">
                        <div style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#a4977f;">Jullie antwoord</div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:0 48px 8px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rowsHtml(guestRows)}</table>
                    </td>
                </tr>
                <tr>
                    <td style="padding:24px 48px 8px;">
                        <div style="padding:18px 22px;background:#f6efe6;border-radius:12px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.6;color:#5b5249;">
                            Klopt er iets niet? Reply op deze mail, dan passen we het aan.
                        </div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:32px 48px 8px;">
                        <div style="font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.6;color:#5b5249;">Un abrazo,</div>
                        <div style="margin-top:6px;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:22px;line-height:1.3;color:#2b2722;">Sam &amp; Jurgen</div>
                    </td>
                </tr>`;

    const guestHtml = emailShell({
        preheader: aanwezigJa
            ? 'We hebben jullie RSVP goed ontvangen — tot in Málaga.'
            : 'Bedankt voor het laten weten.',
        eyebrow: 'RSVP bevestiging',
        title: guestSubject,
        accent: accentColor,
        body: guestBody,
    });

    const guestText =
        `${guestHeading}\n\n` +
        `Sam & Jurgen — 24 t/m 27 april 2027 — Fuente del Sol, Málaga\n\n` +
        `Hoi ${firstName},\n\n` +
        guestIntro + `\n\n` +
        `JULLIE ANTWOORD\n---------------\n\n` +
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
