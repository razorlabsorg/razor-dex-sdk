import JSBI from 'jsbi';
export type BigintIsh = JSBI | number | string;
export declare enum TradeType {
    EXACT_INPUT = 0,
    EXACT_OUTPUT = 1
}
export declare enum Rounding {
    ROUND_DOWN = 0,
    ROUND_HALF_UP = 1,
    ROUND_UP = 2
}
export declare const MINIMUM_LIQUIDITY: JSBI;
export declare const ZERO: JSBI;
export declare const ONE: JSBI;
export declare const TWO: JSBI;
export declare const THREE: JSBI;
export declare const FIVE: JSBI;
export declare const TEN: JSBI;
export declare const _100: JSBI;
export declare const _9975: JSBI;
export declare const _10000: JSBI;
export declare const MaxU256: JSBI;
export declare enum MoveType {
    u8 = "u8",
    u16 = "u16",
    u32 = "u32",
    u64 = "u64",
    u128 = "u128",
    u256 = "u256"
}
export declare const MOVE_TYPE_MAXIMA: {
    u8: JSBI;
    u16: JSBI;
    u32: JSBI;
    u64: JSBI;
    u128: JSBI;
    u256: JSBI;
};
