import { TradeType } from './constants'
import invariant from 'tiny-invariant'
import { MOVE, Percent, Trade } from './entities'
import { InputEntryFunctionData } from '@aptos-labs/ts-sdk'
/**
 * Options for producing the arguments to send call to the router.
 */
export interface TradeOptions {
  /**
   * How much the execution price is allowed to move unfavorably from the trade execution price.
   */
  allowedSlippage: Percent
  /**
   * How long the swap is valid until it expires, in seconds.
   * This will be used to produce a `deadline` parameter which is computed from when the swap call parameters
   * are generated.
   */
  ttl: number
  /**
   * The account that should receive the output of the swap.
   */
  recipient: string
}

export interface TradeOptionsDeadline extends Omit<TradeOptions, 'ttl'> {
  /**
   * When the transaction expires.
   * This is an alternate to specifying the ttl, for when you do not want to use local time.
   */
  deadline: number
}

/**
 * The parameters to use in the call to the Router to execute a trade.
 */
export interface SwapParameters {
  /**
   * The method to call on the Router.
   */
  methodName: string
  /**
   * The arguments to pass to the method, all hex encoded.
   */
  args: InputEntryFunctionData['functionArguments']
}

/**
 * Represents the Razor AMM Router, and has static methods for helping execute trades.
 */
export abstract class Router {
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
    trade: Trade,
    options: TradeOptions | TradeOptionsDeadline,
  ): SwapParameters {
    const moveIn = trade.inputAmount.currency === MOVE
    const moveOut = trade.outputAmount.currency === MOVE
    // the router does not support both move in and out
    invariant(!(moveIn && moveOut), 'MOVE_IN_OUT')
    invariant(!('ttl' in options) || options.ttl > 0, 'TTL')

    const to: string = options.recipient
    const amountIn = Number(trade.maximumAmountIn(options.allowedSlippage).raw.toString())
    const amountOut = Number(trade.minimumAmountOut(options.allowedSlippage).raw.toString())
    const path: string[] = trade.route.path.map((token) => token.address)
    const deadline =
      'ttl' in options
        ? Math.floor(new Date().getTime() / 1000) + options.ttl
        : options.deadline

    let methodName: string
    let args: InputEntryFunctionData['functionArguments']
    switch (trade.tradeType) {
      case TradeType.EXACT_INPUT:
        if (moveIn) {
          methodName = 'swap_exact_move_for_tokens'
          args = [amountIn, amountOut, path, to, deadline]
        } else if (moveOut) {
          methodName = 'swap_exact_tokens_for_move'
          args = [amountIn, amountOut, path, to, deadline]
        } else {
          methodName = 'swap_exact_tokens_for_tokens'
          args = [amountIn, amountOut, path, to, deadline]
        }
        break
      case TradeType.EXACT_OUTPUT:
        if (moveIn) {
          methodName = 'swap_move_for_exact_tokens'
          args = [amountIn, amountOut, path, to, deadline]
        } else if (moveOut) {
          methodName = 'swap_tokens_for_exact_move'
          args = [amountOut, amountIn, path, to, deadline]
        } else {
          methodName = 'swap_tokens_for_exact_tokens'
          args = [amountOut, amountIn, path, to, deadline]
        }
        break
    }
    return {
      methodName,
      args,
    }
  }
}
