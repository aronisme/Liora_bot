export default async function handler(req: Request){ return new Response(JSON.stringify({ok:true}), {status:200, headers:{'content-type':'application/json'}}) }
