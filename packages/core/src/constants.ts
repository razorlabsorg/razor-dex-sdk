import JSBI from 'jsbi'

// exports for external consumption
export type BigintIsh = JSBI | number | string

export enum TradeType {
  EXACT_INPUT,
  EXACT_OUTPUT,
}

export enum Rounding {
  ROUND_DOWN,
  ROUND_HALF_UP,
  ROUND_UP,
}

export const MINIMUM_LIQUIDITY = JSBI.BigInt(1000)

// exports for internal consumption
export const ZERO = JSBI.BigInt(0)
export const ONE = JSBI.BigInt(1)
export const TWO = JSBI.BigInt(2)
export const THREE = JSBI.BigInt(3)
export const FIVE = JSBI.BigInt(5)
export const TEN = JSBI.BigInt(10)
export const _100 = JSBI.BigInt(100)
export const _9975 = JSBI.BigInt(9975)
export const _10000 = JSBI.BigInt(10000)

export const MaxU256 = JSBI.BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')

export enum MoveType {
  u8 = 'u8',
  u16 = 'u16',
  u32 = 'u32',
  u64 = 'u64',
  u128 = 'u128',
  u256 = 'u256',
}

export const MOVE_TYPE_MAXIMA = {
  [MoveType.u8]: JSBI.BigInt('0xff'),
  [MoveType.u16]: JSBI.BigInt('0xffff'),
  [MoveType.u32]: JSBI.BigInt('0xffffffff'),
  [MoveType.u64]: JSBI.BigInt('0xffffffffffffffff'),
  [MoveType.u128]: JSBI.BigInt('0xffffffffffffffffffffffffffffffff'),
  [MoveType.u256]: JSBI.BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'),
}
