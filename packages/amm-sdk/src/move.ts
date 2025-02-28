import invariant from 'tiny-invariant'
import { ChainId, Currency, NativeCurrency, Token } from '@razorlabs/swap-sdk-core'

import { WMOVE } from './constants'

/**
 * Move is the main usage of a 'native' currency, i.e. for Movement mainnet and all testnets
 */
export class Move extends NativeCurrency {
  protected constructor(chainId: number) {
    super(chainId, 8, 'MOVE', 'Move Coin')
  }

  public get wrapped(): Token {
    const wmove = WMOVE[this.chainId as ChainId.MAINNET |ChainId.BARDOCK_TESTNET]

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
