import { ChainId } from '@razorlabs/swap-sdk-core'

const ROUTER_MODULE = 'clamm_router'

export const CLAMM_ADDRESS = '0x762ede3a7d66b0e13ffebe62613ead8b70c7c276b1e822e41ef71563f3b30ed9'
export const CLAMM_SIGNER = '0x6f9d0db9822035a2e8a195308ab8a9b8645ac97a6ea2ac336ceea46c473494ac'
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
