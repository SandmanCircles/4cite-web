const { createClient } = require('@supabase/supabase-js');

const FREE_LIMIT = 3;

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { session_id } = req.body || {};
  if (!session_id) return res.status(400).json({ error: 'session_id required' });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // Get existing session
  const { data: existing } = await supabase
    .from('usage_sessions')
    .select('*')
    .eq('session_id', session_id)
    .single();

  let session;

  if (!existing) {
    // First visit — create session with count 1
    const { data: created } = await supabase
      .from('usage_sessions')
      .insert({ session_id, check_count: 1, unlocked: false })
      .select()
      .single();
    session = created || { session_id, check_count: 1, unlocked: false };
  } else {
    // Increment count
    const { data: updated } = await supabase
      .from('usage_sessions')
      .update({ check_count: existing.check_count + 1 })
      .eq('session_id', session_id)
      .select()
      .single();
    session = updated || { ...existing, check_count: existing.check_count + 1 };
  }

  return res.status(200).json({
    session_id: session.session_id,
    check_count: session.check_count,
    unlocked: session.unlocked,
    gate_required: !session.unlocked && session.check_count >= FREE_LIMIT
  });
};
