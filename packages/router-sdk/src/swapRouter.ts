import { BigintIsh, Currency, CurrencyAmount, Percent, TradeType } from '@razorlabs/swap-sdk-core'

import invariant from 'tiny-invariant'
import { Trade } from './entities/trade'

import { EntryFunctionArgumentTypes, InputEntryFunctionData, SimpleEntryFunctionArgumentTypes, TypeArgument } from '@aptos-labs/ts-sdk'
import { FeeOptions, Trade as ClammTrade, encodeRouteToPath, Pool, Position } from '@razorlabs/clamm-sdk'
import { Trade as AmmTrade } from '@razorlabs/amm-sdk'
import { MixedRouteTrade } from './entities/mixedRoute/trade'
import { MixedRouteSDK } from './entities/mixedRoute/route'
import { getOutputOfPools, partitionMixedRouteByProtocol } from './utils'
import { MixedRoute, RouteAmm, RouteClamm } from './entities/route'
import { encodeMixedRouteToPath } from './utils/encodeMixedRouteToPath'
import { Protocol } from './entities/protocol'

const REFUND_MOVE_PRICE_IMPACT_THRESHOLD = new Percent(BigInt(50), BigInt(100))

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

type AnyTradeType =
  | Trade<Currency, Currency, TradeType>
  | AmmTrade<Currency, Currency, TradeType>
  | ClammTrade<Currency, Currency, TradeType>
  | MixedRouteTrade<Currency, Currency, TradeType>
  | (
      | AmmTrade<Currency, Currency, TradeType>
      | ClammTrade<Currency, Currency, TradeType>
      | MixedRouteTrade<Currency, Currency, TradeType>
    )[]

/**
 * Represents the Razordex AMM + CLAMM SwapRouter, and has static methods for helping execute trades.
 */
export abstract class SwapRouter {
  /**
   * Cannot be constructed.
   */
  private constructor() {}

  /**
   * @notice Generates the function call parameters for a Swap with a AMM Route.
   * @param trade The V2Trade to encode.
   * @param options SwapOptions to use for the trade.
   * @param performAggregatedSlippageCheck Flag for whether we want to perform an aggregated slippage check
   * @returns function call parameters for the trade.
   */
  public static encodeAmmSwap(
    trade: AmmTrade<Currency, Currency, TradeType>,
    options: SwapOptions,
    performAggregatedSlippageCheck: boolean
  ): SwapParameters {
    const moveIn = trade.inputAmount.currency.isNative
    const moveOut = trade.outputAmount.currency.isNative
    // the router does not support both move in and out
    invariant(!(moveIn && moveOut), 'MOVE_IN_OUT')

    const recipient: string = options.recipient
    const amountIn = Number(trade.maximumAmountIn(options.slippageTolerance).quotient.toString())
    const amountOut = Number(trade.minimumAmountOut(options.slippageTolerance).quotient.toString())

    const path: string[] = trade.route.path.map((token) => token.address)
    const deadline = options.deadline

    let methodName: string
    let args: InputEntryFunctionData['functionArguments']
    switch (trade.tradeType) {
      case TradeType.EXACT_INPUT:
        if (moveIn) {
          methodName = 'swap_exact_move_for_tokens'
          args = [amountIn, performAggregatedSlippageCheck ? 0 : amountOut, path, recipient, deadline]
        } else if (moveOut) {
          methodName = 'swap_exact_tokens_for_move'
          args = [amountIn, performAggregatedSlippageCheck ? 0 : amountOut, path, recipient, deadline]
        } else {
          methodName = 'swap_exact_tokens_for_tokens'
          args = [amountIn, performAggregatedSlippageCheck ? 0 : amountOut, path, recipient, deadline]
        }
        break
      case TradeType.EXACT_OUTPUT:
        if (moveIn) {
          methodName = 'swap_move_for_exact_tokens'
          args = [amountIn, amountOut, path, recipient, deadline]
        } else if (moveOut) {
          methodName = 'swap_tokens_for_exact_move'
          args = [amountOut, amountIn, path, recipient, deadline]
        } else {
          methodName = 'swap_tokens_for_exact_tokens'
          args = [amountOut, amountIn, path, recipient, deadline]
        }
        break
    }
    return {
      methodName,
      args,
    }
  }

  /**
   * @notice Generates the function call parameters for a Swap with a CLAMM Route.
   * @param trade The V3Trade to encode.
   * @param options SwapOptions to use for the trade.
   * @param performAggregatedSlippageCheck Flag for whether we want to perform an aggregated slippage check
   * @returns A array of function call parameters for the trade.
   */
  public static encodeClammSwap(
    trade: ClammTrade<Currency, Currency, TradeType>,
    options: SwapOptions,
    performAggregatedSlippageCheck: boolean
  ): SwapParameters[] {
    const swaps: SwapParameters[] = []
    const recipient = options.recipient
    const deadline = BigInt(options.deadline)

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
            performAggregatedSlippageCheck ? 0 : amountOut,
            BigInt(options.sqrtPriceLimitX96 ?? 0),
          ]

          swaps.push({
            methodName: 'exact_input_single',
            args: exactInputSingleParams,
            typeArgs: [],
          })
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

          swaps.push({
            methodName: 'exact_output_single',
            args: exactOutputSingleParams,
            typeArgs: [],
          })
        }
      } else {
        invariant(options.sqrtPriceLimitX96 === undefined, 'MULTIHOP_PRICE_LIMIT')

        const path = encodeRouteToPath(route, trade.tradeType === TradeType.EXACT_OUTPUT)

        if (trade.tradeType === TradeType.EXACT_INPUT) {
          const exactInputParams = [path, recipient, deadline, amountIn, performAggregatedSlippageCheck ? 0 : amountOut]

          swaps.push({
            methodName: 'exact_input',
            args: exactInputParams,
            typeArgs: [],
          })
        } else {
          const exactOutputParams = [path, recipient, deadline, amountOut, amountIn]

          swaps.push({
            methodName: 'exact_output',
            args: exactOutputParams,
            typeArgs: [],
          })
        }
      }
    }

    return swaps
  }


  /**
   * @notice Generates the function call parameters for a MixedRouteSwap. Since single hop routes are not MixedRoutes, we will instead generate
   *         them via the existing encodeClammSwap and encodeAmmSwap methods.
   * @param trade The MixedRouteTrade to encode.
   * @param options SwapOptions to use for the trade.
   * @param performAggregatedSlippageCheck Flag for whether we want to perform an aggregated slippage check
   * @returns A array of function call parameters for the trade.
   */
  public static encodeMixedRouteSwap(
    trade: MixedRouteTrade<Currency, Currency, TradeType>,
    options: SwapOptions,
    performAggregatedSlippageCheck: boolean
  ): SwapParameters[] {
    const swaps: SwapParameters[] = []

    invariant(trade.tradeType === TradeType.EXACT_INPUT, 'TRADE_TYPE')

    for (const { route, inputAmount, outputAmount } of trade.swaps) {
      const amountIn = BigInt(trade.maximumAmountIn(options.slippageTolerance, inputAmount).quotient)
      const amountOut = BigInt(trade.minimumAmountOut(options.slippageTolerance, outputAmount).quotient)

      const singleHop = route.pools.length === 1
      const recipient = options.recipient
      const deadline = BigInt(options.deadline)

      const mixedRouteIsAllClamm = (route: MixedRouteSDK<Currency, Currency>) => {
        return route.pools.every((pool) => pool instanceof Pool)
      }

      if (singleHop) {
        /// For single hop, since it isn't really a mixedRoute, we'll just mimic behavior of V3 or V2
        /// We don't use encodeV3Swap() or encodeV2Swap() because casting the trade to a V3Trade or V2Trade is overcomplex
        if (mixedRouteIsAllClamm(route)) {
          const exactInputSingleParams = [
            route.path[0].address,
            route.path[1].address,
            (route.pools as Pool[])[0].fee,
            recipient,
            deadline,
            amountIn,
            performAggregatedSlippageCheck ? 0 : amountOut,
            BigInt(options.sqrtPriceLimitX96 ?? 0),
          ]

          swaps.push({
            methodName: 'exact_input_single',
            args: exactInputSingleParams,
            typeArgs: [],
          })
        } else {
          const path = route.path.map((token) => token.address)

          const exactInputParams = [amountIn, performAggregatedSlippageCheck ? 0 : amountOut, path, recipient, deadline]

          swaps.push({
            methodName: 'swap_exact_tokens_for_tokens',
            args: exactInputParams,
            typeArgs: [],
          })
        }
      } else {
        const sections = partitionMixedRouteByProtocol(route)

        const isLastSectionInRoute = (i: number) => {
          return i === sections.length - 1
        }

        let outputToken
        let inputToken = route.input.wrapped

        for (let i = 0; i < sections.length; i++) {
          const section = sections[i]
          /// Now, we get output of this section
          outputToken = getOutputOfPools(section, inputToken)

          const newRouteOriginal = new MixedRouteSDK(
            [...section],
            section[0].token0.equals(inputToken) ? section[0].token0 : section[0].token1,
            outputToken
          )
          const newRoute = new MixedRoute(newRouteOriginal)

          /// Previous output is now input
          inputToken = outputToken

          if (mixedRouteIsAllClamm(newRoute)) {
            const path: Uint8Array = encodeMixedRouteToPath(newRoute)
            const exactInputParams = [
              path,
              recipient,
              deadline,
              i === 0 ? amountIn : 0,
              !isLastSectionInRoute(i) ? 0 : amountOut,
            ]

            swaps.push({
              methodName: 'exact_input',
              args: exactInputParams,
              typeArgs: [],
            })
          } else {
            const exactInputParams = [
              i === 0 ? amountIn : 0, // amountIn
              !isLastSectionInRoute(i) ? 0 : amountOut, // amountOutMin
              newRoute.path.map((token) => token.address), // path
              recipient, // to
              deadline,
            ]

            swaps.push({
              methodName: 'swap_exact_tokens_for_tokens',
              args: exactInputParams,
              typeArgs: [],
            })
          }
        }
      } 
    }

    return swaps
  }

  private static encodeSwaps(
    trades: AnyTradeType,
    options: SwapOptions,
  ): {
    payloads: SwapParameters[],
    inputIsNative: boolean
    outputIsNative: boolean
    totalAmountIn: CurrencyAmount<Currency>
    minimumAmountOut: CurrencyAmount<Currency>
    quoteAmountOut: CurrencyAmount<Currency>
  } {
    // If dealing with an instance of the aggregated Trade object, unbundle it to individual trade objects.
    if (trades instanceof Trade) {
      invariant(
        trades.swaps.every(
          (swap) =>
            swap.route.protocol === Protocol.CLAMM ||
            swap.route.protocol === Protocol.AMM ||
            swap.route.protocol === Protocol.MIXED
        ),
        'UNSUPPORTED_PROTOCOL'
      )

      let individualTrades: (
        | ClammTrade<Currency, Currency, TradeType>
        | AmmTrade<Currency, Currency, TradeType>
        | MixedRouteTrade<Currency, Currency, TradeType>
      )[] = []

      for (const { route, inputAmount, outputAmount } of trades.swaps) {
        if (route.protocol === Protocol.AMM) {
          individualTrades.push(
            new AmmTrade(
              route as RouteAmm<Currency, Currency>,
              trades.tradeType === TradeType.EXACT_INPUT ? inputAmount : outputAmount,
              trades.tradeType
            )
          )
        } else if (route.protocol === Protocol.CLAMM) {
          individualTrades.push(
            ClammTrade.createUncheckedTrade({
              route: route as RouteClamm<Currency, Currency>,
              inputAmount,
              outputAmount,
              tradeType: trades.tradeType,
            })
          )
        } else if (route.protocol === Protocol.MIXED) {
          individualTrades.push(
            /// we can change the naming of this function on MixedRouteTrade if needed
            MixedRouteTrade.createUncheckedTrade({
              route: route as MixedRoute<Currency, Currency>,
              inputAmount,
              outputAmount,
              tradeType: trades.tradeType,
            })
          )
        } else {
          throw new Error('UNSUPPORTED_TRADE_PROTOCOL')
        }
      }
      trades = individualTrades
    }

    if (!Array.isArray(trades)) {
      trades = [trades]
    }

    const numberOfTrades = trades.reduce(
      (numberOfTrades, trade) =>
        numberOfTrades + (trade instanceof ClammTrade || trade instanceof MixedRouteTrade ? trade.swaps.length : 1),
      0
    )

    const sampleTrade = trades[0]

    // All trades should have the same starting/ending currency and trade type
    invariant(
      trades.every((trade) => trade.inputAmount.currency.equals(sampleTrade.inputAmount.currency)),
      'TOKEN_IN_DIFF'
    )
    invariant(
      trades.every((trade) => trade.outputAmount.currency.equals(sampleTrade.outputAmount.currency)),
      'TOKEN_OUT_DIFF'
    )
    invariant(
      trades.every((trade) => trade.tradeType === sampleTrade.tradeType),
      'TRADE_TYPE_DIFF'
    )

    const payloads: SwapParameters[] = []

    const inputIsNative = sampleTrade.inputAmount.currency.isNative
    const outputIsNative = sampleTrade.outputAmount.currency.isNative

    // flag for whether we want to perform an aggregated slippage check
    //   1. when there are >2 exact input trades. this is only a heuristic,
    //      as it's still more gas-expensive even in this case, but has benefits
    //      in that the reversion probability is lower
    const performAggregatedSlippageCheck = sampleTrade.tradeType === TradeType.EXACT_INPUT && numberOfTrades > 2
    
    for (const trade of trades) {
      if (trade instanceof AmmTrade) {
        payloads.push(SwapRouter.encodeAmmSwap(trade, options, performAggregatedSlippageCheck))
      } else if (trade instanceof ClammTrade) {
        for (const payload of SwapRouter.encodeClammSwap(
          trade,
          options,
          performAggregatedSlippageCheck
        )) {
          payloads.push(payload)
        }
      } else if (trade instanceof MixedRouteTrade) {
        for (const payload of SwapRouter.encodeMixedRouteSwap(
          trade,
          options,
          performAggregatedSlippageCheck
        )) {
          payloads.push(payload)
        }
      } else {
        throw new Error('Unsupported trade object')
      }
    }

    const ZERO_IN: CurrencyAmount<Currency> = CurrencyAmount.fromRawAmount(sampleTrade.inputAmount.currency, 0)
    const ZERO_OUT: CurrencyAmount<Currency> = CurrencyAmount.fromRawAmount(sampleTrade.outputAmount.currency, 0)

    const minimumAmountOut: CurrencyAmount<Currency> = trades.reduce(
      (sum, trade) => sum.add(trade.minimumAmountOut(options.slippageTolerance)),
      ZERO_OUT
    )

    const quoteAmountOut: CurrencyAmount<Currency> = trades.reduce(
      (sum, trade) => sum.add(trade.outputAmount),
      ZERO_OUT
    )

    const totalAmountIn: CurrencyAmount<Currency> = trades.reduce(
      (sum, trade) => sum.add(trade.maximumAmountIn(options.slippageTolerance)),
      ZERO_IN
    )

    return {
      payloads,
      inputIsNative,
      outputIsNative,
      totalAmountIn,
      minimumAmountOut,
      quoteAmountOut,
    }
  }

  /**
   * Produces the on-chain method name to call and the hex encoded parameters to pass as arguments for a given trade.
   * @param trades to produce call parameters for
   * @param options options for the call parameters
   */
  public static swapCallParameters(
    trades:
      | Trade<Currency, Currency, TradeType>
      | AmmTrade<Currency, Currency, TradeType>
      | ClammTrade<Currency, Currency, TradeType>
      | MixedRouteTrade<Currency, Currency, TradeType>
      | (
          | AmmTrade<Currency, Currency, TradeType>
          | ClammTrade<Currency, Currency, TradeType>
          | MixedRouteTrade<Currency, Currency, TradeType>
        )[],
    options: SwapOptions
  ): SwapParameters[] {
    const {
      payloads
    } = SwapRouter.encodeSwaps(trades, options)

    return payloads
  }

  // if price impact is very high, there's a chance of hitting max/min prices resulting in a partial fill of the swap
  private static riskOfPartialFill(trades: AnyTradeType): boolean {
    if (Array.isArray(trades)) {
      return trades.some((trade) => {
        return SwapRouter.clammTradeWithHighPriceImpact(trade)
      })
    } else {
      return SwapRouter.clammTradeWithHighPriceImpact(trades)
    }
  }

  private static clammTradeWithHighPriceImpact(
    trade:
      | Trade<Currency, Currency, TradeType>
      | AmmTrade<Currency, Currency, TradeType>
      | ClammTrade<Currency, Currency, TradeType>
      | MixedRouteTrade<Currency, Currency, TradeType>
  ): boolean {
    return !(trade instanceof AmmTrade) && trade.priceImpact.greaterThan(REFUND_MOVE_PRICE_IMPACT_THRESHOLD)
  }

  private static getPositionAmounts(
    position: Position,
    zeroForOne: boolean
  ): {
    positionAmountIn: CurrencyAmount<Currency>
    positionAmountOut: CurrencyAmount<Currency>
  } {
    const { amount0, amount1 } = position.mintAmounts
    const currencyAmount0 = CurrencyAmount.fromRawAmount(position.pool.token0, amount0)
    const currencyAmount1 = CurrencyAmount.fromRawAmount(position.pool.token1, amount1)

    const [positionAmountIn, positionAmountOut] = zeroForOne
      ? [currencyAmount0, currencyAmount1]
      : [currencyAmount1, currencyAmount0]
    return { positionAmountIn, positionAmountOut }
  }

}
