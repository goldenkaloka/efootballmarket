import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)

export const LISTING_FEE = 500 // TSh. SonicPesa listing fee.
export const NETWORKS = ['M-Pesa', 'Airtel Money', 'Mixx', 'HaloPesa']
export const FORMATIONS = ['4-3-3', '4-2-3-1', '4-4-2', '3-5-2', '4-1-4-1', '3-4-3', '5-3-2', '4-5-1']

// eFootball team playstyles: [name, one-line explanation]
export const PLAYSTYLES = {
  possession: ['Possession Game', 'Short passes, keep the ball'],
  quick_counter: ['Quick Counter', 'Win it back, strike fast'],
  long_ball_counter: ['Long Ball Counter', 'Defend deep, hit long behind'],
  out_wide: ['Out Wide', 'Stretch play with the wingers'],
  long_ball: ['Long Ball', 'Direct passes to the striker'],
}
export const KITS = [['Blue and garnet', '#1d4ed8', '#a3173a'], ['Sky and white', '#58aef5', '#e6f0ff'], ['Red', '#d4202c', '#7a0e17'], ['White and gold', '#e9edf7', '#c9a227'], ['Black and gold', '#14161f', '#c9a227'], ['Navy and yellow', '#13286e', '#ffd400']]

export const PLAYER_TYPES = ['Epic Booster', 'Big Time', 'Show Time', 'Highlight', 'Featured / POTW', 'Standard']

export const PLAYER_PLAYSTYLES = [
  'Goal Poacher',
  'Hole Player',
  'Creative Playmaker',
  'Prolific Winger',
  'Roaming Flank',
  'Fox in the Box',
  'Target Man',
  'Anchor Man',
  'Box-to-Box',
  'Destroyer',
  'Build Up',
  'Extra Frontman',
  'Offensive Goalkeeper',
  'Defensive Goalkeeper'
]

export const formatCoins = (n) => Number(n || 0).toLocaleString('en-US') + ' Coins'
export const formatGP = (n) => Number(n || 0).toLocaleString('en-US') + ' GP'

export function cleanPhone(raw) {
  let n = String(raw || '').replace(/\D/g, '')
  if (n.startsWith('0')) n = '255' + n.slice(1)
  else if (n.length === 9) n = '255' + n
  return n
}

export function phoneToEmail(phone) {
  return `seller_${cleanPhone(phone)}@efootballmarket.com`
}

export function waLink(l) {
  const n = cleanPhone(l.whatsapp)
  let details = `"${l.title}" (${l.strength} Strength`
  if (l.coins > 0) details += `, ${Number(l.coins).toLocaleString('en-US')} Coins`
  if (l.star_player) details += `, Star: ${l.star_player}`
  details += `)`
  const msg = `Hi, I saw your eFootball squad ${details} on eFootball Market. I would like to negotiate the price with you. What is your offer?`
  return `https://wa.me/${n}?text=${encodeURIComponent(msg)}`
}
export function compress(file) {
  return new Promise((res, rej) => {
    const im = new Image()
    im.onload = () => {
      const k = Math.min(1, 1000 / Math.max(im.width, im.height)), c = document.createElement('canvas')
      c.width = im.width * k; c.height = im.height * k
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height)
      c.toBlob((b) => (b ? res(b) : rej(new Error('Could not read image'))), 'image/jpeg', 0.75)
    }
    im.onerror = () => rej(new Error('Could not read image'))
    im.src = URL.createObjectURL(file)
  })
}
