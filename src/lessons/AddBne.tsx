import { useState } from 'react'
import { Tex } from '../components/Tex'
import { SingleCycleDatapath, ctrlEdge, type PartId } from '../datapath/SingleCycleDatapath'
import { AndGate, COLORS, Label, Mux, NotGate, OrGate, Wire, type Look } from '../datapath/shapes'

type Design = 'gates' | 'mux'
type Scen = 'beqT' | 'beqN' | 'bneT' | 'bneN' | 'other'

const SCENS: { id: Scen; label: string; sub: string }[] = [
  { id: 'beqT', label: 'beq, equal', sub: '5 vs 5 → branch' },
  { id: 'beqN', label: 'beq, not equal', sub: '5 vs 6 → PC + 4' },
  { id: 'bneT', label: 'bne, not equal', sub: '5 vs 6 → branch' },
  { id: 'bneN', label: 'bne, equal', sub: '5 vs 5 → PC + 4' },
  { id: 'other', label: 'add / lw / sw …', sub: 'not a branch' },
]

// Parts of the base slide-32 datapath that matter for the branch decision.
const FOCUS = new Set<PartId>([
  'pc', 'imem', 'pcout', 'pcToAdd', 'four', 'addpc', 'pc4main', 'pc4ToBmux', 'pc4ToBadd', 'instrOut', 'instrBus',
  'imm', 'signext', 'sext', 'sl2b', 'sl2bout', 'badd', 'btarget', 'bmux', 'bmuxout', 'jmux', 'nextpc',
  'control', 'instrCtrl', 'ctrl_Branch', 'and', 'zero', 'pcsrc',
  'rs', 'rt', 'regs', 'rd1', 'rd2', 'alusrc', 'aluB', 'alu', 'aluctl', 'aluctlOut', 'ctrl_ALUOp',
])
const COMPARE: PartId[] = ['rs', 'rt', 'regs', 'rd1', 'rd2', 'alusrc', 'aluB', 'alu']
const PC4_PATH: PartId[] = ['pc', 'pcToAdd', 'four', 'addpc', 'pc4main', 'pc4ToBmux', 'bmux', 'bmuxout', 'jmux', 'nextpc']
const TARGET_PATH: PartId[] = [
  'pc', 'pcToAdd', 'four', 'addpc', 'pc4main', 'pc4ToBadd', 'instrOut', 'instrBus', 'imm', 'signext', 'sext',
  'sl2b', 'sl2bout', 'badd', 'btarget', 'bmux', 'bmuxout', 'jmux', 'nextpc',
]

function signals(s: Scen) {
  const Branch = s === 'beqT' || s === 'beqN' ? 1 : 0
  const BranchNE = s === 'bneT' || s === 'bneN' ? 1 : 0
  const Zero = s === 'beqT' || s === 'bneN' ? 1 : s === 'other' ? null : 0
  const z = Zero ?? 0
  const and1 = Branch & z
  const notZ = 1 - z
  const and2 = BranchNE & notZ
  const pcsrc = and1 | and2
  return { Branch, BranchNE, Zero, notZ, and1, and2, pcsrc }
}

export function AddBne() {
  const [design, setDesign] = useState<Design>('gates')
  const [scen, setScen] = useState<Scen>('bneT')
  const [fade, setFade] = useState(true)

  const v = signals(scen)
  const branchy = scen !== 'other'
  const chosen = new Set<PartId>([...(v.pcsrc ? TARGET_PATH : PC4_PATH), ...(branchy ? COMPARE : [])])

  // Wires driven by a signal: orange when it carries a 1.
  const on = (bit: number | null): Look => (bit ? 'chosen' : 'added')
  const ctrlOn = (bit: number | null): Look => (bit ? 'chosen' : 'normal')

  // Base datapath look. The branch-decision parts are redrawn in the overlay for each design.
  const look = (id: PartId): Look => {
    if (id === 'pcsrc') return 'hidden'
    if (design === 'mux' && (id === 'and' || id === 'zero' || id === 'ctrl_Branch')) return 'hidden'
    if (id === 'ctrl_Branch') return ctrlOn(v.Branch)
    if (id === 'zero') return ctrlOn(v.Zero)
    if (id === 'and') return v.and1 ? 'chosen' : 'normal'
    if (chosen.has(id)) return 'chosen'
    if (fade && !FOCUS.has(id)) return 'faded'
    return 'normal'
  }

  const overlay =
    design === 'gates' ? (
      <g>
        {/* not-Zero: tap Zero, invert, run up into the new AND */}
        <Wire look={on(v.Zero === null ? 0 : v.Zero)} kind="ctrl" arrow={false} pts={[[1140, 470], [1152, 470]]} dots={[[1140, 470]]} />
        <NotGate x={1152} y={470} look={'added'} />
        <Wire look={on(v.Zero === null ? 0 : v.notZ)} kind="ctrl" arrow={false} pts={[[1186, 470], [1238, 470], [1238, 308], [1250, 308]]} />
        {/* BranchNE: new control output */}
        <Wire look={on(v.BranchNE)} kind="ctrl" arrow={false} pts={[[1182, 288], [1250, 288]]} />
        <Label x={1182} y={278} look="added" size={20} bold>BranchNE</Label>
        <AndGate x={1250} y={278} w={46} h={40} look="added" />
        {/* old AND (beq) output → OR */}
        <Wire look={on(v.and1)} kind="ctrl" arrow={false} pts={[[1222, 347], [1308, 347], [1308, 338], [1323, 338]]} />
        {/* new AND (bne) output → OR */}
        <Wire look={on(v.and2)} kind="ctrl" arrow={false} pts={[[1296, 298], [1306, 298], [1306, 312], [1323, 312]]} />
        <OrGate x={1318} y={300} w={46} h={50} look="added" />
        {/* OR output = PCSrc → branch mux select */}
        <Wire look={on(v.pcsrc)} kind="ctrl" arrow={false} pts={[[1364, 325], [1380, 325], [1380, 266], [1296, 266], [1296, 260]]} />
        <Label x={1386} y={300} look="added" size={19} bold>PCSrc</Label>
      </g>
    ) : (
      <g>
        {/* Branch keeps its control line but now goes to mux input 1 */}
        <Wire look={ctrlOn(v.Branch)} kind="ctrl" arrow={false} pts={[ctrlEdge(370), [1180, 370], [1180, 380], [1200, 380]]} />
        {/* BranchNE: new control output → mux input 0 */}
        <Wire look={on(v.BranchNE)} kind="ctrl" arrow={false} pts={[[1158, 268], [1158, 295], [1200, 295]]} />
        <Label x={1146} y={262} look="added" size={20} bold>BranchNE</Label>
        {/* Zero → mux select */}
        <Wire look={on(v.Zero)} kind="ctrl" arrow={false} pts={[[1118, 706], [1140, 706], [1140, 420], [1222, 420], [1222, 398]]} />
        <Label x={1110} y={712} look="normal" kind="ctrl" anchor="end">Zero</Label>
        <Label x={1232} y={432} look="added" size={19}>select = Zero</Label>
        <Mux x={1200} y={278} w={44} h={120} top="0" bottom="1" look="added" />
        {/* mux output = PCSrc */}
        <Wire look={on(v.pcsrc)} kind="ctrl" arrow={false} pts={[[1244, 338], [1296, 338], [1296, 260]]} />
        <Label x={1304} y={318} look="added" size={19} bold>PCSrc</Label>
      </g>
    )

  const zeroTxt = v.Zero === null ? 'X' : String(v.Zero)

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="crumb">Extending the single-cycle datapath · not on the slides · asked 2022-23 Q3, 2018-19 Q1(a), 2012-13 Q2</p>
          <h1>Adding <code>bne</code> (branch if not equal)</h1>
          <p className="lede">
            <code>bne rs, rt, label</code> has the same I-format as <code>beq</code> (op = 5 instead of 4). The branch target is computed
            exactly the same way. Only the <b>decision</b> changes: <code>beq</code> branches when Zero = 1, <code>bne</code> when Zero = 0.
          </p>
        </div>
      </header>

      <div className="layout">
        <section className="diagram-col">
          <div className="design-switch" role="tablist">
            <button className={design === 'gates' ? 'on' : ''} onClick={() => setDesign('gates')}>
              <b>Option 1: gates allowed</b>
              <small>NOT + AND + OR</small>
            </button>
            <button className={design === 'mux' ? 'on' : ''} onClick={() => setDesign('mux')}>
              <b>Option 2: only a 2×1 mux</b>
              <small>no extra gates at all</small>
            </button>
          </div>

          <div className="diagram-card">
            <SingleCycleDatapath look={look} overlay={overlay} />
          </div>
          <div className="legend">
            <span><i style={{ background: COLORS.added }} />newly added hardware</span>
            <span><i style={{ background: COLORS.chosen }} />carries a 1 / path used now</span>
            <span><i style={{ background: COLORS.ctrl }} />control signal = 0</span>
            {fade && <span><i style={{ background: COLORS.faded }} />not involved</span>}
          </div>

          {design === 'gates' ? (
            <>
              <h2>Option 1: add a NOT, an AND and an OR</h2>
              <ol className="plain-steps">
                <li><b>Keep everything <code>beq</code> uses.</b> Sign-extend, shift left 2 and the branch adder give the same target. The ALU still subtracts (ALUOp = 01) and the old AND still computes Branch · Zero.</li>
                <li><b>New control signal <code>BranchNE</code>.</b> Control sets it to 1 only when op = 5 (<code>bne</code>). Branch stays 1 only for <code>beq</code>.</li>
                <li><b>NOT gate on Zero</b> makes <Tex>{String.raw`\overline{\text{Zero}}`}</Tex>, which is 1 when the registers are <i>not</i> equal.</li>
                <li><b>New AND gate:</b> BranchNE · <Tex>{String.raw`\overline{\text{Zero}}`}</Tex> = "it is a bne and the registers differ".</li>
                <li><b>OR gate</b> combines the two ANDs. Its output is the new PCSrc, the branch mux's select line:</li>
              </ol>
              <Tex block>{String.raw`\text{PCSrc} = (\text{Branch}\cdot\text{Zero}) + (\text{BranchNE}\cdot\overline{\text{Zero}})`}</Tex>
              <p className="note">Added hardware: 1 NOT, 1 AND, 1 OR and 1 new control line. Nothing else changes.</p>
            </>
          ) : (
            <>
              <h2>Option 2: replace the AND gate with one 2×1 mux</h2>
              <ol className="plain-steps">
                <li><b>Keep everything <code>beq</code> uses</b> for the target and the compare (subtract, ALUOp = 01).</li>
                <li><b>New control signal <code>BranchNE</code></b> = 1 only for <code>bne</code>. Branch = 1 only for <code>beq</code>.</li>
                <li><b>Put a 2×1 mux where the AND gate was</b> and use <b>Zero as its select line</b>:
                  <ul>
                    <li>input 1 (picked when Zero = 1, registers equal) = <b>Branch</b>, because <code>beq</code> wants to branch when equal.</li>
                    <li>input 0 (picked when Zero = 0, registers differ) = <b>BranchNE</b>, because <code>bne</code> wants to branch when not equal.</li>
                  </ul>
                </li>
                <li><b>The mux output is PCSrc.</b> For non-branch instructions both inputs are 0, so PCSrc = 0 whatever Zero is.</li>
              </ol>
              <Tex block>{String.raw`\text{PCSrc} = \text{Zero}\;?\;\text{Branch} : \text{BranchNE}`}</Tex>
              <p className="note">
                Added hardware: 1 mux and 1 new control line. The AND gate is no longer needed.
                (The other mux idea, choosing between Zero and <Tex>{String.raw`\overline{\text{Zero}}`}</Tex> and then using the AND, also works, but it needs a NOT gate, so it breaks the "no other gates" rule.)
              </p>
            </>
          )}

          <h3 className="mt">Truth table (same result for both options)</h3>
          <table className="truth">
            <thead>
              <tr><th>Case</th><th>Branch</th><th>BranchNE</th><th>Zero</th><th>PCSrc</th><th>Next PC</th></tr>
            </thead>
            <tbody>
              {SCENS.map((s) => {
                const t = signals(s.id)
                return (
                  <tr key={s.id} className={s.id === scen ? 'on' : ''} onClick={() => setScen(s.id)}>
                    <td>{s.label}</td>
                    <td>{t.Branch}</td>
                    <td>{t.BranchNE}</td>
                    <td>{t.Zero === null ? 'X' : t.Zero}</td>
                    <td><b>{t.pcsrc}</b></td>
                    <td>{t.pcsrc ? 'branch target' : 'PC + 4'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="exam">
            <h3>Control signals for <code>bne</code></h3>
            <p>Identical to <code>beq</code> except <b>Branch = 0, BranchNE = 1</b>:</p>
            <div className="ctrl-row">
              {[['RegDst', 'X'], ['ALUSrc', '0'], ['ALUOp', '01'], ['Branch', '0'], ['BranchNE', '1'], ['MemRead', '0'], ['MemWrite', '0'], ['RegWrite', '0'], ['MemtoReg', 'X'], ['Jump', '0']].map(([n, val]) => (
                <span key={n} className={n === 'BranchNE' ? 'new' : ''}>{n} <b>{val}</b></span>
              ))}
            </div>
            <p className="note">Every other instruction gets BranchNE = 0. In an exam answer, list the new signal and give its value for every instruction.</p>
          </div>

          <div className="exam">
            <h3>In past papers</h3>
            <ul>
              <li><b>2022-23 Q3</b> Add <code>beq</code>, <code>bne</code>, <code>j</code>, <code>jr</code> "using minimum numbers of MUX, only 2×1 MUXes". <span className="ans">Option 2 adds bne with a single mux.</span></li>
              <li><b>2018-19 Q1(a)</b> Update the datapath for <code>bne</code>, <code>j</code>, <code>jr</code>, <code>jal</code>, <code>slt</code>, <code>lui</code> (30 marks).</li>
              <li><b>2012-13 Q2</b> Implement <code>bne</code>, <code>j</code>, <code>jr</code>, <code>jal</code> and give the control values, including new lines (35 marks).</li>
            </ul>
          </div>
        </section>

        <aside className="panel">
          <div className="panel-block">
            <h3>Try a case</h3>
            <div className="scen">
              {SCENS.map((s) => (
                <button key={s.id} className={scen === s.id ? 'on' : ''} onClick={() => setScen(s.id)}>
                  <b>{s.label}</b>
                  <small>{s.sub}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="panel-block">
            <h3>Signals right now</h3>
            <div className="sigs">
              {([['Branch', String(v.Branch)], ['BranchNE', String(v.BranchNE)], ['Zero', zeroTxt], ['PCSrc', String(v.pcsrc)]] as const).map(([n, val]) => (
                <div key={n} className={'sig ' + (val === '1' ? 'one' : val === 'X' ? 'x' : '')}>
                  <span>{n}</span>
                  <b>{val}</b>
                </div>
              ))}
            </div>
            {design === 'gates' ? (
              <p className="tiny mono">
                Branch·Zero = {v.Branch}·{zeroTxt} = {v.and1}<br />
                BranchNE·not Zero = {v.BranchNE}·{v.Zero === null ? 'X' : v.notZ} = {v.and2}<br />
                PCSrc = {v.and1} OR {v.and2} = <b>{v.pcsrc}</b>
              </p>
            ) : (
              <p className="tiny mono">
                {v.Zero === null ? (
                  <>Zero = X, but both inputs (Branch, BranchNE) are 0<br />PCSrc = <b>0</b> whichever input is picked</>
                ) : (
                  <>Zero = {zeroTxt} → mux picks input {v.Zero ? '1 (Branch)' : '0 (BranchNE)'}<br />PCSrc = {v.Zero ? `Branch = ${v.Branch}` : `BranchNE = ${v.BranchNE}`}</>
                )}
              </p>
            )}
            <p className="tiny">Zero = 1 means Source 1 − Source 2 = 0, i.e. the two registers are equal.</p>
          </div>

          <div className="panel-block">
            <h3>View</h3>
            <label className="tog"><input type="checkbox" checked={fade} onChange={(e) => setFade(e.target.checked)} /> Fade parts not involved in branching</label>
          </div>
        </aside>
      </div>
    </div>
  )
}
