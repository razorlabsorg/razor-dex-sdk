import invariant from 'tiny-invariant';
import { Percent } from '../entities';
import { Asset } from '../assets';
import {
  EntryFunctionArgumentTypes,
  SimpleEntryFunctionArgumentTypes,
  TypeArgument,
} from '@aptos-labs/ts-sdk';
import { Trade } from './trade';
import { TradeType } from '../constants';

/**
 * Options for producing the arguments to send call to the router.
 */
export interface TradeOptions {
  /**
   * How much the execution price is allowed to move unfavorably from the trade execution price.
   */
  allowedSlippage: Percent;
  /**
   * How long the swap is valid until it expires, in seconds.
   * This will be used to produce a `deadline` parameter which is computed from when the swap call parameters
   * are generated.
   */
  ttl: number;
  /**
   * The account that should receive the output of the swap.
   */
  recipient: string;

  /**
   * Whether any of the tokens in the path are fee on transfer tokens, which should be handled with special methods
   */
  feeOnTransfer?: boolean;
}

export interface TradeOptionsDeadline extends Omit<TradeOptions, 'ttl'> {
  /**
   * When the transaction expires.
   * This is an alternate to specifying the ttl, for when you do not want to use local time.
   */
  deadline: number;
}

/**
 * The parameters to use in the call to the Router module to execute a trade.
 */
export interface SwapParameters {
  methodName: string;
  typeArgs?: Array<TypeArgument>;
  args?: Array<EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes>;
}

/**
 * Represents the Razor DEX Router module, and has static methods for helping execute trades.
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
    trade: Trade<Asset, Asset, TradeType>,
    options: TradeOptions | TradeOptionsDeadline,
  ): SwapParameters {
    invariant(!('ttl' in options) || options.ttl > 0, 'TTL');

    const to: string = options.recipient;
    const amountIn: string = trade
      .maximumAmountIn(options.allowedSlippage)
      .quotient.toString();
    const amountOut: string = trade
      .minimumAmountOut(options.allowedSlippage)
      .quotient.toString();
    const path: string[] = trade.route.path.map(
      (token: Asset) => token.address,
    );
    const deadline =
      'ttl' in options
        ? `${(Math.floor(new Date().getTime() / 1000) + options.ttl).toString(16)}`
        : `${options.deadline.toString(16)}`;

    const useFeeOnTransfer = Boolean(options.feeOnTransfer);

    let methodName: string;
    let args: Array<
      EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes
    >;
    let typeArgs: Array<TypeArgument>;
    switch (trade.tradeType) {
      case TradeType.EXACT_INPUT:
        methodName = useFeeOnTransfer
          ? 'swapExactTokensForTokensSupportingFeeOnTransferTokens'
          : 'swapExactTokensForTokens';
        args = [amountIn, amountOut, path, to, deadline];
        typeArgs = [];
        break;
      case TradeType.EXACT_OUTPUT:
        invariant(!useFeeOnTransfer, 'EXACT_OUT_FOT');
        methodName = 'swapTokensForExactTokens';
        // (uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline)
        args = [amountOut, amountIn, path, to, deadline];
        typeArgs = [];
        break;
    }
    return {
      methodName,
      args,
      typeArgs,
    };
  }
}
