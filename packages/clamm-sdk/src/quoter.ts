import { BigintIsh, Currency, CurrencyAmount, TradeType } from '@razorlabs/swap-sdk-core'
import { CLAMM_ADDRESS, FeeAmount } from './constants'
import { Aptos, InputEntryFunctionData, InputSimulateTransactionData } from '@aptos-labs/ts-sdk'
import { Route } from './entities'
import invariant from 'tiny-invariant'
import { encodeRouteToPath } from './utils'

export interface QuoteOptions {
  /**
   * The optional price limit for the trade.
   */
  sqrtPriceLimitX96?: BigintIsh
  recipient?: string
}

interface BaseQuoteParams {
  fee: FeeAmount
  sqrtPriceLimitX96: bigint
  tokenIn: string
  tokenOut: string
  amount: bigint
}

export abstract class SwapQuoter {
  public static quoteCallParameters<TInput extends Currency, TOutput extends Currency>(
    route: Route<TInput, TOutput>,
    amount: CurrencyAmount<TInput | TOutput>,
    tradeType: TradeType,
    options: QuoteOptions = {},
  ): InputEntryFunctionData {
    const singleHop = route.pools.length === 1
    const quoteAmount = amount.quotient

    const recipient = options.recipient

    let payload: InputEntryFunctionData

    if (singleHop) {
      const baseQuoteParams: BaseQuoteParams = {
        tokenIn: route.tokenPath[0].address,
        tokenOut: route.tokenPath[1].address,
        sqrtPriceLimitX96: BigInt(options?.sqrtPriceLimitX96 ?? 0),
        fee: route.pools[0].fee,
        amount: quoteAmount,
      }

      const tradeTypeFunctionName =
        tradeType === TradeType.EXACT_INPUT ? 'quote_exact_input_single' : 'quote_exact_output_single'

      payload = {
        function: `${CLAMM_ADDRESS}::router::${tradeTypeFunctionName}`,
        functionArguments: [
          baseQuoteParams.tokenIn,
          baseQuoteParams.tokenOut,
          baseQuoteParams.fee,
          recipient,
          baseQuoteParams.amount,
          baseQuoteParams.sqrtPriceLimitX96,
        ],
        typeArguments: [],
      }
    } else {
      invariant(options?.sqrtPriceLimitX96 === undefined, 'MULTIHOP_PRICE_LIMIT')
      const path = encodeRouteToPath(route, tradeType === TradeType.EXACT_OUTPUT)
      const tradeTypeFunctionName = tradeType === TradeType.EXACT_INPUT ? 'quote_exact_input' : 'quote_exact_output'

      payload = {
        function: `${CLAMM_ADDRESS}::router::${tradeTypeFunctionName}`,
        functionArguments: [path, recipient, quoteAmount],
        typeArguments: [],
      }
    }

    return payload
  }
}
