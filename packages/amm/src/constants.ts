import { AccountAddress } from '@aptos-labs/ts-sdk'
import { Percent, Token } from '@razorlabs/swap-sdk-core'

export enum ChainId {
  PORTO_TESTNET = 177,
}

export const ZERO_PERCENT = new Percent('0')
export const ONE_HUNDRED_PERCENT = new Percent('1')

export const AMM_MODULE_ADDRESS = '0x6cea397a12191439cafec2b4890325cc0db63030370a6536796dbb1497a1b493'

export const AMM_SIGNER = '0xba6d76c58a97a3e1f1913ca06707d1b1d90d66d2991b5755d5e11dc740a9f845'

export const STABLE_SWAP_MODULE_ADDRESS = '0x8ea2ce721a4979fe30217fa974ac8ac9e37bb7f9a3dd79f6198a806cd8e620f0'

export const STABLE_SWAP_SIGNER = '0x7c8f3e8cb1b6cea12d00126242bb1ae1837fc5b186bdca7fd12513426854de2b'

export const FACTORY_ADDRESS = `${AMM_MODULE_ADDRESS}::factory`

export const FACTORY_ADDRESS_MAP = {
  [ChainId.PORTO_TESTNET]: FACTORY_ADDRESS,
}

export const WMOVE = {
  [ChainId.PORTO_TESTNET]: new Token(
    ChainId.PORTO_TESTNET,
    AccountAddress.A.toStringLong(),
    8,
    'MOVE',
    'Move coin',
    'https://movementlabs.xyz',
  ),
}

export const WNATIVE: Record<number, Token> = {
  [ChainId.PORTO_TESTNET]: WMOVE[ChainId.PORTO_TESTNET],
}

export const NATIVE: Record<
  number,
  {
    name: string
    symbol: string
    decimals: number
  }
> = {
  [ChainId.PORTO_TESTNET]: {
    name: 'Move Coin',
    symbol: 'MOVE',
    decimals: 8,
  },
}
