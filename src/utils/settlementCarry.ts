export type CarryMode = '清零' | '累積'
export interface CarryInput {
  mode: CarryMode
  previousGgr: number
  currentGgr: number
  previousPayable: number
  percent: number
}
export function calculateCarry(input: CarryInput) {
  if (
    ![input.previousGgr, input.currentGgr, input.previousPayable, input.percent].every(
      Number.isFinite
    ) ||
    input.previousGgr > 0 ||
    input.previousPayable < 0 ||
    input.percent < 0 ||
    input.percent > 100
  )
    throw new Error('結轉資料無效')
  const adjustedGgr = input.previousGgr + input.currentGgr
  const newPayable = Math.round(Math.max(0, adjustedGgr) * input.percent) / 100
  const totalPayable = Math.round((input.previousPayable + newPayable) * 100) / 100
  return {
    adjustedGgr,
    newPayable,
    totalPayable,
    nextGgr: input.mode === '累積' ? Math.min(0, adjustedGgr) : 0
  }
}
export function closeCarry(input: CarryInput, action: 'retain' | 'settle') {
  const result = calculateCarry(input)
  return {
    ...result,
    actualPaid: action === 'settle' ? result.totalPayable : 0,
    nextPayable: action === 'retain' ? result.totalPayable : 0
  }
}
