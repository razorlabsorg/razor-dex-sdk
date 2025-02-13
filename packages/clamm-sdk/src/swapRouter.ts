import { BigintIsh, Currency, CurrencyAmount, Percent, TradeType } from '@razorlabs/swap-sdk-core'

import invariant from 'tiny-invariant'
import { Trade } from './entities/trade'
import { encodeRouteToPath } from './utils'
import { FeeOptions } from './payments'
import { EntryFunctionArgumentTypes, SimpleEntryFunctionArgumentTypes, TypeArgument } from '@aptos-labs/ts-sdk'

/**
 * Options for producing the arguments to send calls to the router.
 */
export interface SwapOptions {
  /**
   * How much the execution price is allowed to move unfavorably from the trade execution price.
   */
  slippageTolerance: Percent

  /**
   * The account that should receive the output.
   */
  recipient: string

  /**
   * When the transaction expires, in epoch seconds.
   */
  deadline: BigintIsh

  /**
   * The optional price limit for the trade.
   */
  sqrtPriceLimitX96?: BigintIsh

  /**
   * Optional information for taking a fee on output.
   */
  fee?: FeeOptions
}

export interface SwapParameters {
  methodName: string
  typeArgs?: Array<TypeArgument>
  args?: Array<EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes>
}

/**
 * Represents the Razordex CLMM SwapRouter, and has static methods for helping execute trades.
 */
export abstract class SwapRouter {
  /**
   * Cannot be constructed.
   */
  private constructor() {}

  /**
   * Produces the on-chain method name to call and the hex encoded parameters to pass as arguments for a given trade.
   * @param trade to produce call parameters for
   * @param options options for the call parameters
   */
  public static swapCallParameters(
    trades: Trade<Currency, Currency, TradeType> | Trade<Currency, Currency, TradeType>[],
    options: SwapOptions,
  ): SwapParameters {
    if (!Array.isArray(trades)) {
      trades = [trades]
    }

    const sampleTrade = trades[0]
    const tokenIn = sampleTrade.inputAmount.currency.wrapped
    const tokenOut = sampleTrade.outputAmount.currency.wrapped

    // All trades should have the same starting and ending token.
    invariant(
      trades.every((trade) => trade.inputAmount.currency.wrapped.equals(tokenIn)),
      'TOKEN_IN_DIFF',
    )
    invariant(
      trades.every((trade) => trade.outputAmount.currency.wrapped.equals(tokenOut)),
      'TOKEN_OUT_DIFF',
    )

    const ZERO_IN: CurrencyAmount<Currency> = CurrencyAmount.fromRawAmount(trades[0].inputAmount.currency, 0)
    const ZERO_OUT: CurrencyAmount<Currency> = CurrencyAmount.fromRawAmount(trades[0].outputAmount.currency, 0)

    const totalAmountOut: CurrencyAmount<Currency> = trades.reduce(
      (sum, trade) => sum.add(trade.minimumAmountOut(options.slippageTolerance)),
      ZERO_OUT,
    )

    // flag for whether a refund needs to happen
    const inputIsNative = sampleTrade.inputAmount.currency.isNative

    const totalValue: CurrencyAmount<Currency> = inputIsNative
      ? trades.reduce((sum, trade) => sum.add(trade.maximumAmountIn(options.slippageTolerance)), ZERO_IN)
      : ZERO_IN

    const recipient = options.recipient
    const deadline = BigInt(options.deadline)

    let methodName: string
    let args: Array<EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes>
    let typeArgs: Array<TypeArgument>

    for (const trade of trades) {
      for (const { route, inputAmount, outputAmount } of trade.swaps) {
        const amountIn = BigInt(trade.maximumAmountIn(options.slippageTolerance, inputAmount).quotient)
        const amountOut = BigInt(trade.minimumAmountOut(options.slippageTolerance, outputAmount).quotient)

        // flag for whether the trade is single hop or not
        const singleHop = route.pools.length === 1

        if (singleHop) {
          if (trade.tradeType === TradeType.EXACT_INPUT) {
            const exactInputSingleParams = [
              route.tokenPath[0].address,
              route.tokenPath[1].address,
              route.pools[0].fee,
              recipient,
              deadline,
              amountIn,
              amountOut,
              BigInt(options.sqrtPriceLimitX96 ?? 0),
            ]

            return {
              methodName: 'exact_input_single',
              args: exactInputSingleParams,
              typeArgs: [],
            }
          } else {
            const exactOutputSingleParams = [
              route.tokenPath[0].address,
              route.tokenPath[1].address,
              route.pools[0].fee,
              recipient,
              deadline,
              amountOut,
              amountIn,
              BigInt(options.sqrtPriceLimitX96 ?? 0),
            ]

            return {
              methodName: 'exact_output_single',
              args: exactOutputSingleParams,
              typeArgs: [],
            }
          }
        } else {
          invariant(options.sqrtPriceLimitX96 === undefined, 'MULTIHOP_PRICE_LIMIT')

          const path = encodeRouteToPath(route, trade.tradeType === TradeType.EXACT_OUTPUT)

          if (trade.tradeType === TradeType.EXACT_INPUT) {
            const exactInputParams = [path, recipient, deadline, amountIn, amountOut]

            return {
              methodName: 'exact_input',
              args: exactInputParams,
              typeArgs: [],
            }
          } else {
            const exactOutputParams = [path, recipient, deadline, amountOut, amountIn]

            return {
              methodName: 'exact_output',
              args: exactOutputParams,
              typeArgs: [],
            }
          }
        }
      }
    }

    invariant(false, 'UNEXPECTED_CALL_PARAMETERS')
  }
}
