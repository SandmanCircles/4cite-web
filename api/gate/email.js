const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { session_id, email, vertical } = req.body || {};

  // Validate email
  if (!email || !email.includes('@') || !email.includes('.')) {
    return res.status(400).json({ error: 'invalid email' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const cleanEmail = email.toLowerCase().trim();

  // Ensure session exists before inserting (avoids FK constraint failure)
  if (session_id) {
    await supabase.from('usage_sessions').upsert(
      { session_id, check_count: 0, unlocked: false },
      { onConflict: 'session_id', ignoreDuplicates: true }
    );
  }

  // Capture email (ignore duplicate errors — same email submitting twice is fine)
  await supabase.from('email_captures').insert({
    email: cleanEmail,
    vertical: vertical || null,
    session_id: session_id || null
  });

  // Mark session as unlocked
  if (session_id) {
    await supabase
      .from('usage_sessions')
      .upsert(
        { session_id, unlocked: true },
        { onConflict: 'session_id' }
      );
  }

  return res.status(200).json({ success: true, unlocked: true });
};
