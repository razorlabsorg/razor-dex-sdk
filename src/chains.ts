export enum ChainId {
  MOVEMENT_SUZUKA = 27,
  MOVEMENT_IMOLA = 30732,
  MOVEMENT_BAKU = 100,
  APTOS_MAINNET = 1,
  APTOS_TESTNET = 2,
  APTOS_DEVNET = 146,
  SUI_MAINNET = 1000,
  SUI_TESTNET = 1001,
  SUI_DEVNET = 1002,
}

export const SUPPORTED_CHAINS = [
  ChainId.APTOS_DEVNET,
  ChainId.APTOS_TESTNET,
] as const;

export type SupportedChainsType = (typeof SUPPORTED_CHAINS)[number];

export enum NativeCurrencyName {
  MOVE = 'MOVE',
  APT = 'APT',
  SUI = 'SUI',
}
