import { useEffect, useState } from 'react'
import { supabase, compress, cleanPhone, phoneToEmail, PLAYSTYLES, FORMATIONS, KITS, PLAYER_TYPES, PLAYER_PLAYSTYLES } from './lib'
import { Modal } from './ui'

const blank = {
  title: '',
  strength: '',
  formation: '4-3-3',
  playstyle: 'possession',
  platform: 'Android',
  kit: 5,
  star_player: '',
  star_player_rating: '',
  star_player_playstyle: 'Goal Poacher',
  coins: '',
  gp: '',
  player_types: [],
  whatsapp: '',
  description: ''
}

function Auth() {
  const [mode, setMode] = useState('login')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    const cleaned = cleanPhone(phone)
    if (cleaned.length < 9) {
      return setErr('Please enter a valid phone number (e.g. 0712 345 678)')
    }
    if (password.length < 6) {
      return setErr('Password must be at least 6 characters')
    }

    setBusy(true)
    const email = phoneToEmail(cleaned)

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { phone: cleaned }
          }
        })
        if (error) {
          if (error.message.toLowerCase().includes('already registered')) {
            setErr('This phone number already has an account. Please log in.')
            setMode('login')
          } else {
            setErr(error.message)
          }
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        })
        if (error) {
          if (error.message.toLowerCase().includes('invalid login credentials')) {
            setErr('Incorrect phone number or password.')
          } else {
            setErr(error.message)
          }
        }
      }
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="f" onSubmit={submit}>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          className="pill"
          aria-pressed={mode === 'login'}
          onClick={() => { setMode('login'); setErr('') }}
          style={{ flex: 1, textAlign: 'center' }}
        >
          Log in
        </button>
        <button
          type="button"
          className="pill"
          aria-pressed={mode === 'signup'}
          onClick={() => { setMode('signup'); setErr('') }}
          style={{ flex: 1, textAlign: 'center' }}
        >
          Create account
        </button>
      </div>

      <p style={{ margin: 0, fontSize: 14, color: 'var(--mute)' }}>
        {mode === 'login'
          ? 'Log in with your phone number and password to manage your squads.'
          : 'Create a seller account with your phone number and password to post squads.'}
      </p>

      <label>
        Phone number
        <input
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="0712 345 678"
          autoFocus
          required
        />
      </label>

      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
          required
        />
      </label>

      {err && <div className="err">{err}</div>}

      <button className="btn" type="submit" disabled={busy}>
        {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account & continue'}
      </button>

      <div style={{ textAlign: 'center' }}>
        {mode === 'login' ? (
          <button
            type="button"
            className="del"
            style={{ margin: '0 auto', display: 'inline-block' }}
            onClick={() => { setMode('signup'); setErr('') }}
          >
            Don't have an account? Sign up
          </button>
        ) : (
          <button
            type="button"
            className="del"
            style={{ margin: '0 auto', display: 'inline-block' }}
            onClick={() => { setMode('login'); setErr('') }}
          >
            Already have an account? Log in
          </button>
        )}
      </div>
    </form>
  )
}

export function SellDialog({ session, resume, onClose, onLive }) {
  const sellerPhone = session?.user?.user_metadata?.phone || session?.user?.email?.split('@')[0]?.replace('seller_', '') || ''
  const [step, setStep] = useState('form')
  const [f, setF] = useState(() => ({ ...blank, whatsapp: sellerPhone }))
  const [files, setFiles] = useState([])
  const [starPlayerFile, setStarPlayerFile] = useState(null)
  const [busy, setBusy] = useState(false), [err, setErr] = useState('')
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))

  async function submit() {
    if (!f.title.trim() || !+f.strength || f.whatsapp.replace(/\D/g, '').length < 9) {
      return setErr('Fill in squad name, team strength, and a valid WhatsApp number.')
    }
    setBusy(true); setErr('')
    try {
      // 1. Upload squad screenshots
      const urls = []
      for (const file of files) {
        const path = `${session.user.id}/${crypto.randomUUID()}.jpg`
        const { error } = await supabase.storage.from('screenshots').upload(path, await compress(file), { contentType: 'image/jpeg' })
        if (error) throw error
        urls.push(supabase.storage.from('screenshots').getPublicUrl(path).data.publicUrl)
      }

      // 2. Upload Star Player photo if provided
      let starPlayerImgUrl = null
      if (starPlayerFile) {
        const pPath = `${session.user.id}/star_${crypto.randomUUID()}.jpg`
        const { error: pErr } = await supabase.storage.from('screenshots').upload(pPath, await compress(starPlayerFile), { contentType: 'image/jpeg' })
        if (!pErr) {
          starPlayerImgUrl = supabase.storage.from('screenshots').getPublicUrl(pPath).data.publicUrl
        }
      }

      const row = {
        title: f.title.trim(),
        strength: +f.strength,
        formation: f.formation,
        playstyle: f.playstyle,
        platform: f.platform,
        kit: +f.kit,
        coins: +f.coins || 0,
        gp: +f.gp || 0,
        player_types: f.player_types || [],
        star_player: f.star_player.trim() || null,
        star_player_rating: +f.star_player_rating || null,
        star_player_playstyle: f.star_player_playstyle || null,
        star_player_image: starPlayerImgUrl,
        whatsapp: f.whatsapp.trim(),
        description: f.description.trim(),
        images: urls,
        status: 'active'
      }
      let insertRes = await supabase.from('listings').insert(row).select().single()
      if (insertRes.error && insertRes.error.message?.toLowerCase().includes('column')) {
        // Fallback in case columns are still pending database migration
        const { star_player_rating, star_player_playstyle, star_player_image, ...fallbackRow } = row
        insertRes = await supabase.from('listings').insert(fallbackRow).select().single()
      }
      if (insertRes.error) throw insertRes.error
      setStep('live')
      onLive()
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <Modal title="Sell your squad" onClose={onClose}>
      {!session ? <Auth /> : (
        <div className="f">

          {step === 'form' && <>
            <label>Squad name<input value={f.title} maxLength={50} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Madrid Galacticos" /></label>
            <fieldset className="ps">
              <legend>Team playstyle</legend>
              <small>Pick the playstyle this squad is built for. Buyers filter by it.</small>
              {Object.entries(PLAYSTYLES).map(([k, [n, d]]) => (
                <label key={k} className={'psc' + (f.playstyle === k ? ' on' : '')}>
                  <input type="radio" name="ps" checked={f.playstyle === k} onChange={() => set('playstyle', k)} /><b>{n}</b><span>{d}</span>
                </label>
              ))}
            </fieldset>
            <div className="row2">
              <label>Team strength<input type="number" inputMode="numeric" value={f.strength} onChange={(e) => set('strength', e.target.value)} placeholder="3150" /></label>
              <label>Formation<select value={f.formation} onChange={(e) => set('formation', e.target.value)}>{FORMATIONS.map((x) => <option key={x}>{x}</option>)}</select></label>
            </div>
            <div className="row2">
              <label>Platform<select value={f.platform} onChange={(e) => set('platform', e.target.value)}><option>Android</option><option>iOS</option></select></label>
              <label>Kit colours<select value={f.kit} onChange={(e) => set('kit', e.target.value)}>{KITS.map((k, n) => <option key={k[0]} value={n}>{k[0]}</option>)}</select></label>
            </div>
            <div className="row2">
              <label>eFootball Coins (optional)<input type="number" inputMode="numeric" value={f.coins} onChange={(e) => set('coins', e.target.value)} placeholder="e.g. 1200" /></label>
              <label>GP balance (optional)<input type="number" inputMode="numeric" value={f.gp} onChange={(e) => set('gp', e.target.value)} placeholder="e.g. 2500000" /></label>
            </div>
            <label>Special Player Types included
              <div className="chips" style={{ marginTop: 4 }}>
                {PLAYER_TYPES.map((pt) => {
                  const selected = (f.player_types || []).includes(pt)
                  return (
                    <button
                      key={pt}
                      type="button"
                      className={'pill' + (selected ? ' active' : '')}
                      aria-pressed={selected}
                      onClick={() => {
                        const cur = f.player_types || []
                        const next = selected ? cur.filter((x) => x !== pt) : [...cur, pt]
                        set('player_types', next)
                      }}
                    >
                      {selected ? '✓ ' : '+ '}{pt}
                    </button>
                  )
                })}
              </div>
            </label>

            <fieldset className="star-player-box">
              <legend>Featured Star Player</legend>
              <small style={{ color: 'var(--mute)', display: 'block', marginBottom: 8, fontSize: 13 }}>
                Highlight your top card (e.g. Epic Booster Messi, Vieira, Rummenigge)
              </small>

              <label>
                Player name
                <input
                  value={f.star_player}
                  maxLength={50}
                  onChange={(e) => set('star_player', e.target.value)}
                  placeholder="e.g. Lionel Messi, Patrick Vieira"
                />
              </label>

              <div className="row2">
                <label>
                  Overall Strength / Rating
                  <input
                    type="number"
                    inputMode="numeric"
                    min="50"
                    max="115"
                    value={f.star_player_rating}
                    onChange={(e) => set('star_player_rating', e.target.value)}
                    placeholder="e.g. 105"
                  />
                </label>

                <label>
                  Player Playstyle
                  <select
                    value={f.star_player_playstyle}
                    onChange={(e) => set('star_player_playstyle', e.target.value)}
                  >
                    <option value="">Select playstyle</option>
                    {PLAYER_PLAYSTYLES.map((ps) => (
                      <option key={ps} value={ps}>
                        {ps}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                Player card photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setStarPlayerFile(e.target.files[0])
                  }}
                />
              </label>

              {starPlayerFile && (
                <div className="star-player-preview">
                  <img src={URL.createObjectURL(starPlayerFile)} alt="Star player preview" />
                  <div style={{ flex: 1 }}>
                    <b style={{ display: 'block', fontSize: 13, color: 'var(--ink)' }}>{starPlayerFile.name}</b>
                    <span style={{ fontSize: 12, color: '#4ade80' }}>✓ Photo attached</span>
                  </div>
                  <button
                    type="button"
                    className="del"
                    style={{ color: 'var(--pink)', cursor: 'pointer', padding: '4px 8px' }}
                    onClick={() => setStarPlayerFile(null)}
                  >
                    Remove
                  </button>
                </div>
              )}
            </fieldset>

            <label>Your WhatsApp<input type="tel" inputMode="tel" value={f.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="0712 345 678" /></label>
            <label>Details<textarea rows={3} maxLength={400} value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="Coins, GP, how the account is linked" /></label>
            <label>Screenshots (up to 4)<input type="file" accept="image/*" multiple onChange={(e) => setFiles([...files, ...e.target.files].slice(0, 4))} /></label>
            <div className="thumbs">{files.map((x, n) => <div key={n}><img src={URL.createObjectURL(x)} alt="" /><button type="button" aria-label="Remove" onClick={() => setFiles(files.filter((_, i) => i !== n))}>×</button></div>)}</div>
            {err && <div className="err">{err}</div>}
            <button className="btn" onClick={submit} disabled={busy}>{busy ? 'Publishing…' : 'Publish squad'}</button>
          </>}

          {step === 'live' && <div className="ok"><h3>Your squad is live!</h3><p style={{ margin: 0 }}>Buyers can now find it and chat with you on WhatsApp.</p><button className="btn" onClick={onClose}>Done</button></div>}
        </div>
      )}
    </Modal>
  )
}

const LABEL = { pending_payment: 'Awaiting payment', active: 'Live', sold: 'Sold' }
export function MyListings({ session, onClose, onPay, onChange }) {
  const [rows, setRows] = useState([])
  const phone = session?.user?.user_metadata?.phone || session?.user?.email?.split('@')[0]?.replace('seller_', '') || ''
  const load = async () => {
    const { data } = await supabase.from('listings').select('*').eq('seller_id', session.user.id).order('created_at', { ascending: false })
    setRows(data || [])
  }
  useEffect(() => { load() }, [])
  const sold = async (id) => { await supabase.rpc('mark_sold', { p_id: id }); load(); onChange() }
  const activate = async (id) => { await supabase.from('listings').update({ status: 'active' }).eq('id', id); load(); onChange() }
  const del = async (id) => { if (confirm('Delete this squad?')) { await supabase.from('listings').delete().eq('id', id); load(); onChange() } }
  const signout = async () => { await supabase.auth.signOut(); onClose() }

  return (
    <Modal title="My squads" onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--line)' }}>
        <small style={{ color: 'var(--mute)' }}>Signed in as: <b>{phone}</b></small>
        <button className="del" style={{ textDecoration: 'none', color: 'var(--pink)', cursor: 'pointer' }} onClick={signout}>Sign out</button>
      </div>
      {rows.length === 0 && <p style={{ margin: 0 }}>You have not posted any squads yet.</p>}
      {rows.map((l) => (
        <div className="my" key={l.id}>
          <div><b>{l.title}</b><span className={'st ' + l.status}>{LABEL[l.status]}</span><small>{PLAYSTYLES[l.playstyle][0]} · Strength: {l.strength}{(l.coins || 0) > 0 ? ` · 🪙 ${Number(l.coins).toLocaleString()} Coins` : ''}</small></div>
          <div className="acts">
            {l.status === 'pending_payment' && <button className="pay" onClick={() => activate(l.id)}>Activate</button>}{' '}
            {l.status === 'active' && <button onClick={() => sold(l.id)}>Mark sold</button>}{' '}
            <button onClick={() => del(l.id)}>Delete</button>
          </div>
        </div>
      ))}
    </Modal>
  )
}
