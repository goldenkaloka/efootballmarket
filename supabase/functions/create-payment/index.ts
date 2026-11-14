// Starts a listing-fee payment. Deploy: supabase functions deploy create-payment
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
const NETWORKS = ['M-Pesa', 'Airtel Money', 'Mixx', 'HaloPesa']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '')
  const { data: { user } } = await admin.auth.getUser(jwt)
  if (!user) return json({ error: 'Not signed in' }, 401)

  const { listing_id, network, phone } = await req.json()
  if (!NETWORKS.includes(network) || String(phone).replace(/\D/g, '').length < 9) return json({ error: 'Invalid payment details' }, 400)

  const { data: l } = await admin.from('listings').select('id,seller_id,status').eq('id', listing_id).single()
  if (!l || l.seller_id !== user.id || l.status !== 'pending_payment') return json({ error: 'This listing cannot be paid' }, 400)

  const amount = Number(Deno.env.get('LISTING_FEE') || 2000)
  const reference = crypto.randomUUID()
  await admin.from('payments').insert({ listing_id, seller_id: user.id, amount, network, phone, reference })

  if (Deno.env.get('PAYMENT_MODE') === 'test') {
    // TEST MODE ONLY: marks the payment as paid immediately so you can test the flow without a provider.
    await admin.from('payments').update({ status: 'paid' }).eq('reference', reference)
    await admin.from('listings').update({ status: 'active' }).eq('id', listing_id)
    return json({ reference, test: true })
  }

  // PRODUCTION: call your mobile money provider here to send the payment prompt to `phone`
  // (use `reference` as the order id and point the provider's callback at the payment-webhook function).
  // Provider APIs differ, so follow the documentation of the aggregator you choose.
  return json({ error: 'Payment provider is not configured yet' }, 501)
})
