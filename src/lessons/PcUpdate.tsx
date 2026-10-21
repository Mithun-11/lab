import { useMemo, useState } from 'react'
import { Step } from '../components/Step'
import { SingleCycleDatapath, type PartId } from '../datapath/SingleCycleDatapath'
import { COLORS, type Look } from '../datapath/shapes'
import { Tex } from '../components/Tex'

type Scenario = 'seq' | 'beqT' | 'beqN' | 'j'

// Everything that takes part in choosing the next PC.
const FOCUS = new Set<PartId>([
  'pc', 'imem', 'pcout', 'pcToAdd', 'four', 'addpc', 'pc4main', 'pc4hi', 'pc4ToBmux', 'pc4ToBadd',
  'instrOut', 'instrBus', 'instr25', 'sl2j', 'jaddr', 'jmux', 'bmux', 'bmuxout', 'bmuxoutNoJump', 'nextpc',
  'imm', 'signext', 'sext', 'sl2b', 'sl2bout', 'badd', 'btarget', 'and', 'pcsrc', 'zero',
  'ctrl_Branch', 'ctrl_Jump', 'control', 'instrCtrl',
  // the compare that produces Zero
  'rs', 'rt', 'regs', 'rd1', 'rd2', 'alusrc', 'aluB', 'alu', 'ctrl_ALUSrc', 'aluctl', 'aluctlOut', 'ctrl_ALUOp',
])

// Hardware that computes the three candidate addresses (it works every cycle).
const COMPUTED = new Set<PartId>([
  'pc', 'pcout', 'pcToAdd', 'four', 'addpc', 'pc4main', 'pc4hi', 'pc4ToBmux', 'pc4ToBadd',
  'instrOut', 'instrBus', 'instr25', 'sl2j', 'jaddr', 'imm', 'signext', 'sext', 'sl2b', 'sl2bout',
  'badd', 'btarget', 'bmux', 'bmuxout', 'bmuxoutNoJump', 'jmux', 'nextpc',
])

const COMPARE: PartId[] = ['rs', 'rt', 'regs', 'rd1', 'rd2', 'alusrc', 'aluB', 'alu']
const SEQ_PATH: PartId[] = ['pc', 'pcToAdd', 'four', 'addpc', 'pc4main', 'pc4ToBmux', 'bmux', 'bmuxout', 'bmuxoutNoJump', 'jmux', 'nextpc']

const CHOSEN: Record<Scenario, PartId[]> = {
  seq: SEQ_PATH,
  beqT: [
    'pc', 'pcToAdd', 'four', 'addpc', 'pc4main', 'pc4ToBadd', 'instrOut', 'instrBus', 'imm', 'signext', 'sext',
    'sl2b', 'sl2bout', 'badd', 'btarget', 'bmux', 'bmuxout', 'bmuxoutNoJump', 'jmux', 'nextpc',
    'ctrl_Branch', 'zero', 'and', 'pcsrc', ...COMPARE,
  ],
  beqN: [...SEQ_PATH, 'ctrl_Branch', ...COMPARE],
  j: ['pc', 'pcToAdd', 'four', 'addpc', 'pc4main', 'pc4hi', 'instrOut', 'instr25', 'sl2j', 'jaddr', 'jmux', 'nextpc', 'ctrl_Jump'],
}

const STEP_PARTS: Record<number, PartId[]> = {
  1: ['pc', 'pcToAdd', 'four', 'addpc', 'pc4main'],
  2: ['instrOut', 'instrBus', 'imm', 'signext', 'sext', 'sl2b', 'sl2bout', 'pc4main', 'pc4ToBadd', 'badd', 'btarget'],
  3: ['pc4ToBmux', 'btarget', 'bmux', 'and', 'pcsrc', 'ctrl_Branch', 'zero', 'control', ...COMPARE],
  4: ['instrOut', 'instr25', 'sl2j', 'pc4main', 'pc4hi', 'jaddr'],
  5: ['bmuxout', 'jaddr', 'jmux', 'ctrl_Jump', 'nextpc', 'bmuxoutNoJump', 'pc'],
}

const SCENARIOS: { id: Scenario; label: string; sub: string }[] = [
  { id: 'seq', label: 'add / lw / sw', sub: 'any non-branch, non-jump instruction' },
  { id: 'beqT', label: 'beq, taken', sub: 'Source 1 = Source 2' },
  { id: 'beqN', label: 'beq, not taken', sub: 'Source 1 ≠ Source 2' },
  { id: 'j', label: 'j', sub: 'jump' },
]

const hex = (v: number) => '0x' + (v >>> 0).toString(16).toUpperCase().padStart(8, '0')

// Letter markers placed on the wires; the values table explains each letter.
const MARKERS: { k: string; x: number; y: number; part: PartId }[] = [
  { k: 'A', x: 116, y: 420, part: 'pcToAdd' },
  { k: 'B', x: 600, y: 173, part: 'pc4main' },
  { k: 'C', x: 862, y: 560, part: 'sext' },
  { k: 'D', x: 1207, y: 238, part: 'btarget' },
  { k: 'E', x: 1110, y: 85, part: 'jaddr' },
  { k: 'F', x: 1356, y: 238, part: 'bmuxout' },
  { k: 'G', x: 760, y: 14, part: 'nextpc' },
]

export function PcUpdate() {
  const [scenario, setScenario] = useState<Scenario>('beqT')
  const [step, setStep] = useState<number | null>(null)
  const [showJump, setShowJump] = useState(true)
  const [focus, setFocus] = useState(true)
  const [pcText, setPcText] = useState('00000040')
  const [immText, setImmText] = useState('3')
  const [jText, setJText] = useState('0100006')

  const pc = (parseInt(pcText, 16) || 0) & ~3
  const imm = Math.max(-32768, Math.min(32767, parseInt(immText, 10) || 0))
  const jf = (parseInt(jText, 16) || 0) & 0x3ffffff
  const sc: Scenario = !showJump && scenario === 'j' ? 'seq' : scenario

  const v = useMemo(() => {
    const pc4 = (pc + 4) >>> 0
    const off = imm * 4
    const tgt = (pc4 + off) >>> 0
    const jaddr = ((pc4 & 0xf0000000) | (jf << 2)) >>> 0
    const sig = {
      seq: { Branch: '0', Zero: 'X', PCSrc: '0', Jump: '0' },
      beqT: { Branch: '1', Zero: '1', PCSrc: '1', Jump: '0' },
      beqN: { Branch: '1', Zero: '0', PCSrc: '0', Jump: '0' },
      j: { Branch: 'X', Zero: 'X', PCSrc: 'X', Jump: '1' },
    }[sc]
    const bmuxOut = sig.PCSrc === '1' ? tgt : pc4
    const next = sig.Jump === '1' ? jaddr : bmuxOut
    return { pc4, off, tgt, jaddr, sig, bmuxOut, next }
  }, [pc, imm, jf, sc])

  const chosen = new Set<PartId>(step ? STEP_PARTS[step] : CHOSEN[sc])
  const look = (id: PartId): Look => {
    if (chosen.has(id)) return 'chosen'
    if (!step && COMPUTED.has(id)) return 'computed'
    if (focus && !FOCUS.has(id)) return 'faded'
    return 'normal'
  }

  const overlay = step ? null : (
    <g fontFamily="Arial, Helvetica, sans-serif">
      {MARKERS.filter((m) => showJump || !['E', 'G'].includes(m.k)).map((raw) => {
        const m = !showJump && raw.k === 'F' ? { ...raw, x: 1392, y: 178, part: 'bmuxoutNoJump' as PartId } : raw
        const c = chosen.has(m.part) ? COLORS.chosen : COLORS.computed
        return (
          <g key={m.k}>
            <circle cx={m.x} cy={m.y} r={19} fill={c} stroke="white" strokeWidth={3} />
            <text x={m.x} y={m.y + 8} fontSize={23} fontWeight={700} fill="white" textAnchor="middle">{m.k}</text>
          </g>
        )
      })}
    </g>
  )

  const rows: { k: string; what: string; val: string; how: string }[] = [
    { k: 'A', what: 'PC (current instruction)', val: hex(pc), how: 'from the PC register' },
    { k: 'B', what: 'PC + 4', val: hex(v.pc4), how: `${hex(pc)} + 4` },
    { k: 'C', what: 'offset, sign-extended', val: String(imm), how: `bits 15:0 = ${imm}` },
    { k: 'D', what: 'branch target', val: hex(v.tgt), how: `B + C×4 = B + ${v.off}` },
    ...(showJump ? [{ k: 'E', what: 'jump address', val: hex(v.jaddr), how: `{B[31:28], ${'0x' + jf.toString(16).toUpperCase()}, 00}` }] : []),
    { k: 'F', what: 'branch mux output', val: sc === 'j' ? 'ignored' : hex(v.bmuxOut), how: v.sig.PCSrc === '1' ? 'PCSrc = 1 → D' : sc === 'j' ? 'Jump mux overrides it' : 'PCSrc = 0 → B' },
    ...(showJump ? [{ k: 'G', what: 'next PC', val: hex(v.next), how: v.sig.Jump === '1' ? 'Jump = 1 → E' : 'Jump = 0 → F' }] : []),
  ]

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="crumb">Chapter 4 · Part 1 · slides 18–19, 26, 31–32</p>
          <h1>How the next PC is chosen</h1>
          <p className="lede">
            Every cycle the hardware builds three candidate addresses: PC + 4, the branch target and the jump address.
            Two muxes then pick one, and it is written into the PC at the next clock edge.
          </p>
        </div>
      </header>

      <div className="layout">
        <section className="diagram-col">
          <div className="diagram-card">
            <SingleCycleDatapath look={look} overlay={overlay} showJump={showJump} />
          </div>
          <div className="legend">
            <span><i style={{ background: COLORS.chosen }} />{step ? `step ${step}` : 'path actually used'}</span>
            {!step && <span><i style={{ background: COLORS.computed }} />computed, but not chosen</span>}
            <span><i style={{ background: COLORS.data }} />data wire</span>
            <span><i style={{ background: COLORS.ctrl }} />control signal</span>
            {focus && <span><i style={{ background: COLORS.faded }} />not part of PC update</span>}
          </div>

          <h2>The explanation, step by step</h2>
          <p className="hint">Click a step to highlight its hardware on the diagram.</p>
          <ol className="steps">
            <Step n={1} cur={step} set={setStep} title="Compute PC + 4">
              <p>An adder adds the constant 4 to the current PC. Every MIPS instruction is 4 bytes, so this is the address of the next instruction in memory.</p>
            </Step>
            <Step n={2} cur={step} set={setStep} title="Compute the branch target (a second, separate adder)">
              <ul>
                <li>Bits 15:0 (the offset) are <b>sign-extended</b> to 32 bits, so a negative offset stays negative (loops branch backwards).</li>
                <li>Then <b>shifted left by 2</b>, i.e. ×4: the offset counts <i>instructions (words)</i>, not bytes.</li>
                <li>A second adder adds it to PC + 4 (not to PC). This is <b>PC-relative addressing</b>.</li>
              </ul>
              <Tex block>{String.raw`\text{branch target} = (\text{PC}+4) + \big(\text{signext}(\text{instr}[15{:}0]) \ll 2\big)`}</Tex>
              <p className="note">It must be a separate adder: in single-cycle every unit does one job per cycle, and the main ALU is busy comparing the two registers.</p>
            </Step>
            <Step n={3} cur={step} set={setStep} title="Branch mux: PC + 4 or branch target?">
              <ul>
                <li>Input <b>0</b> = PC + 4, input <b>1</b> = branch target.</li>
                <li>Its select line is <b>PCSrc</b>, made by the AND gate:</li>
              </ul>
              <Tex block>{String.raw`\text{PCSrc} = \text{Branch} \cdot \text{Zero}`}</Tex>
              <ul>
                <li><b>Branch</b> comes from Control and is 1 only for <code>beq</code>.</li>
                <li><b>Zero</b> comes from the ALU. The ALU subtracts Source 1 − Source 2 (registers named by rs and rt); Zero = 1 when the result is 0, i.e. the registers are equal.</li>
                <li>Taken only if it is a <code>beq</code> <b>and</b> the registers are equal.</li>
              </ul>
            </Step>
            <Step n={4} cur={step} set={setStep} title="Build the jump address (no adder, only wires)">
              <ul>
                <li>Bits 25:0 are shifted left by 2 (two 0 bits appended): 26 → 28 bits.</li>
                <li>The top 4 bits of PC + 4 go in front: 4 + 28 = 32 bits.</li>
              </ul>
              <Tex block>{String.raw`\text{jump address} = \{\,(\text{PC}+4)[31{:}28],\ \text{instr}[25{:}0],\ 00\,\}`}</Tex>
            </Step>
            <Step n={5} cur={step} set={setStep} title="Jump mux: branch-mux output or jump address?">
              <ul>
                <li>Input <b>0</b> = branch-mux output, input <b>1</b> = jump address (note: 1 is on top in the slide).</li>
                <li>Select line <b>Jump</b> comes from Control and is 1 only for <code>j</code>.</li>
                <li>Its output is written into the PC at the next clock edge.</li>
                <li><b>Without jump support</b> (slide 26) this mux does not exist: the branch-mux output goes straight to the PC. Try the toggle on the right.</li>
              </ul>
            </Step>
          </ol>

          <div className="summary">
            <h3>One-line summary</h3>
            <Tex block>{String.raw`\text{next PC} = \begin{cases} \text{jump address} & \text{if Jump}=1 \\ \text{branch target} & \text{if Branch}=1 \text{ and Zero}=1 \\ \text{PC}+4 & \text{otherwise} \end{cases}`}</Tex>
          </div>

          <div className="exam">
            <h3>In past papers</h3>
            <ul>
              <li><b>2023-24 Q8(a)(iii)</b> Why are the upper 4 bits of PC + 4 used in the jump address? <span className="ans">The 26-bit field + two 0 bits gives only 28 bits; the top 4 come from PC + 4. So <code>j</code> can only reach inside the current 256 MB block.</span></li>
              <li><b>2023-24 Q8(b)</b> Add the hardware for <code>j</code>. <span className="ans">Draw: Shift left 2 (26 → 28), the PC + 4 [31–28] wire joining it, a 2×1 mux in front of the PC (1 = jump address, 0 = old next-PC), and the Jump line from Control.</span></li>
              <li><b>2022-23 (305) Q4(a)</b> Formula for the branch target address → step 2.</li>
              <li><b>2016-17 Q2(d)</b> How is the PC updated for <code>beq</code>? → steps 1–3.</li>
              <li><b>2022-23 Q3, 2018-19 Q1(a), 2012-13 Q2</b> Add <code>bne</code>, <code>j</code>, <code>jr</code>, <code>jal</code>: all of them change this PC logic.</li>
            </ul>
          </div>
        </section>

        <aside className="panel">
          <div className="panel-block">
            <h3>Try an instruction</h3>
            <div className="scen">
              {SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  className={sc === s.id && !step ? 'on' : ''}
                  disabled={s.id === 'j' && !showJump}
                  onClick={() => { setScenario(s.id); setStep(null) }}
                >
                  <b>{s.label}</b>
                  <small>{s.sub}</small>
                </button>
              ))}
            </div>
            {step && (
              <button className="link" onClick={() => setStep(null)}>← back to the instruction view (step {step} is shown)</button>
            )}
          </div>

          <div className="panel-block">
            <h3>Control signals</h3>
            <div className="sigs">
              {(['Branch', 'Zero', 'PCSrc', 'Jump'] as const).filter((n) => showJump || n !== 'Jump').map((n) => (
                <div key={n} className={'sig ' + (v.sig[n] === '1' ? 'one' : '')}>
                  <span>{n}</span>
                  <b>{v.sig[n]}</b>
                </div>
              ))}
            </div>
            <p className="tiny">X = doesn't matter here. PCSrc = Branch AND Zero (not an output of Control).</p>
          </div>

          <div className="panel-block">
            <h3>Values on the wires</h3>
            <div className="inputs">
              <label>PC <span>0x</span><input value={pcText} onChange={(e) => setPcText(e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 8))} /></label>
              <label>offset (bits 15:0) <input value={immText} onChange={(e) => setImmText(e.target.value.replace(/[^0-9-]/g, '').slice(0, 6))} /></label>
              {showJump && <label>jump field (bits 25:0) <span>0x</span><input value={jText} onChange={(e) => setJText(e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 7))} /></label>}
            </div>
            <table className="vals">
              <tbody>
                {rows.map((r) => (
                  <tr key={r.k}>
                    <td><span className="mk">{r.k}</span></td>
                    <td>{r.what}<div className="how">{r.how}</div></td>
                    <td className="val">{r.val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="tiny">All three candidates (B, D, E) are computed every cycle from the instruction's bits, even for <code>add</code> where D and E are meaningless. The muxes simply ignore them.</p>
          </div>

          <div className="panel-block">
            <h3>View</h3>
            <label className="tog"><input type="checkbox" checked={showJump} onChange={(e) => setShowJump(e.target.checked)} /> With jump hardware (slide 32). Off = slide 26.</label>
            <label className="tog"><input type="checkbox" checked={focus} onChange={(e) => setFocus(e.target.checked)} /> Fade parts not used for the PC</label>
          </div>
        </aside>
      </div>
    </div>
  )
}

