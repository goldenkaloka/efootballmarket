// Called by SonicPesa when a payment succeeds or fails.
// Deploy: supabase functions deploy payment-webhook --no-verify-jwt
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*'
      }
    })
  }

  const rawBody = await req.text()
  const signature = req.headers.get('x-sonicpesa-signature') || req.headers.get('http_x_sonicpesa_signature')
  const secret = Deno.env.get('SONICPESA_WEBHOOK_SECRET') || Deno.env.get('WEBHOOK_SECRET')

  // Optional: verify HMAC sha256 signature if secret is set
  if (secret && signature) {
    const encoder = new TextEncoder()
    const keyData = encoder.encode(secret)
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    )
    const signed = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(rawBody))
    const expectedSig = Array.from(new Uint8Array(signed))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    if (expectedSig !== signature) {
      console.error('SonicPesa invalid signature:', { expectedSig, signature })
      return new Response('Invalid signature', { status: 403 })
    }
  }

  let payload: any = {}
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  console.log('SonicPesa Webhook received:', payload)

  // SonicPesa payload fields: order_id / reference, status ('SUCCESS' / 'payment.success')
  const reference = payload.order_id || payload.reference || payload.transid
  const isSuccess = payload.status === 'SUCCESS' || payload.event === 'payment.success' || payload.status === 'paid'
  const isFailed = payload.status === 'FAILED' || payload.status === 'failed' || payload.event === 'payment.failed'

  if (!reference) {
    return new Response('Missing order reference', { status: 400 })
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: p } = await admin.from('payments').select('listing_id,status').eq('reference', reference).single()
  
  if (!p) {
    console.error('Payment reference not found in DB:', reference)
    return new Response('Unknown reference', { status: 404 })
  }

  if (isSuccess) {
    await admin.from('payments').update({ status: 'paid' }).eq('reference', reference)
    await admin.from('listings').update({ status: 'active' }).eq('id', p.listing_id)
    console.log(`Listing ${p.listing_id} is now ACTIVE after 500 TSh payment.`)
  } else if (isFailed) {
    await admin.from('payments').update({ status: 'failed' }).eq('reference', reference)
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
})
