import JSBI from 'jsbi'

// exports for external consumption
export type BigintIsh = JSBI | bigint | string

export enum ChainId {
  PORTO_TESTNET = 177,
}

export enum TradeType {
  EXACT_INPUT,
  EXACT_OUTPUT,
}

export enum Rounding {
  ROUND_DOWN,
  ROUND_HALF_UP,
  ROUND_UP,
}

export const AMM_MODULE_ADDRESS =
  '0xe48f7bbd403acf5f35ccc8cac01438226210887efdfee3747b7e996be1d062a6'

export const AMM_SIGNER =
  '0xc4a819d5a8c98b7a047021dd05d5291199baad1813a549758e00527d1289b56e'

export const FACTORY_ADDRESS = `${AMM_MODULE_ADDRESS}::factory`

export const FACTORY_ADDRESS_MAP = {
  [ChainId.PORTO_TESTNET]: FACTORY_ADDRESS,
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
export const FEES_NUMERATOR = JSBI.BigInt(9975)
export const FEES_DENOMINATOR = JSBI.BigInt(10000)

export enum MoveType {
  u8 = 'u8',
  u64 = 'u64',
  u128 = 'u128',
  u256 = 'u256',
}

export const MOVE_TYPE_MAXIMA = {
  [MoveType.u8]: JSBI.BigInt('0xff'),
  [MoveType.u64]: JSBI.BigInt('0xffffffffffffffff'),
  [MoveType.u128]: JSBI.BigInt('0xffffffffffffffffffffffffffffffff'),
  [MoveType.u256]: JSBI.BigInt(
    '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
  ),
}
