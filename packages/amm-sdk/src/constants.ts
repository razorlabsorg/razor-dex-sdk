import { AccountAddress } from '@aptos-labs/ts-sdk'
import { ChainId, Percent, Token } from '@razorlabs/swap-sdk-core'

export const ZERO_PERCENT = new Percent('0')
export const ONE_HUNDRED_PERCENT = new Percent('1')

export const AMM_MODULE_ADDRESS = '0xc4e68f29fa608d2630d11513c8de731b09a975f2f75ea945160491b9bfd36992'

export const AMM_SIGNER = '0xf317511756cb5bd755a7456ad900974645788926742b39d81771e17cd54b1c80'

export const FACTORY_ADDRESS = `${AMM_MODULE_ADDRESS}::amm_factory`

export const FACTORY_ADDRESS_MAP = {
  [ChainId.BARDOCK_TESTNET]: FACTORY_ADDRESS,
  [ChainId.MAINNET]: FACTORY_ADDRESS,
}

export const WMOVE = {
  [ChainId.BARDOCK_TESTNET]: new Token(
    ChainId.BARDOCK_TESTNET,
    AccountAddress.A.toStringLong(),
    8,
    'MOVE',
    'Move Coin',
    'https://movementlabs.xyz',
  ),
  [ChainId.MAINNET]: new Token(
    ChainId.MAINNET,
    AccountAddress.A.toStringLong(),
    8,
    'MOVE',
    'Move Coin',
    'https://movementlabs.xyz',
  ),
}

export const WNATIVE: Record<number, Token> = {
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
