import { useEffect, useMemo, useState } from 'react'
import { supabase, PLAYSTYLES, waLink } from './lib'
import { Icon, P, Pitch, kitBg, WhatsAppIcon } from './ui'
import { SellDialog, MyListings } from './Sell'
import { DetailPage } from './DetailPage'

const CATS = [
  ['all', 'All Squads'],
  ['s3200', 'Elite (3200+)'],
  ['s3100', '3100 – 3199'],
  ['s3000', '3000 – 3099'],
  ['sUnder', 'Starter (<3000)'],
  ['Android', 'Android'],
  ['iOS', 'iOS']
]

const test = (l, c) => ({
  all: true,
  s3200: (l.strength || 0) >= 3200,
  s3100: (l.strength || 0) >= 3100 && (l.strength || 0) < 3200,
  s3000: (l.strength || 0) >= 3000 && (l.strength || 0) < 3100,
  sUnder: (l.strength || 0) < 3000,
  Android: l.platform === 'Android',
  iOS: l.platform === 'iOS'
})[c]

// Fair Discovery algorithm: Rotates squads every 4 hours so all sellers get equal top impressions
function fairScore(id) {
  const windowId = Math.floor(Date.now() / (1000 * 60 * 60 * 4))
  let hash = 0
  const s = String(id) + '-' + windowId
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function Card({ l, saved, onSave, onOpen }) {
  const img = l.images?.[0]
  return (
    <article className="card" tabIndex={0} onClick={() => onOpen(l)} onKeyDown={(e) => e.key === 'Enter' && onOpen(l)}>
      <div className={'cover' + (img ? '' : ' k')} style={img ? undefined : kitBg(l.kit)}>
        {img ? <img src={img} alt="" loading="lazy" /> : <Pitch formation={l.formation} />}
        <span className="card-platform-tag">{l.platform}</span>
        <button className="heart" aria-pressed={saved} aria-label="Save squad" onClick={(e) => { e.stopPropagation(); onSave(l.id) }}>
          <Icon d={P.heart} />
        </button>
      </div>
      <div className="cb">
        {/* Instant Eye-Catch: Strength & Coins Header */}
        <div className="card-quick-stats">
          <div className="c-stat strength">
            <small>STRENGTH</small>
            <b>⚡ {l.strength}</b>
          </div>
          <div className={'c-stat coins' + ((l.coins || 0) > 0 ? ' gold' : '')}>
            <small>COINS</small>
            <b>🪙 {(l.coins || 0) > 0 ? Number(l.coins).toLocaleString() : '0'}</b>
          </div>
        </div>

        <h3>{l.title}</h3>

        {l.star_player ? (
          <div className="card-star-row">
            {l.star_player_image && (
              <img src={l.star_player_image} className="card-star-thumb" alt="" />
            )}
            <div className="card-star-info">
              <span className="card-feat gold">
                ★ {l.star_player}
                {l.star_player_rating ? ` (${l.star_player_rating})` : ''}
              </span>
              {l.star_player_playstyle && (
                <small className="card-star-style">{l.star_player_playstyle}</small>
              )}
            </div>
          </div>
        ) : l.player_types?.length > 0 ? (
          <div className="card-feat">{l.player_types.slice(0, 2).join(' · ')}</div>
        ) : (
          <div className="card-feat" style={{ opacity: 0.55 }}>Direct Deal</div>
        )}

        <div className="card-meta">
          <span>{PLAYSTYLES[l.playstyle]?.[0] || l.playstyle}</span>
          <span>{l.formation}</span>
        </div>

        <div className="card-bottom">
          <span className="card-neg">Negotiable</span>
          <a className="card-btn" href={waLink(l)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
            <WhatsAppIcon size={14} />Contact
          </a>
        </div>
      </div>
    </article>
  )
}

export default function App() {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([]), [session, setSession] = useState(null)
  const [cat, setCat] = useState('all'), [ps, setPs] = useState(''), [q, setQ] = useState(''), [sort, setSort] = useState('fair')
  const [wish, setWish] = useState(() => { try { return JSON.parse(localStorage.getItem('efm_wish')) || [] } catch { return [] } })
  const [open, setOpen] = useState(null), [sell, setSell] = useState(false), [mine, setMine] = useState(false), [resume, setResume] = useState(null)

  const load = async () => {
    try {
      const { data } = await supabase.from('listings').select('*').eq('status', 'active').order('created_at', { ascending: false })
      if (data) setItems(data)
    } finally {
      setTimeout(() => setLoading(false), 600)
    }
  }
  useEffect(() => {
    load()
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  useEffect(() => localStorage.setItem('efm_wish', JSON.stringify(wish)), [wish])

  // Sync open squad with URL hash for back/forward navigation and link sharing
  useEffect(() => {
    const handleHash = async () => {
      const hash = window.location.hash
      if (hash.startsWith('#squad-')) {
        const id = hash.replace('#squad-', '')
        const found = items.find((x) => x.id === id)
        if (found) {
          setOpen(found)
        } else if (id) {
          const { data } = await supabase.from('listings').select('*').eq('id', id).single()
          if (data) setOpen(data)
        }
      } else {
        setOpen(null)
      }
    }
    handleHash()
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [items])

  const openSquad = (l) => {
    setOpen(l)
    window.location.hash = 'squad-' + l.id
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const closeSquad = () => {
    setOpen(null)
    window.location.hash = ''
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const save = (id) => setWish((w) => (w.includes(id) ? w.filter((x) => x !== id) : [...w, id]))
  const go = () => {
    const el = document.getElementById('shop')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  const list = useMemo(() => {
    const s = q.toLowerCase().trim()
    return items
      .filter((l) => (cat === 'wish' ? wish.includes(l.id) : test(l, cat)) && (!ps || l.playstyle === ps) &&
        (!s || `${l.title} ${l.description} ${l.platform} ${l.formation} ${l.star_player || ''} ${(l.player_types || []).join(' ')} ${PLAYSTYLES[l.playstyle]?.[0] || ''}`.toLowerCase().includes(s)))
      .sort((a, b) =>
        sort === 'fair' ? fairScore(b.id) - fairScore(a.id)
        : sort === 'str' ? (b.strength || 0) - (a.strength || 0)
        : sort === 'coins' ? (b.coins || 0) - (a.coins || 0)
        : sort === 'gp' ? (b.gp || 0) - (a.gp || 0)
        : new Date(b.created_at) - new Date(a.created_at)
      )
  }, [items, cat, ps, q, sort, wish])
  const title = cat === 'wish' ? 'Saved squads' : cat === 'all' ? 'All Squads' : CATS.find((c) => c[0] === cat)?.[1] || 'Squads'

  return (
    <>
      {loading && (
        <div className="loading-screen">
          <div className="loading-box">
            <img src="/logo.png" className="rotating-logo" alt="Loading eFootball Market" />
            <div className="loading-brand">
              <span>eFootball</span> <em>Market</em>
            </div>
            <div className="loading-line"></div>
          </div>
        </div>
      )}

      <div className="wrap">
        <div className="hd">
          <div className="logo" style={{ cursor: 'pointer' }} onClick={closeSquad} title="Go to home feed">
            <div className="logo-badge">
              <img src="/logo.png" alt="Logo" />
            </div>
            <span>eFootball<br /><em>Market</em></span>
          </div>
          <form className="search" onSubmit={(e) => { e.preventDefault(); if (open) closeSquad(); go() }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder="Search squads, playstyles, formations, epics..." aria-label="Search" />
            <button type="submit">Search</button>
          </form>
          <button className="sv" aria-label="Saved squads" onClick={() => { if (open) setOpen(null); setCat(cat === 'wish' ? 'all' : 'wish'); go() }}>
            <Icon d={P.heart} /><b>{wish.length || ''}</b>
          </button>
          {session ? (
            <button className="btn ghost" onClick={() => setMine(true)}>My squads</button>
          ) : (
            <button className="btn ghost" onClick={() => setSell(true)}>Seller login</button>
          )}
          <button className="btn" onClick={() => { setResume(null); setSell(true) }}>Sell squad</button>
        </div>

        {open ? (
          <DetailPage
            l={open}
            saved={wish.includes(open.id)}
            onSave={save}
            onBack={closeSquad}
            allSquads={items}
            onOpenSquad={openSquad}
          />
        ) : (
          <>
            <section className="hero">
              <div className="hl">
                <h1>Buy your<br /><em>dream squad</em></h1>
                <p>Browse eFootball squads by team strength, player types and coins. Chat and negotiate directly on WhatsApp.</p>
                <div className="acts">
                  <a className="btn ghost" href="#shop">Browse squads</a>
                  <button className="btn" onClick={() => { setResume(null); setSell(true) }}>Sell your squad</button>
                </div>
                <div className="stats">
                  <div><b>{items.length}</b>squads listed</div>
                  <div><b>Fair</b>equal seller views</div>
                  <div><b>WhatsApp</b>instant deal</div>
                </div>
              </div>
            </section>

            <nav className="pills" aria-label="Filter squads by strength">
              {CATS.map(([k, n]) => <button key={k} className="pill" aria-pressed={cat === k} onClick={() => { setCat(k); go() }}>{n}<small>{items.filter((l) => test(l, k)).length}</small></button>)}
            </nav>
            <nav className="pills" aria-label="Filter by playstyle">
              <button className="pill" aria-pressed={!ps} onClick={() => setPs('')}>Any playstyle</button>
              {Object.entries(PLAYSTYLES).map(([k, [n]]) => <button key={k} className="pill" aria-pressed={ps === k} onClick={() => setPs(ps === k ? '' : k)}>{n}<small>{items.filter((l) => l.playstyle === k).length}</small></button>)}
            </nav>

            <div className="trust">
              <div><Icon d={P.bolt} />Direct bargaining</div>
              <div><Icon d={P.shield} />Verified accounts</div>
              <div><Icon d={P.chat} />Talk on WhatsApp</div>
            </div>

            <section id="shop">
              <div className="sec">
                <h2>{title}</h2><span>{list.length} {list.length === 1 ? 'squad' : 'squads'}</span>
                {sort === 'fair' && <span className="fair-badge">⚡ Fair Discovery Active</span>}
                <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
                  <option value="fair">Fair Discovery (Rotating)</option>
                  <option value="str">Highest Strength</option>
                  <option value="coins">Most Coins</option>
                  <option value="gp">Most GP</option>
                  <option value="new">Newest First</option>
                </select>
              </div>
              <div className="grid">
                {list.length ? (
                  list.map((l) => <Card key={l.id} l={l} saved={wish.includes(l.id)} onSave={save} onOpen={openSquad} />)
                ) : (
                  <div className="empty">
                    {cat === 'wish'
                      ? 'You have not saved any squads yet. Tap the heart on a card to save it.'
                      : 'No squads match your search. Clear the search or try another filter.'}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
      <footer>
        <div className="wrap">
          <b>Stay safe.</b> Ask the seller for a live video of the squad, check the account details, and only pay in a way you trust. Sellers pay a listing fee, but the marketplace does not handle the sale between buyer and seller.
        </div>
      </footer>

      {sell && <SellDialog session={session} resume={resume} onClose={() => setSell(false)} onLive={load} />}
      {mine && <MyListings session={session} onClose={() => setMine(false)} onChange={load} onPay={(l) => { setMine(false); setResume(l); setSell(true) }} />}
    </>
  )
}
