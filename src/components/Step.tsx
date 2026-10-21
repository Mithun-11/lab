import type { ReactNode } from 'react'

/** A numbered, clickable explanation step. Clicking selects it (or clears it if already selected). */
export function Step(props: { n: number; cur: number | null; set: (n: number | null) => void; title: string; children: ReactNode }) {
  const { n, cur, set, title, children } = props
  const on = cur === n
  return (
    <li className={'step' + (on ? ' on' : '')} onClick={() => set(on ? null : n)}>
      <div className="step-head">
        <span className="num">{n}</span>
        <span>{title}</span>
      </div>
      <div className="step-body">{children}</div>
    </li>
  )
}
