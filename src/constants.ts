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

export const AMM_RESOURCE_ACCOUNT =
  '0x190aae4e7b1b0bcecbe4c451179ac7e4a0a8ef4dad110f4947c59cb4d51fbca2'

export const AMM_SIGNER_ACCOUNT =
  '0xbd3685d014b9790bcc168ba4bced996b3724a67ade4d4b9cab913ce6564e7e4'

export const FACTORY_ADDRESS = `${AMM_RESOURCE_ACCOUNT}::factory`

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
