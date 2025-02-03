import { AccountAddress } from '@aptos-labs/ts-sdk'
import { Percent, Token } from '@razorlabs/swap-sdk-core'

export enum ChainId {
  APTOS_TESTNET = 2,
  BARDOCK_TESTNET = 250,
  MAINNET = 126,
}

export const ZERO_PERCENT = new Percent('0')
export const ONE_HUNDRED_PERCENT = new Percent('1')

export const AMM_MODULE_ADDRESS = '0x6e66732ffeba75dbf24a89f8cf02cb91a5bc3e84e723974bd13e3f09a6b96279'

export const AMM_SIGNER = '0x7babd1b5f687bbdfa3afa54e467de636e2cd8dcc2f72a9c422cc65744f289c40'

export const FACTORY_ADDRESS = `${AMM_MODULE_ADDRESS}::factory`

export const FACTORY_ADDRESS_MAP = {
  [ChainId.APTOS_TESTNET]: FACTORY_ADDRESS,
  [ChainId.BARDOCK_TESTNET]: FACTORY_ADDRESS,
  [ChainId.MAINNET]: FACTORY_ADDRESS,
}

export const WMOVE = {
  [ChainId.APTOS_TESTNET]: new Token(
    ChainId.APTOS_TESTNET,
    AccountAddress.A.toStringLong(),
    8,
    'MOVE',
    'Move coin',
    'https://movementlabs.xyz',
  ),
  [ChainId.BARDOCK_TESTNET]: new Token(
    ChainId.BARDOCK_TESTNET,
    AccountAddress.A.toStringLong(),
    8,
    'MOVE',
    'Move coin',
    'https://movementlabs.xyz',
  ),
  [ChainId.MAINNET]: new Token(
    ChainId.MAINNET,
    AccountAddress.A.toStringLong(),
    8,
    'MOVE',
    'Move coin',
    'https://movementlabs.xyz',
  ),
}

export const WNATIVE: Record<number, Token> = {
  [ChainId.APTOS_TESTNET]: WMOVE[ChainId.APTOS_TESTNET],
  [ChainId.BARDOCK_TESTNET]: WMOVE[ChainId.BARDOCK_TESTNET],
  [ChainId.MAINNET]: WMOVE[ChainId.MAINNET],
}

export const NATIVE: Record<
  number,
  {
    name: string
    symbol: string
    decimals: number
  }
> = {
  [ChainId.APTOS_TESTNET]: {
    name: 'Move Coin',
    symbol: 'MOVE',
    decimals: 8,
  },
  [ChainId.BARDOCK_TESTNET]: {
    name: 'Move Coin',
    symbol: 'MOVE',
    decimals: 8,
  },
  [ChainId.MAINNET]: {
    name: 'Move Coin',
    symbol: 'MOVE',
    decimals: 8,
  },
}
