const { Resend } = require('resend');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { type, name, email, org, vertical } = req.body || {};

  if (!email || !email.includes('@') || !email.includes('.')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  // Build email content based on submission type
  const isAccessRequest = type === 'access';
  const subject = isAccessRequest
    ? `4CITE Access Request — ${org || name || email}`
    : `4CITE Gate Signup — ${vertical || 'unknown'} — ${email}`;

  const html = isAccessRequest
    ? `
      <h2 style="color:#07152E;">New Access Request — 4CITE.ai</h2>
      <table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:14px;">
        <tr><td style="padding:8px;color:#666;width:140px;"><strong>Name</strong></td><td style="padding:8px;">${name || '—'}</td></tr>
        <tr><td style="padding:8px;color:#666;"><strong>Email</strong></td><td style="padding:8px;"><a href="mailto:${email}">${email}</a></td></tr>
        <tr><td style="padding:8px;color:#666;"><strong>Organization</strong></td><td style="padding:8px;">${org || '—'}</td></tr>
        <tr><td style="padding:8px;color:#666;"><strong>Vertical</strong></td><td style="padding:8px;">${vertical || '—'}</td></tr>
      </table>
      <p style="margin-top:24px;font-size:12px;color:#999;">Sent from 4CITE.ai · Request Access modal</p>
    `
    : `
      <h2 style="color:#07152E;">New Gate Signup — 4CITE.ai</h2>
      <table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:14px;">
        <tr><td style="padding:8px;color:#666;width:140px;"><strong>Email</strong></td><td style="padding:8px;"><a href="mailto:${email}">${email}</a></td></tr>
        <tr><td style="padding:8px;color:#666;"><strong>Vertical</strong></td><td style="padding:8px;">${vertical || '—'}</td></tr>
      </table>
      <p style="margin-top:24px;font-size:12px;color:#999;">Sent from 4CITE.ai · Email gate modal · User unlocked unlimited checks</p>
    `;

  try {
    await resend.emails.send({
      from: 'noreply@4cite.ai',
      to: 'web@4cite.ai',
      replyTo: email,
      subject,
      html
    });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Resend error:', err);
    // Don't fail the user-facing flow if email fails — Supabase still has the data
    return res.status(200).json({ success: true, warning: 'email delivery failed' });
  }
};
