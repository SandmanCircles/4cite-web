const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Cache at Vercel edge for 24 hours — Supabase hit once per day max
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const [docsResult, entitiesResult, examsResult] = await Promise.all([
      supabase.from('documents').select('*', { count: 'exact', head: true }),
      supabase.from('document_entities').select('*', { count: 'exact', head: true }),
      supabase.from('gate_scores').select('*', { count: 'exact', head: true }),
    ]);

    const docs = docsResult.count || 0;
    const entities = entitiesResult.count || 0;
    const exams = examsResult.count || 0;
    const completion = docs > 0 ? (exams / docs) : 0;

    return res.status(200).json({
      documents_loaded: docs,
      entities_identified: entities,
      structural_exams: exams,
      map_completion: completion,
      map_completion_pct: completion < 0.01 ? '<1%' : (completion * 100).toFixed(1) + '%',
      updated_at: new Date().toISOString(),
    });

  } catch (err) {
    return res.status(500).json({ error: 'stats unavailable' });
  }
};
