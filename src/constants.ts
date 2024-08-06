// exports for external consumption
export type BigintIsh = bigint | string | number;

export enum TradeType {
  EXACT_INPUT,
  EXACT_OUTPUT,
}

export enum Rounding {
  ROUND_DOWN,
  ROUND_HALF_UP,
  ROUND_UP,
}

export const MINIMUM_LIQUIDITY = 1000n;

// exports for internal consumption
export const ZERO = 0n;
export const ONE = 1n;
export const TWO = 2n;
export const THREE = 3n;
export const FIVE = 5n;
export const TEN = 10n;
export const _100 = 100n;
export const _9975 = 9975n;
export const _10000 = 10000n;

export const MaxUint256 = BigInt(
  '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
);
