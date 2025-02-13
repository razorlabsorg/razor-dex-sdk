// exports for external consumption
export type BigintIsh = bigint | number | string

export enum TradeType {
  EXACT_INPUT,
  EXACT_OUTPUT,
}

export enum Rounding {
  ROUND_DOWN,
  ROUND_HALF_UP,
  ROUND_UP,
}

export enum ChainId {
  MAINNET = 126,
  BARDOCK_TESTNET = 250,
}

export const MINIMUM_LIQUIDITY = 1000n

// exports for internal consumption
export const ZERO = 0n
export const ONE = 1n
export const TWO = 2n
export const THREE = 3n
export const FIVE = 5n
export const TEN = 10n
export const _100 = 100n
export const _9975 = 9975n
export const _10000 = 10000n

export const MaxU256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')

export enum MoveType {
  u8 = 'u8',
  u16 = 'u16',
  u32 = 'u32',
  u64 = 'u64',
  u128 = 'u128',
  u256 = 'u256',
}

export const MOVE_TYPE_MAXIMA = {
  [MoveType.u8]: BigInt('0xff'),
  [MoveType.u16]: BigInt('0xffff'),
  [MoveType.u32]: BigInt('0xffffffff'),
  [MoveType.u64]: BigInt('0xffffffffffffffff'),
  [MoveType.u128]: BigInt('0xffffffffffffffffffffffffffffffff'),
  [MoveType.u256]: BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'),
}
