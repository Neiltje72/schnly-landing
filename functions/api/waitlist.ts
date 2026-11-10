interface Env {
  WAITLIST_KV?: KVNamespace;
  DB?: D1Database;
  ADMIN_EMAIL?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://schnly.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const data = await request.json() as { email?: string };
    const email = data?.email?.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'A valid email address is required.' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const timestamp = new Date().toISOString();
    const clientIp = request.headers.get('cf-connecting-ip') || 'unknown';
    const country = request.headers.get('cf-ipcountry') || 'unknown';

    if (env.DB) {
      await env.DB.prepare(
        'INSERT OR IGNORE INTO waitlist (email, country, created_at) VALUES (?, ?, ?)'
      )
        .bind(email, country, timestamp)
        .run();
    }

    if (env.WAITLIST_KV) {
      await env.WAITLIST_KV.put(
        `waitlist:${email}`,
        JSON.stringify({ email, timestamp, clientIp, country })
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Added to waitlist.' }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal server error processing submission.' }),
      { status: 500, headers: corsHeaders }
    );
  }
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://schnly.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
