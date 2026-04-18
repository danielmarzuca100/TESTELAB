export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { period } = req.query;
  const TOKEN = process.env.UTM_TOKEN;
  const DASH_ID = '66188c1e6dbe942a8d1849ee';

  const now = new Date();
  const pad = n => n.toString().padStart(2, '0');
  const fmtDate = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

  let from, to;
  if (period === 'yesterday') {
    const y = new Date(now); y.setDate(y.getDate() - 1);
    from = to = fmtDate(y);
  } else if (period === 'week') {
    const w = new Date(now); w.setDate(w.getDate() - 6);
    from = fmtDate(w); to = fmtDate(now);
  } else if (period === 'month') {
    from = `${now.getFullYear()}-${pad(now.getMonth()+1)}-01`;
    to = fmtDate(now);
  } else {
    from = to = fmtDate(now);
  }

  const url = `https://mcp.utmify.com.br/mcp/?token=${TOKEN}&resources=gs,gm`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        mcp_servers: [{ type: 'url', url, name: 'utmify' }],
        messages: [{
          role: 'user',
          content: `Busque campanhas Meta Ads do dashboard id="${DASH_ID}" de ${from}T00:00:00-03:00 até ${to}T23:59:59-03:00, status ACTIVE e PAUSED. Retorne SOMENTE um JSON array sem texto extra, máximo 10 campanhas ordenadas por gasto: [{"nome":"","gasto":0,"faturamento":0,"roi":null,"vendas":0,"status":"","cpa":null}]`
        }]
      })
    });
    const data = await resp.json();
    const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '[]';
    const clean = text.replace(/```json|```/g, '').trim();
    res.status(200).json(JSON.parse(clean));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
