import { useState, type ReactNode } from 'react'
import { SingleCycleDatapath, type PartId } from '../datapath/SingleCycleDatapath'
import { COLORS, type Look } from '../datapath/shapes'

/** Everything one "add instruction X to the single-cycle datapath" page needs. */
export type ExtensionSpec = {
  asm: string // e.g. "jr rs"
  title: string // page heading
  crumb: string // where it was asked
  lede: ReactNode // format + what it does
  active: PartId[] // base-datapath parts this instruction uses
  hidden?: PartId[] // base parts that are replaced in the overlay
  overlay?: ReactNode // newly added hardware (drawn on top)
  steps: ReactNode[] // the explanation
  controls: [string, string, boolean?][] // [signal, value, isNew]
  notes?: ReactNode[] // alternatives, traps
  pyq: ReactNode[] // past-paper references
}

export function ExtensionPage({ spec }: { spec: ExtensionSpec }) {
  const [fade, setFade] = useState(true)
  const active = new Set(spec.active)
  const hidden = new Set(spec.hidden ?? [])
  const look = (id: PartId): Look => {
    if (hidden.has(id)) return 'hidden'
    if (active.has(id)) return 'chosen'
    return fade ? 'faded' : 'normal'
  }

  return (
    <div className="page">
      <header className="page-head">
        <p className="crumb">{spec.crumb}</p>
        <h1>{spec.title}</h1>
        <p className="lede">{spec.lede}</p>
      </header>

      <div className="layout">
        <section className="diagram-col">
          <div className="diagram-card">
            <SingleCycleDatapath look={look} overlay={spec.overlay} />
          </div>
          <div className="legend">
            {spec.overlay && <span><i style={{ background: COLORS.added }} />newly added hardware</span>}
            <span><i style={{ background: COLORS.chosen }} />used by <code>{spec.asm}</code></span>
            {fade && <span><i style={{ background: COLORS.faded }} />not used</span>}
            <label className="tog inline"><input type="checkbox" checked={fade} onChange={(e) => setFade(e.target.checked)} /> fade unused parts</label>
          </div>

          <h2>What to add, and why</h2>
          <ol className="plain-steps">
            {spec.steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>

          {spec.notes && (
            <div className="exam">
              <h3>Alternatives and traps</h3>
              <ul>{spec.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
            </div>
          )}
        </section>

        <aside className="panel">
          <div className="panel-block">
            <h3>Control signals for <code>{spec.asm}</code></h3>
            <div className="ctrl-row">
              {spec.controls.map(([n, v, isNew]) => (
                <span key={n} className={isNew ? 'new' : ''}>{n} <b>{v}</b></span>
              ))}
            </div>
            <p className="tiny">Green = new or widened signal. X = doesn't matter. Every other instruction gets 0 on a new 1-bit signal (or its old value on a widened one).</p>
          </div>
          <div className="panel-block">
            <h3>In past papers</h3>
            <ul className="pyq">{spec.pyq.map((p, i) => <li key={i}>{p}</li>)}</ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
