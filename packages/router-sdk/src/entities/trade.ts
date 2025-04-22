import { Currency, CurrencyAmount, Fraction, Percent, Price, TradeType } from '@razorlabs/swap-sdk-core'
import { Pair, Route as AmmRouteSDK, Trade as AmmTradeSDK } from '@razorlabs/amm-sdk'
import { Pool, Route as ClammRouteSDK, Trade as ClammTradeSDK } from '@razorlabs/clamm-sdk'
import invariant from 'tiny-invariant'
import { ONE, ZERO, ZERO_PERCENT } from '../constants'
import { MixedRouteSDK } from './mixedRoute/route'
import { MixedRouteTrade as MixedRouteTradeSDK } from './mixedRoute/trade'
import { IRoute, MixedRoute, RouteAmm, RouteClamm } from './route'

export class Trade<TInput extends Currency, TOutput extends Currency, TTradeType extends TradeType> {
  public readonly routes: IRoute<TInput, TOutput, Pair | Pool>[]
  public readonly tradeType: TTradeType
  private _outputAmount: CurrencyAmount<TOutput> | undefined
  private _inputAmount: CurrencyAmount<TInput> | undefined

  /**
   * The swaps of the trade, i.e. which routes and how much is swapped in each that
   * make up the trade. May consist of swaps in v2 or v3.
   */
  public readonly swaps: {
    route: IRoute<TInput, TOutput, Pair | Pool>
    inputAmount: CurrencyAmount<TInput>
    outputAmount: CurrencyAmount<TOutput>
  }[]

  //  construct a trade across v2 and v3 routes from pre-computed amounts
  public constructor({
    ammRoutes,
    clammRoutes,
    tradeType,
    mixedRoutes,
  }: {
    ammRoutes: {
      ammRoute: AmmRouteSDK<TInput, TOutput>
      inputAmount: CurrencyAmount<TInput>
      outputAmount: CurrencyAmount<TOutput>
    }[]
    clammRoutes: {
      clammRoute: ClammRouteSDK<TInput, TOutput>
      inputAmount: CurrencyAmount<TInput>
      outputAmount: CurrencyAmount<TOutput>
    }[]
    tradeType: TTradeType
    mixedRoutes?: {
      mixedRoute: MixedRouteSDK<TInput, TOutput>
      inputAmount: CurrencyAmount<TInput>
      outputAmount: CurrencyAmount<TOutput>
    }[]
  }) {
    this.swaps = []
    this.routes = []
    // wrap amm routes
    for (const { ammRoute, inputAmount, outputAmount } of ammRoutes) {
      const route = new RouteAmm(ammRoute)
      this.routes.push(route)
      this.swaps.push({
        route,
        inputAmount,
        outputAmount,
      })
    }
    // wrap clamm routes
    for (const { clammRoute, inputAmount, outputAmount } of clammRoutes) {
      const route = new RouteClamm(clammRoute)
      this.routes.push(route)
      this.swaps.push({
        route,
        inputAmount,
        outputAmount,
      })
    }
    // wrap mixedRoutes
    if (mixedRoutes) {
      for (const { mixedRoute, inputAmount, outputAmount } of mixedRoutes) {
        const route = new MixedRoute(mixedRoute)
        this.routes.push(route)
        this.swaps.push({
          route,
          inputAmount,
          outputAmount,
        })
      }
    }

    if (this.swaps.length === 0) {
      throw new Error('No routes provided when calling Trade constructor')
    }

    this.tradeType = tradeType

    // each route must have the same input and output currency
    const inputCurrency = this.swaps[0].inputAmount.currency
    const outputCurrency = this.swaps[0].outputAmount.currency
    invariant(
      this.swaps.every(({ route }) => inputCurrency.wrapped.equals(route.input.wrapped)),
      'INPUT_CURRENCY_MATCH'
    )
    invariant(
      this.swaps.every(({ route }) => outputCurrency.wrapped.equals(route.output.wrapped)),
      'OUTPUT_CURRENCY_MATCH'
    )

    // pools must be unique inter protocols
    const numPools = this.swaps.map(({ route }) => route.pools.length).reduce((total, cur) => total + cur, 0)
    const poolAddressSet = new Set<string>()
    for (const { route } of this.swaps) {
      for (const pool of route.pools) {
        if (pool instanceof Pool) {
          poolAddressSet.add(Pool.getAddress(pool.token0, pool.token1, (pool as Pool).fee))
        } else if (pool instanceof Pair) {
          const pair = pool
          poolAddressSet.add(Pair.getAddress(pair.token0, pair.token1))
        } else {
          throw new Error('Unexpected pool type in route when constructing trade object')
        }
      }
    }
    invariant(numPools === poolAddressSet.size, 'POOLS_DUPLICATED')
  }

  public get inputAmount(): CurrencyAmount<TInput> {
    if (this._inputAmount) {
      return this._inputAmount
    }

    const inputCurrency = this.swaps[0].inputAmount.currency
    const totalInputFromRoutes = this.swaps
      .map(({ inputAmount }) => inputAmount)
      .reduce((total, cur) => total.add(cur), CurrencyAmount.fromRawAmount(inputCurrency, 0))

    this._inputAmount = totalInputFromRoutes
    return this._inputAmount
  }

  public get outputAmount(): CurrencyAmount<TOutput> {
    if (this._outputAmount) {
      return this._outputAmount
    }

    const outputCurrency = this.swaps[0].outputAmount.currency
    const totalOutputFromRoutes = this.swaps
      .map(({ outputAmount }) => outputAmount)
      .reduce((total, cur) => total.add(cur), CurrencyAmount.fromRawAmount(outputCurrency, 0))

    this._outputAmount = totalOutputFromRoutes
    return this._outputAmount
  }

  private _executionPrice: Price<TInput, TOutput> | undefined

  /**
   * The price expressed in terms of output amount/input amount.
   */
  public get executionPrice(): Price<TInput, TOutput> {
    return (
      this._executionPrice ??
      (this._executionPrice = new Price(
        this.inputAmount.currency,
        this.outputAmount.currency,
        this.inputAmount.quotient,
        this.outputAmount.quotient
      ))
    )
  }

  /**
   * The cached result of the price impact computation
   * @private
   */
  private _priceImpact: Percent | undefined
  /**
   * Returns the percent difference between the route's mid price and the expected execution price
   * In order to exclude token taxes from the price impact calculation, the spot price is calculated
   * using a ratio of values that go into the pools, which are the post-tax input amount and pre-tax output amount.
   */
  public get priceImpact(): Percent {
    if (this._priceImpact) {
      return this._priceImpact
    }

    let spotOutputAmount = CurrencyAmount.fromRawAmount(this.outputAmount.currency, 0)
    for (const { route, inputAmount } of this.swaps) {
      const midPrice = route.midPrice
      spotOutputAmount = spotOutputAmount.add(midPrice.quote(inputAmount))
    }

    // if the total output of this trade is 0, then most likely the post-tax input was also 0, and therefore this swap
    // does not move the pools' market price
    if (spotOutputAmount.equalTo(ZERO)) return ZERO_PERCENT

    const priceImpact = spotOutputAmount.subtract(this.outputAmount).divide(spotOutputAmount)
    this._priceImpact = new Percent(priceImpact.numerator, priceImpact.denominator)

    return this._priceImpact
  }

  /**
   * Get the minimum amount that must be received from this trade for the given slippage tolerance
   * @param slippageTolerance The tolerance of unfavorable slippage from the execution price of this trade
   * @returns The amount out
   */
  public minimumAmountOut(slippageTolerance: Percent, amountOut = this.outputAmount): CurrencyAmount<TOutput> {
    invariant(!slippageTolerance.lessThan(ZERO), 'SLIPPAGE_TOLERANCE')
    if (this.tradeType === TradeType.EXACT_OUTPUT) {
      return amountOut
    } else {
      const slippageAdjustedAmountOut = new Fraction(ONE)
        .add(slippageTolerance)
        .invert()
        .multiply(amountOut.quotient).quotient
      return CurrencyAmount.fromRawAmount(amountOut.currency, slippageAdjustedAmountOut)
    }
  }

  /**
   * Get the maximum amount in that can be spent via this trade for the given slippage tolerance
   * @param slippageTolerance The tolerance of unfavorable slippage from the execution price of this trade
   * @returns The amount in
   */
  public maximumAmountIn(slippageTolerance: Percent, amountIn = this.inputAmount): CurrencyAmount<TInput> {
    invariant(!slippageTolerance.lessThan(ZERO), 'SLIPPAGE_TOLERANCE')
    if (this.tradeType === TradeType.EXACT_INPUT) {
      return amountIn
    } else {
      const slippageAdjustedAmountIn = new Fraction(ONE).add(slippageTolerance).multiply(amountIn.quotient).quotient
      return CurrencyAmount.fromRawAmount(amountIn.currency, slippageAdjustedAmountIn)
    }
  }

  /**
   * Return the execution price after accounting for slippage tolerance
   * @param slippageTolerance the allowed tolerated slippage
   * @returns The execution price
   */
  public worstExecutionPrice(slippageTolerance: Percent): Price<TInput, TOutput> {
    return new Price(
      this.inputAmount.currency,
      this.outputAmount.currency,
      this.maximumAmountIn(slippageTolerance).quotient,
      this.minimumAmountOut(slippageTolerance).quotient
    )
  }

  public static async fromRoutes<TInput extends Currency, TOutput extends Currency, TTradeType extends TradeType>(
    ammRoutes: {
      ammRoute: AmmRouteSDK<TInput, TOutput>
      amount: TTradeType extends TradeType.EXACT_INPUT ? CurrencyAmount<TInput> : CurrencyAmount<TOutput>
    }[],
    clammRoutes: {
      clammRoute: ClammRouteSDK<TInput, TOutput>
      amount: TTradeType extends TradeType.EXACT_INPUT ? CurrencyAmount<TInput> : CurrencyAmount<TOutput>
    }[],
    tradeType: TTradeType,
    mixedRoutes?: {
      mixedRoute: MixedRouteSDK<TInput, TOutput>
      amount: TTradeType extends TradeType.EXACT_INPUT ? CurrencyAmount<TInput> : CurrencyAmount<TOutput>
    }[]
  ): Promise<Trade<TInput, TOutput, TTradeType>> {
    const populatedAmmRoutes: {
      ammRoute: AmmRouteSDK<TInput, TOutput>
      inputAmount: CurrencyAmount<TInput>
      outputAmount: CurrencyAmount<TOutput>
    }[] = []

    const populatedClammRoutes: {
      clammRoute: ClammRouteSDK<TInput, TOutput>
      inputAmount: CurrencyAmount<TInput>
      outputAmount: CurrencyAmount<TOutput>
    }[] = []

    const populatedMixedRoutes: {
      mixedRoute: MixedRouteSDK<TInput, TOutput>
      inputAmount: CurrencyAmount<TInput>
      outputAmount: CurrencyAmount<TOutput>
    }[] = []

    for (const { ammRoute, amount } of ammRoutes) {
      const ammTrade = new AmmTradeSDK(ammRoute, amount, tradeType)
      const { inputAmount, outputAmount } = ammTrade

      populatedAmmRoutes.push({
        ammRoute,
        inputAmount,
        outputAmount,
      })
    }

    for (const { clammRoute, amount } of clammRoutes) {
      const clammTrade = await ClammTradeSDK.fromRoute(clammRoute, amount, tradeType)
      const { inputAmount, outputAmount } = clammTrade

      populatedClammRoutes.push({
        clammRoute,
        inputAmount,
        outputAmount,
      })
    }

    if (mixedRoutes) {
      for (const { mixedRoute, amount } of mixedRoutes) {
        const mixedRouteTrade = await MixedRouteTradeSDK.fromRoute(mixedRoute, amount, tradeType)
        const { inputAmount, outputAmount } = mixedRouteTrade

        populatedMixedRoutes.push({
          mixedRoute,
          inputAmount,
          outputAmount,
        })
      }
    }

    return new Trade({
      ammRoutes: populatedAmmRoutes,
      clammRoutes: populatedClammRoutes,
      mixedRoutes: populatedMixedRoutes,
      tradeType,
    })
  }

  public static async fromRoute<TInput extends Currency, TOutput extends Currency, TTradeType extends TradeType>(
    route: AmmRouteSDK<TInput, TOutput> | ClammRouteSDK<TInput, TOutput> | MixedRouteSDK<TInput, TOutput>,
    amount: TTradeType extends TradeType.EXACT_INPUT ? CurrencyAmount<TInput> : CurrencyAmount<TOutput>,
    tradeType: TTradeType
  ): Promise<Trade<TInput, TOutput, TTradeType>> {
    let ammRoutes: {
      ammRoute: AmmRouteSDK<TInput, TOutput>
      inputAmount: CurrencyAmount<TInput>
      outputAmount: CurrencyAmount<TOutput>
    }[] = []

    let clammRoutes: {
      clammRoute: ClammRouteSDK<TInput, TOutput>
      inputAmount: CurrencyAmount<TInput>
      outputAmount: CurrencyAmount<TOutput>
    }[] = []

    let mixedRoutes: {
      mixedRoute: MixedRouteSDK<TInput, TOutput>
      inputAmount: CurrencyAmount<TInput>
      outputAmount: CurrencyAmount<TOutput>
    }[] = []

    if (route instanceof AmmRouteSDK) {
      const v2Trade = new AmmTradeSDK(route, amount, tradeType)
      const { inputAmount, outputAmount } = v2Trade
      ammRoutes = [{ ammRoute: route, inputAmount, outputAmount }]
    } else if (route instanceof ClammRouteSDK) {
      const v3Trade = await ClammTradeSDK.fromRoute(route, amount, tradeType)
      const { inputAmount, outputAmount } = v3Trade
      clammRoutes = [{ clammRoute: route, inputAmount, outputAmount }]
    } else if (route instanceof MixedRouteSDK) {
      const mixedRouteTrade = await MixedRouteTradeSDK.fromRoute(route, amount, tradeType)
      const { inputAmount, outputAmount } = mixedRouteTrade
      mixedRoutes = [{ mixedRoute: route, inputAmount, outputAmount }]
    } else {
      throw new Error('Invalid route type')
    }

    return new Trade({
      ammRoutes,
      clammRoutes,
      mixedRoutes,
      tradeType,
    })
  }
}
