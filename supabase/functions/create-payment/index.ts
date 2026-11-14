// Starts a listing-fee payment via SonicPesa (500 TSh).
// Deploy: supabase functions deploy create-payment
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '')
  const { data: { user } } = await admin.auth.getUser(jwt)
  if (!user) return json({ error: 'Not signed in' }, 401)

  const { listing_id, phone, network } = await req.json()
  const cleanedPhone = String(phone || '').replace(/\D/g, '')
  if (cleanedPhone.length < 9) return json({ error: 'Invalid phone number' }, 400)

  // Ensure format is 255...
  const formattedPhone = cleanedPhone.startsWith('0')
    ? '255' + cleanedPhone.slice(1)
    : cleanedPhone.startsWith('255')
    ? cleanedPhone
    : '255' + cleanedPhone

  const { data: l } = await admin.from('listings').select('id,seller_id,status,title').eq('id', listing_id).single()
  if (!l || l.seller_id !== user.id) return json({ error: 'Listing not found' }, 404)
  if (l.status === 'active') return json({ error: 'Listing is already active' }, 400)

  const amount = Number(Deno.env.get('LISTING_FEE') || 500)
  const reference = crypto.randomUUID()

  // Save pending payment record in DB
  await admin.from('payments').insert({
    listing_id,
    seller_id: user.id,
    amount,
    network: network || 'Mobile Money',
    phone: formattedPhone,
    reference
  })

  // Test mode bypass for dev
  if (Deno.env.get('PAYMENT_MODE') === 'test') {
    await admin.from('payments').update({ status: 'paid' }).eq('reference', reference)
    await admin.from('listings').update({ status: 'active' }).eq('id', listing_id)
    return json({ reference, test: true, success: true })
  }

  // SonicPesa API Integration
  const sonicPesaApiKey = Deno.env.get('SONICPESA_API_KEY')
  if (!sonicPesaApiKey) {
    return json({ error: 'SonicPesa API key is not configured' }, 500)
  }

  try {
    const sonicRes = await fetch('https://api.sonicpesa.com/api/v1/payment/create_order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': sonicPesaApiKey
      },
      body: JSON.stringify({
        buyer_name: user.user_metadata?.phone || formattedPhone,
        buyer_email: user.email || `seller_${formattedPhone}@efootballmarket.com`,
        buyer_phone: formattedPhone,
        amount: amount,
        currency: 'TZS',
        order_id: reference
      })
    })

    const sonicData = await sonicRes.json()
    if (!sonicRes.ok) {
      console.error('SonicPesa create_order error:', sonicData)
      return json({ error: sonicData?.message || 'Failed to initiate SonicPesa payment' }, 400)
    }

    return json({
      success: true,
      reference,
      amount,
      sonicpesa: sonicData,
      message: 'USSD prompt sent to your phone. Enter your PIN to complete 500 TSh payment.'
    })
  } catch (err: any) {
    console.error('SonicPesa request failed:', err)
    return json({ error: err.message || 'SonicPesa connection error' }, 500)
  }
})
