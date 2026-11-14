// Called by your payment provider when a payment succeeds. Deploy: supabase functions deploy payment-webhook --no-verify-jwt
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  // Replace this shared-secret check with the signature verification your provider documents.
  if (req.headers.get('x-webhook-secret') !== Deno.env.get('WEBHOOK_SECRET')) return new Response('Unauthorized', { status: 401 })

  const { reference, status } = await req.json() // adapt to your provider's payload
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: p } = await admin.from('payments').select('listing_id,status').eq('reference', reference).single()
  if (!p) return new Response('Unknown reference', { status: 404 })

  if (status === 'paid') {
    await admin.from('payments').update({ status: 'paid' }).eq('reference', reference)
    await admin.from('listings').update({ status: 'active' }).eq('id', p.listing_id)
  } else if (status === 'failed') {
    await admin.from('payments').update({ status: 'failed' }).eq('reference', reference)
  }
  return new Response('ok')
})
