const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { session_id } = req.query;

  // No session ID — treat as brand new visitor
  if (!session_id) return res.status(200).json({ check_count: 0, unlocked: false });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const { data: session } = await supabase
    .from('usage_sessions')
    .select('session_id, check_count, unlocked')
    .eq('session_id', session_id)
    .single();

  if (!session) return res.status(200).json({ check_count: 0, unlocked: false });

  return res.status(200).json({
    session_id: session.session_id,
    check_count: session.check_count,
    unlocked: session.unlocked
  });
};
