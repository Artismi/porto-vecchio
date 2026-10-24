// Le api della Mente sono scritte per Vercel (req, res alla Node): qui diventano
// funzioni Netlify (Request -> Response) senza toccarle.
export function daVercel(handler) {
  return async (req, context) => {
    const headers = Object.fromEntries(req.headers)
    if (!headers['x-forwarded-for'] && context?.ip) headers['x-forwarded-for'] = context.ip
    let body
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const testo = await req.text()
      try { body = JSON.parse(testo) } catch { body = testo }
    }
    const query = Object.fromEntries(new URL(req.url).searchParams)
    return new Promise((resolve) => {
      let code = 200
      const extra = {}
      const res = {
        status(c) { code = c; return res },
        setHeader(k, v) { extra[k] = v; return res },
        json(o) {
          resolve(new Response(JSON.stringify(o), { status: code, headers: { 'content-type': 'application/json; charset=utf-8', ...extra } }))
          return res
        },
        send(t) { resolve(new Response(typeof t === 'string' ? t : JSON.stringify(t), { status: code, headers: extra })); return res },
        end(t) { resolve(new Response(t ?? '', { status: code, headers: extra })); return res },
      }
      Promise.resolve(handler({ method: req.method, headers, body, query, url: req.url }, res)).catch((e) => {
        resolve(new Response(JSON.stringify({ ok: false, error: String(e && e.message || e) }), { status: 500, headers: { 'content-type': 'application/json; charset=utf-8' } }))
      })
    })
  }
}
