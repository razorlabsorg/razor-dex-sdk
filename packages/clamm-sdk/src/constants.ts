import { ChainId } from '@razorlabs/swap-sdk-core'

const ROUTER_MODULE = 'clamm_router'

export const CLAMM_ADDRESS = '0xbbcafa9a62a156cb38480e90d22415b7033faebf01df69d3ca1ed893b6c6ba59'
export const CLAMM_ROUTER_ADDRESS = `${CLAMM_ADDRESS}::${ROUTER_MODULE}`

export const FACTORY_ADDRESSES = {
  [ChainId.BARDOCK_TESTNET]: `${CLAMM_ADDRESS}::clamm_factory`,
  [ChainId.MAINNET]: `${CLAMM_ADDRESS}::clamm_factory`,
} as const satisfies Record<ChainId, string>

export const NFT_POSITION_MANAGER_ADDRESS = {
  [ChainId.BARDOCK_TESTNET]: `${CLAMM_ADDRESS}::clamm_position_manager`,
  [ChainId.MAINNET]: `${CLAMM_ADDRESS}::clamm_position_manager`,
} as const satisfies Record<ChainId, string>

export enum FeeAmount {
  LOWEST = 100,
  LOW = 500,
  MEDIUM = 2500,
  HIGH = 10000,
}

export const TICK_SPACINGS: { [amount in FeeAmount]: number } = {
  [FeeAmount.LOWEST]: 1,
  [FeeAmount.LOW]: 10,
  [FeeAmount.MEDIUM]: 50,
  [FeeAmount.HIGH]: 200,
}
