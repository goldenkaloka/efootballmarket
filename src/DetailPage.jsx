import { useEffect, useState } from 'react'
import { PLAYSTYLES, KITS, waLink } from './lib'
import { Icon, P, Pitch, kitBg, WhatsAppIcon } from './ui'

export function DetailPage({ l, saved, onSave, onBack, allSquads = [], onOpenSquad }) {
  const images = l.images || []
  // Selected view: -1 for Tactical Pitch, or 0..n for screenshot images
  const [selectedMedia, setSelectedMedia] = useState(images.length > 0 ? 0 : -1)
  const [copied, setCopied] = useState(false)
  const [lightbox, setLightbox] = useState(false)

  const [playstyleName, playstyleDesc] = PLAYSTYLES[l.playstyle] || ['Custom', '']
  const kitInfo = KITS[l.kit] || KITS[5]

  // Filter 4 similar squads (excluding current squad)
  const similar = allSquads
    .filter((s) => s.id !== l.id && (s.playstyle === l.playstyle || s.platform === l.platform))
    .slice(0, 4)

  const shareSquad = () => {
    const url = window.location.href
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  // Handle keyboard shortcuts in fullscreen lightbox
  useEffect(() => {
    if (!lightbox) return
    const handleKey = (e) => {
      if (e.key === 'Escape') setLightbox(false)
      else if (e.key === 'ArrowLeft' && images.length > 1) {
        setSelectedMedia((cur) => (cur <= 0 ? images.length - 1 : cur - 1))
      } else if (e.key === 'ArrowRight' && images.length > 1) {
        setSelectedMedia((cur) => (cur >= images.length - 1 ? 0 : cur + 1))
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [lightbox, images.length])

  return (
    <div className="detail-page">
      {/* Top bar */}
      <div className="detail-nav">
        <button className="back-btn" onClick={onBack}>
          <Icon d={P.arrowLeft} /> Back to all squads
        </button>

        <div className="detail-nav-actions">
          <button className="pill" type="button" onClick={shareSquad}>
            <Icon d={copied ? P.check : P.share} /> {copied ? 'Link copied!' : 'Share squad'}
          </button>
          <button
            className="heart"
            style={{ position: 'static' }}
            aria-pressed={saved}
            aria-label="Save squad"
            onClick={() => onSave(l.id)}
          >
            <Icon d={P.heart} />
          </button>
        </div>
      </div>

      {/* Main 2-column layout */}
      <div className="detail-layout">
        {/* Left column: Visuals & details */}
        <div className="detail-main-col">
          {/* Main Media Preview */}
          <div
            className={'detail-main-img' + (selectedMedia >= 0 ? ' clickable' : '')}
            onClick={() => selectedMedia >= 0 && setLightbox(true)}
            title={selectedMedia >= 0 ? 'Click to inspect full screenshot' : undefined}
          >
            {selectedMedia === -1 ? (
              <div className="cover k" style={{ ...kitBg(l.kit), width: '100%', height: '100%' }}>
                <Pitch formation={l.formation} />
                <span className="str">
                  <small>STRENGTH</small>
                  {l.strength}
                </span>
              </div>
            ) : (
              <>
                <img src={images[selectedMedia]} alt={l.title} />
                <button
                  type="button"
                  className="detail-zoom-badge"
                  onClick={(e) => { e.stopPropagation(); setLightbox(true) }}
                  aria-label="Enlarge screenshot"
                >
                  <Icon d={P.zoomIn} /> Enlarge
                </button>
              </>
            )}
            <span className="bargain-corner-tag">Price Negotiable</span>
          </div>

          {/* Thumbnails row */}
          <div className="detail-thumbs">
            {/* Tactical Pitch Option */}
            <button
              type="button"
              className={'detail-thumb' + (selectedMedia === -1 ? ' active' : '')}
              onClick={() => setSelectedMedia(-1)}
              title="Formation tactical board"
            >
              <div className="cover k" style={{ ...kitBg(l.kit), width: '100%', height: '100%' }}>
                <Pitch formation={l.formation} />
              </div>
            </button>

            {/* Screenshots */}
            {images.map((u, idx) => (
              <button
                key={u}
                type="button"
                className={'detail-thumb' + (selectedMedia === idx ? ' active' : '')}
                onClick={() => setSelectedMedia(idx)}
              >
                <img src={u} alt={`Screenshot ${idx + 1}`} />
              </button>
            ))}
          </div>

          {/* Dedicated eFootball Card Showcase for Star Player */}
          {l.star_player && (
            <div className="star-card-showcase">
              <div className="star-card-header">
                <span className="star-badge-glow">★ KEY SQUAD BOOSTER</span>
                <span className="star-card-sub">eFootball Special Edition</span>
              </div>
              <div className="star-card-body">
                <div className="star-card-avatar-box">
                  {l.star_player_image ? (
                    <img src={l.star_player_image} className="star-card-avatar" alt={l.star_player} />
                  ) : (
                    <div className="star-card-placeholder">
                      <span className="star-big-icon">★</span>
                      <small>SPECIAL CARD</small>
                    </div>
                  )}
                  {l.star_player_rating && (
                    <div className="star-card-ovr-tag">
                      <small>OVR</small>
                      <b>{l.star_player_rating}</b>
                    </div>
                  )}
                </div>

                <div className="star-card-meta-box">
                  <div className="star-card-name">{l.star_player}</div>
                  <div className="star-card-pills">
                    {l.star_player_rating && (
                      <span className="star-pill rating">⚡ {l.star_player_rating} Max Rating</span>
                    )}
                    {l.star_player_playstyle && (
                      <span className="star-pill style">🎯 {l.star_player_playstyle}</span>
                    )}
                    <span className="star-pill squad">Formation: {l.formation}</span>
                  </div>
                  <p className="star-card-desc">
                    Key centerpiece player leading this squad's tactical play. Ask the seller for their skill points training build on WhatsApp.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Squad Specifications Grid */}
          <div className="detail-card">
            <h3>Squad Assets & Specs</h3>
            <div className="spec-grid">
              <div className="spec-item accent">
                <small>Team Strength</small>
                <b>{l.strength}</b>
              </div>
              <div className="spec-item coin-spec">
                <small>eFootball Coins</small>
                <b>🪙 {Number(l.coins || 0).toLocaleString()}</b>
              </div>
              <div className="spec-item gp-spec">
                <small>GP Balance</small>
                <b>⚡ {Number(l.gp || 0).toLocaleString()}</b>
              </div>
              <div className="spec-item">
                <small>Formation</small>
                <b>{l.formation}</b>
              </div>
              <div className="spec-item">
                <small>Platform</small>
                <b>{l.platform}</b>
              </div>
              <div className="spec-item">
                <small>Playstyle</small>
                <b>{playstyleName}</b>
              </div>
              {l.star_player_rating && (
                <div className="spec-item star-spec">
                  <small>Star Rating</small>
                  <b>★ {l.star_player_rating}</b>
                </div>
              )}
              {l.star_player_playstyle && (
                <div className="spec-item">
                  <small>Player Playstyle</small>
                  <b>{l.star_player_playstyle}</b>
                </div>
              )}
            </div>

            {/* Player Types Included */}
            {l.player_types?.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <small style={{ color: 'var(--mute)', display: 'block', marginBottom: 6, fontSize: 12 }}>
                  SPECIAL PLAYER TYPES IN THIS SQUAD
                </small>
                <div className="chips">
                  {l.player_types.map((type) => (
                    <span key={type} className="ptag" style={{ fontSize: 13, padding: '4px 10px' }}>
                      ★ {type}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Seller Description */}
          <div className="detail-card">
            <h3>About This Squad</h3>
            <p className="detail-desc">{l.description || 'No additional notes provided by seller.'}</p>
          </div>

          {/* Safe Trading Tips */}
          <div className="detail-safety-box">
            <div className="safety-title">
              <Icon d={P.shield} />
              <b>Direct Trading & Safety Tips</b>
            </div>
            <ul>
              <li>Discuss price and terms directly with the seller on WhatsApp (Maongezi yanaruhusiwa).</li>
              <li>Ask for a short live screen recording of the squad inside eFootball to confirm coins, GP, and players.</li>
              <li>Verify the Konami ID is transferrable and change login credentials during the deal.</li>
            </ul>
          </div>
        </div>

        {/* Right column: Action & contact card */}
        <aside className="detail-sidebar">
          <div className="detail-card sticky-card">
            <div>
              <div className="chips" style={{ marginBottom: 8 }}>
                <span className="play">{playstyleName}</span>
                <span>{l.formation}</span>
                <span>{l.platform}</span>
              </div>
              <h1 className="detail-title">{l.title}</h1>
              <p style={{ margin: '6px 0 0', color: 'var(--mute)', fontSize: 14 }}>{playstyleDesc}</p>
            </div>

            {/* Price Negotiable callout */}
            <div className="bargain-callout">
              <div className="bargain-pill">Price Negotiable</div>
              <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--ink)' }}>
                Connect directly with the seller to discuss terms and finalize the deal.
              </p>
            </div>

            {/* Key stats row */}
            <div className="sidebar-assets">
              <div className="sb-stat">
                <small>Strength</small>
                <b>{l.strength}</b>
              </div>
              <div className="sb-stat">
                <small>Coins</small>
                <b>🪙 {Number(l.coins || 0).toLocaleString()}</b>
              </div>
              <div className="sb-stat">
                <small>GP</small>
                <b>⚡ {Number(l.gp || 0).toLocaleString()}</b>
              </div>
            </div>

            <a className="btn wa" style={{ fontSize: 16 }} href={waLink(l)} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon size={22} /> Contact on WhatsApp
            </a>

            <div className="seller-box">
              <small>SELLER WHATSAPP</small>
              <div className="seller-phone">{l.whatsapp}</div>
              <small style={{ color: '#4ade80', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Icon d={P.bolt} /> Verified active seller
              </small>
            </div>
          </div>
        </aside>
      </div>

      {/* Similar Squads */}
      {similar.length > 0 && (
        <section className="detail-similar-section">
          <div className="sec">
            <h2>Similar squads to check out</h2>
            <span>{similar.length} recommendations</span>
          </div>
          <div className="grid">
            {similar.map((s) => {
              const simImg = s.images?.[0]
              return (
                <article
                  key={s.id}
                  className="card"
                  tabIndex={0}
                  onClick={() => onOpenSquad(s)}
                  onKeyDown={(e) => e.key === 'Enter' && onOpenSquad(s)}
                >
                  <div className={'cover' + (simImg ? '' : ' k')} style={simImg ? undefined : kitBg(s.kit)}>
                    {simImg ? <img src={simImg} alt="" /> : <Pitch formation={s.formation} />}
                    <span className="card-platform-tag">{s.platform}</span>
                  </div>
                  <div className="cb">
                    <div className="card-quick-stats">
                      <div className="c-stat strength">
                        <small>STRENGTH</small>
                        <b>⚡ {s.strength}</b>
                      </div>
                      <div className={'c-stat coins' + ((s.coins || 0) > 0 ? ' gold' : '')}>
                        <small>COINS</small>
                        <b>🪙 {(s.coins || 0) > 0 ? Number(s.coins).toLocaleString() : '0'}</b>
                      </div>
                    </div>
                    <h3>{s.title}</h3>
                    <div className="card-meta">
                      <span>{PLAYSTYLES[s.playstyle]?.[0] || s.playstyle}</span>
                      <span>{s.formation}</span>
                    </div>
                    <div className="bargain-row">
                      <span className="bargain-tag">Negotiable</span>
                      <span className="mini" style={{ padding: '6px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <WhatsAppIcon size={14} /> Contact
                      </span>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}

      {/* Fullscreen Screenshot Lightbox */}
      {lightbox && selectedMedia >= 0 && images[selectedMedia] && (
        <div className="lightbox-overlay" onClick={() => setLightbox(false)}>
          <div className="lightbox-container" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-topbar">
              <span className="lightbox-count">
                Screenshot {selectedMedia + 1} of {images.length}
              </span>
              <button
                type="button"
                className="lightbox-close-btn"
                onClick={() => setLightbox(false)}
                aria-label="Close fullscreen"
              >
                <Icon d={P.close} />
              </button>
            </div>

            <div className="lightbox-viewport">
              <img src={images[selectedMedia]} alt={`Screenshot ${selectedMedia + 1}`} />

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    className="lightbox-nav-arrow prev"
                    onClick={() => setSelectedMedia((cur) => (cur <= 0 ? images.length - 1 : cur - 1))}
                    aria-label="Previous screenshot"
                  >
                    <Icon d={P.chevronLeft} />
                  </button>
                  <button
                    type="button"
                    className="lightbox-nav-arrow next"
                    onClick={() => setSelectedMedia((cur) => (cur >= images.length - 1 ? 0 : cur + 1))}
                    aria-label="Next screenshot"
                  >
                    <Icon d={P.chevronRight} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
