// The full single-cycle datapath with control and jump, laid out like
// Ch. 4 Part 1 slide 32 (Patterson & Hennessy Fig. 4.24).
// Every part has an id so a lesson can highlight, fade or hide it.

import type { ReactNode } from 'react'
import { Adder, AndGate, Box, Label, Mux, Oval, Slash, Wire, type Look } from './shapes'

type Pt = [number, number]

export type PartId =
  // units
  | 'pc' | 'imem' | 'addpc' | 'sl2j' | 'jmux' | 'bmux' | 'badd' | 'sl2b' | 'and'
  | 'control' | 'regdst' | 'regs' | 'signext' | 'alusrc' | 'alu' | 'aluctl' | 'dmem' | 'memtoreg'
  // data wires
  | 'nextpc' | 'pcout' | 'pcToAdd' | 'four' | 'pc4main' | 'pc4hi' | 'pc4ToBmux' | 'pc4ToBadd'
  | 'instrOut' | 'instrBus' | 'instr25' | 'jaddr' | 'btarget' | 'bmuxout' | 'bmuxoutNoJump'
  | 'sext' | 'sl2bout' | 'sextAlu' | 'instrCtrl' | 'rs' | 'rt' | 'rtMux' | 'rd' | 'imm' | 'funct'
  | 'wreg' | 'rd1' | 'rd2' | 'rd2mem' | 'aluB' | 'alures' | 'aluresWb' | 'memdata' | 'wb'
  // control wires
  | 'zero' | 'pcsrc' | 'aluctlOut'
  | 'ctrl_RegDst' | 'ctrl_Jump' | 'ctrl_Branch' | 'ctrl_MemRead' | 'ctrl_MemtoReg'
  | 'ctrl_ALUOp' | 'ctrl_MemWrite' | 'ctrl_ALUSrc' | 'ctrl_RegWrite'

export const ALL_PARTS: PartId[] = [
  'pc', 'imem', 'addpc', 'sl2j', 'jmux', 'bmux', 'badd', 'sl2b', 'and', 'control', 'regdst', 'regs',
  'signext', 'alusrc', 'alu', 'aluctl', 'dmem', 'memtoreg', 'nextpc', 'pcout', 'pcToAdd', 'four',
  'pc4main', 'pc4hi', 'pc4ToBmux', 'pc4ToBadd', 'instrOut', 'instrBus', 'instr25', 'jaddr', 'btarget',
  'bmuxout', 'bmuxoutNoJump', 'sext', 'sl2bout', 'sextAlu', 'instrCtrl', 'rs', 'rt', 'rtMux', 'rd',
  'imm', 'funct', 'wreg', 'rd1', 'rd2', 'rd2mem', 'aluB', 'alures', 'aluresWb', 'memdata', 'wb',
  'zero', 'pcsrc', 'aluctlOut', 'ctrl_RegDst', 'ctrl_Jump', 'ctrl_Branch', 'ctrl_MemRead',
  'ctrl_MemtoReg', 'ctrl_ALUOp', 'ctrl_MemWrite', 'ctrl_ALUSrc', 'ctrl_RegWrite',
]

/** Parts that only exist once jump is added (slide 31/32). */
export const JUMP_PARTS: PartId[] = ['sl2j', 'jmux', 'pc4hi', 'instr25', 'jaddr', 'ctrl_Jump', 'nextpc', 'bmuxout']

export type LookFn = (id: PartId) => Look

// Control ellipse geometry, used to start each control line on its edge.
const CTRL = { cx: 597, cy: 437, rx: 55, ry: 138 }
export function ctrlEdge(y: number): Pt {
  const dy = (y - CTRL.cy) / CTRL.ry
  return [CTRL.cx + CTRL.rx * Math.sqrt(Math.max(0, 1 - dy * dy)) - 1, y]
}

export const CONTROL_LINES: { id: PartId; name: string; y: number; route: Pt[]; thick?: boolean }[] = [
  { id: 'ctrl_RegDst', name: 'RegDst', y: 312, route: [[643, 312], [643, 263], [318, 263], [318, 868], [565, 868], [565, 840]] },
  { id: 'ctrl_Jump', name: 'Jump', y: 340, route: [[852, 340], [852, 53], [1415, 53], [1415, 97]] },
  { id: 'ctrl_Branch', name: 'Branch', y: 370, route: [[1093, 370], [1093, 330], [1160, 330]] },
  { id: 'ctrl_MemRead', name: 'MemRead', y: 401, route: [[1488, 401], [1488, 1003], [1255, 1003], [1255, 955]] },
  { id: 'ctrl_MemtoReg', name: 'MemtoReg', y: 433, route: [[1418, 433], [1418, 742]] },
  { id: 'ctrl_ALUOp', name: 'ALUOp', y: 466, route: [[847, 466], [847, 1143], [967, 1143], [967, 1078]], thick: true },
  { id: 'ctrl_MemWrite', name: 'MemWrite', y: 497, route: [[1255, 497], [1255, 687]] },
  { id: 'ctrl_ALUSrc', name: 'ALUSrc', y: 530, route: [[917, 530], [917, 748]] },
  { id: 'ctrl_RegWrite', name: 'RegWrite', y: 560, route: [[710, 560], [710, 590]] },
]

export function SingleCycleDatapath(props: { look: LookFn; overlay?: ReactNode; showJump?: boolean }) {
  const { overlay, showJump = true } = props
  const L: LookFn = (id) => {
    if (!showJump && JUMP_PARTS.includes(id)) return 'hidden'
    if (showJump && id === 'bmuxoutNoJump') return 'hidden'
    return props.look(id)
  }

  return (
    <svg viewBox="0 0 1520 1180" width="100%" style={{ display: 'block' }} role="img" aria-label="Single-cycle MIPS datapath with control and jump">
      <rect x={0} y={0} width={1520} height={1180} fill="white" />

      {/* ---------- wires first, so units sit on top ---------- */}

      {/* next PC loop back into the PC */}
      <Wire look={L('nextpc')} pts={[[1435, 180], [1467, 180], [1467, 14], [27, 14], [27, 643], [52, 643]]} />
      <Wire look={L('bmuxoutNoJump')} pts={[[1317, 178], [1467, 178], [1467, 14], [27, 14], [27, 643], [52, 643]]} />

      {/* PC → instruction memory, PC → PC+4 adder */}
      <Wire look={L('pcout')} pts={[[103, 643], [145, 643]]} />
      <Wire look={L('pcToAdd')} pts={[[116, 643], [116, 110], [203, 110]]} dots={[[116, 643]]} />
      <Wire look={L('four')} pts={[[163, 240], [203, 240]]} />

      {/* PC+4 */}
      <Wire look={L('pc4main')} pts={[[293, 173], [905, 173]]} arrow={false} />
      <Wire look={L('pc4hi')} pts={[[434, 173], [434, 147], [660, 147], [660, 85]]} arrow={false} dots={[[434, 173]]} />
      <Wire look={L('pc4ToBmux')} pts={[[905, 173], [905, 117], [1272, 117]]} />
      <Wire look={L('pc4ToBadd')} pts={[[905, 157], [993, 157]]} dots={[[905, 157]]} />

      {/* jump address */}
      <Wire look={L('instr25')} pts={[[310, 735], [310, 85], [488, 85]]} dots={[[310, 735]]} />
      <Wire look={L('jaddr')} pts={[[568, 85], [1350, 85], [1350, 122], [1395, 122]]} />

      {/* branch target */}
      <Wire look={L('btarget')} pts={[[1142, 238], [1272, 238]]} />
      <Wire look={L('bmuxout')} pts={[[1317, 238], [1395, 238]]} />
      <Wire look={L('sext')} pts={[[780, 990], [862, 990], [862, 302], [888, 302]]} />
      <Wire look={L('sl2bout')} pts={[[968, 302], [993, 302]]} />
      <Wire look={L('sextAlu')} pts={[[862, 850], [895, 850]]} dots={[[862, 850]]} />

      {/* instruction fields */}
      <Wire look={L('instrOut')} pts={[[300, 735], [328, 735]]} arrow={false} dots={[[328, 735]]} />
      <Wire look={L('instrBus')} pts={[[328, 990], [328, 437]]} arrow={false} />
      <Wire look={L('instrCtrl')} pts={[[328, 437], [540, 437]]} />
      <Wire look={L('rs')} pts={[[328, 627], [605, 627]]} dots={[[328, 627]]} />
      <Wire look={L('rt')} pts={[[328, 703], [605, 703]]} dots={[[328, 703]]} />
      <Wire look={L('rtMux')} pts={[[482, 703], [482, 738], [545, 738]]} dots={[[482, 703]]} />
      <Wire look={L('rd')} pts={[[328, 818], [545, 818]]} dots={[[328, 818]]} />
      <Wire look={L('imm')} pts={[[328, 990], [680, 990]]} />
      <Wire look={L('funct')} pts={[[607, 990], [607, 1125], [880, 1125], [880, 1003], [915, 1003]]} dots={[[607, 990]]} />

      {/* register file / ALU / memory */}
      <Wire look={L('wreg')} pts={[[585, 778], [605, 778]]} />
      <Wire look={L('rd1')} pts={[[820, 665], [970, 665]]} />
      <Wire look={L('rd2')} pts={[[820, 770], [895, 770]]} dots={[[835, 770]]} />
      <Wire look={L('rd2mem')} pts={[[835, 770], [835, 900], [1168, 900]]} />
      <Wire look={L('aluB')} pts={[[938, 805], [970, 805]]} />
      <Wire look={L('alures')} pts={[[1118, 762], [1168, 762]]} dots={[[1135, 762]]} />
      <Wire look={L('aluresWb')} pts={[[1135, 762], [1135, 975], [1370, 975], [1370, 845], [1397, 845]]} />
      <Wire look={L('memdata')} pts={[[1348, 762], [1397, 762]]} />
      <Wire look={L('wb')} pts={[[1440, 805], [1458, 805], [1458, 1157], [580, 1157], [580, 853], [607, 853]]} />

      {/* control wires */}
      <Wire look={L('zero')} kind="ctrl" pts={[[1118, 706], [1140, 706], [1140, 365], [1160, 365]]} arrow={false} />
      <Wire look={L('pcsrc')} kind="ctrl" pts={[[1222, 347], [1296, 347], [1296, 260]]} arrow={false} />
      <Wire look={L('aluctlOut')} kind="ctrl" thick pts={[[1017, 1003], [1043, 1003], [1043, 815]]} arrow={false} />
      {CONTROL_LINES.map((c) => (
        <Wire key={c.id} look={L(c.id)} kind="ctrl" thick={c.thick} arrow={false} pts={[ctrlEdge(c.y), ...c.route]} />
      ))}

      {/* ---------- units ---------- */}

      <Box x={52} y={562} w={51} h={163} look={L('pc')}>
        <Label x={78} y={652} look={L('pc')} bold anchor="middle">PC</Label>
      </Box>

      <Box x={145} y={611} w={155} h={226} look={L('imem')}>
        <Label x={157} y={638} look={L('imem')}>Read</Label>
        <Label x={157} y={664} look={L('imem')}>address</Label>
        <Label x={290} y={730} look={L('imem')} anchor="end">Instruction</Label>
        <Label x={290} y={756} look={L('imem')} anchor="end">[31–0]</Label>
        <Label x={222} y={796} look={L('imem')} bold anchor="middle">Instruction</Label>
        <Label x={222} y={822} look={L('imem')} bold anchor="middle">memory</Label>
      </Box>

      <Adder lx={203} lt={73} lb={278} rx={293} rt={125} rb={222} look={L('addpc')}>
        <Label x={258} y={182} look={L('addpc')} bold anchor="middle">Add</Label>
      </Adder>
      <Label x={143} y={249} look={L('four')} anchor="middle">4</Label>

      <Oval cx={528} cy={84} rx={40} ry={52} lines={['Shift', 'left 2']} look={L('sl2j')} />
      <Slash x={462} y={85} n="26" look={L('instr25')} />
      <Slash x={588} y={85} n="28" look={L('jaddr')} />
      <Label x={273} y={58} look={L('instr25')}>Instruction [25–0]</Label>
      <Label x={597} y={58} look={L('jaddr')}>Jump address [31–0]</Label>
      <Label x={673} y={135} look={L('pc4hi')}>PC + 4 [31–28]</Label>

      <Adder lx={995} lt={137} lb={343} rx={1142} rt={185} rb={290} look={L('badd')}>
        <Label x={1046} y={248} look={L('badd')} bold anchor="middle">Add</Label>
        <Label x={1135} y={232} look={L('badd')} anchor="end">ALU</Label>
        <Label x={1135} y={258} look={L('badd')} anchor="end">result</Label>
      </Adder>
      <Oval cx={928} cy={304} rx={40} ry={52} lines={['Shift', 'left 2']} look={L('sl2b')} />

      <Mux x={1272} y={97} w={45} h={163} top="0" bottom="1" look={L('bmux')} />
      <Mux x={1395} y={97} w={40} h={163} top="1" bottom="0" look={L('jmux')} />
      <AndGate x={1160} y={310} w={62} h={74} look={L('and')} />

      <Oval cx={CTRL.cx} cy={CTRL.cy} rx={CTRL.rx} ry={CTRL.ry} lines={['Control']} look={L('control')} kind="ctrl" size={26} />
      <Label x={333} y={423} look={L('instrCtrl')}>Instruction [31–26]</Label>
      {CONTROL_LINES.map((c) => (
        <Label key={c.id} x={663} y={c.y - 10} look={L(c.id)} kind="ctrl">{c.name}</Label>
      ))}

      <Label x={335} y={613} look={L('rs')}>Instruction [25–21]</Label>
      <Label x={335} y={689} look={L('rt')}>Instruction [20–16]</Label>
      <Label x={335} y={804} look={L('rd')}>Instruction [15–11]</Label>
      <Label x={335} y={976} look={L('imm')}>Instruction [15–0]</Label>
      <Label x={613} y={1113} look={L('funct')}>Instruction [5–0]</Label>

      <Mux x={545} y={715} w={40} h={125} top="0" bottom="1" look={L('regdst')} />

      <Box x={607} y={590} w={213} h={300} look={L('regs')}>
        <Label x={620} y={621} look={L('regs')}>Read</Label>
        <Label x={620} y={648} look={L('regs')}>register 1</Label>
        <Label x={620} y={698} look={L('regs')}>Read</Label>
        <Label x={620} y={724} look={L('regs')}>register 2</Label>
        <Label x={620} y={773} look={L('regs')}>Write</Label>
        <Label x={620} y={799} look={L('regs')}>register</Label>
        <Label x={620} y={848} look={L('regs')}>Write</Label>
        <Label x={620} y={874} look={L('regs')}>data</Label>
        <Label x={810} y={658} look={L('regs')} anchor="end">Read</Label>
        <Label x={810} y={684} look={L('regs')} anchor="end">data 1</Label>
        <Label x={810} y={765} look={L('regs')} anchor="end">Read</Label>
        <Label x={810} y={791} look={L('regs')} anchor="end">data 2</Label>
        <Label x={750} y={878} look={L('regs')} bold anchor="middle">Registers</Label>
      </Box>

      <Oval cx={730} cy={990} rx={50} ry={77} lines={['Sign-', 'extend']} look={L('signext')} />
      <Slash x={640} y={990} n="16" look={L('imm')} labelBelow={false} />
      <Slash x={812} y={990} n="32" look={L('sext')} labelBelow={false} />

      <Mux x={895} y={748} w={43} h={124} top="0" bottom="1" look={L('alusrc')} />

      <Adder lx={972} lt={637} lb={843} rx={1118} rt={690} rb={790} look={L('alu')}>
        <Label x={1025} y={750} look={L('alu')} bold anchor="middle">ALU</Label>
        <Label x={1110} y={712} look={L('zero')} kind="ctrl" anchor="end">Zero</Label>
        <Label x={1110} y={757} look={L('alu')} anchor="end">ALU</Label>
        <Label x={1110} y={783} look={L('alu')} anchor="end">result</Label>
      </Adder>

      <Oval cx={967} cy={1003} rx={50} ry={75} lines={['ALU', 'control']} look={L('aluctl')} kind="ctrl" />

      <Box x={1168} y={687} w={180} h={268} look={L('dmem')}>
        <Label x={1177} y={771} look={L('dmem')}>Address</Label>
        <Label x={1340} y={756} look={L('dmem')} anchor="end">Read</Label>
        <Label x={1340} y={782} look={L('dmem')} anchor="end">data</Label>
        <Label x={1177} y={895} look={L('dmem')}>Write</Label>
        <Label x={1177} y={921} look={L('dmem')}>data</Label>
        <Label x={1295} y={885} look={L('dmem')} bold anchor="middle">Data</Label>
        <Label x={1295} y={911} look={L('dmem')} bold anchor="middle">memory</Label>
      </Box>

      <Mux x={1397} y={742} w={43} h={123} top="1" bottom="0" look={L('memtoreg')} />

      {overlay}
    </svg>
  )
}
