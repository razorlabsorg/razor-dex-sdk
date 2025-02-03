import invariant from 'tiny-invariant'
import { Currency, NativeCurrency, Token } from '@razorlabs/swap-sdk-core'

import { ChainId, WMOVE } from './constants'

/**
 * Ether is the main usage of a 'native' currency, i.e. for Ethereum mainnet and all testnets
 */
export class Move extends NativeCurrency {
  protected constructor(chainId: number) {
    super(chainId, 18, 'MOVE', 'Move Coin')
  }

  public get wrapped(): Token {
    const wmove = WMOVE[this.chainId as ChainId.APTOS_TESTNET | ChainId.BARDOCK_TESTNET | ChainId.MAINNET]

    invariant(!!wmove, 'WRAPPED')

    return wmove
  }

  private static _moveCache: { [chainId: number]: Move } = {}

  public static onChain(chainId: number): Move {
    if (!this._moveCache[chainId]) {
      this._moveCache[chainId] = new Move(chainId)
    }

    return this._moveCache[chainId]
  }

  public equals(other: Currency): boolean {
    return other.isNative && other.chainId === this.chainId
  }
}
