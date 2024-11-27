import JSBI from 'jsbi'

import { MoveType } from '../constants'
import { validateMoveTypeInstance } from '../utils'

/**
 * A currency is any fungible financial instrument on Ethereum, including Ether and all ERC20 tokens.
 *
 * The only instance of the base class `Currency` is Ether.
 */
export class Currency {
  public readonly decimals: number
  public readonly symbol?: string
  public readonly name?: string

  /**
   * The only instance of the base class `Currency`.
   */
  public static readonly MOVE: Currency = new Currency(8, 'MOVE', 'Move Coin')

  /**
   * Constructs an instance of the base class `Currency`. The only instance of the base class `Currency` is `Currency.MOVE`.
   * @param decimals decimals of the currency
   * @param symbol symbol of the currency
   * @param name of the currency
   */
  protected constructor(decimals: number, symbol?: string, name?: string) {
    validateMoveTypeInstance(JSBI.BigInt(decimals), MoveType.u8)

    this.decimals = decimals
    this.symbol = symbol
    this.name = name
  }
}

const MOVE = Currency.MOVE
export { MOVE }
