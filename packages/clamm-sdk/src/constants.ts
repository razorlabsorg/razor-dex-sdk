import { ChainId } from '@razorlabs/swap-sdk-core'

const ROUTER_MODULE = 'clamm_router'

export const CLAMM_ADDRESS = '0x3b8d53bb8a6dc02a3ae90f993b2af02f5eb25ab2b27b85806de62457ed4901f0'
export const CLAMM_SIGNER = '0x767124c51624f4b99f0b985d811f448e1bee866e6a2959a93c608b4254b4e861'
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
