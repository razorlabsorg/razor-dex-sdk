// entities/route.ts

import { Route as AmmRouteSDK, Pair } from '@razorlabs/amm-sdk'
import { Route as ClammRouteSDK, Pool } from '@razorlabs/clamm-sdk'
import { Protocol } from './protocol'
import { Currency, Price, Token } from '@razorlabs/swap-sdk-core'
import { MixedRouteSDK } from './mixedRoute/route'

export interface IRoute<TInput extends Currency, TOutput extends Currency, TPool extends Pool | Pair> {
  protocol: Protocol
  // array of pools if v3 or pairs if v2
  pools: TPool[]
  path: Token[]
  midPrice: Price<TInput, TOutput>
  input: TInput
  output: TOutput
}

// AMM route wrapper
export class RouteAmm<TInput extends Currency, TOutput extends Currency>
  extends AmmRouteSDK<TInput, TOutput>
  implements IRoute<TInput, TOutput, Pair>
{
  public readonly protocol: Protocol = Protocol.AMM
  public readonly pools: Pair[]

  constructor(ammRoute: AmmRouteSDK<TInput, TOutput>) {
    super(ammRoute.pairs, ammRoute.input, ammRoute.output)
    this.pools = this.pairs
  }
}

// CLAMM route wrapper
export class RouteClamm<TInput extends Currency, TOutput extends Currency>
  extends ClammRouteSDK<TInput, TOutput>
  implements IRoute<TInput, TOutput, Pool>
{
  public readonly protocol: Protocol = Protocol.CLAMM
  public readonly path: Token[]

  constructor(clammRoute: ClammRouteSDK<TInput, TOutput>) {
    super(clammRoute.pools, clammRoute.input, clammRoute.output)
    this.path = clammRoute.tokenPath
  }
}

// Mixed route wrapper
export class MixedRoute<TInput extends Currency, TOutput extends Currency>
  extends MixedRouteSDK<TInput, TOutput>
  implements IRoute<TInput, TOutput, Pool | Pair>
{
  public readonly protocol: Protocol = Protocol.MIXED

  constructor(mixedRoute: MixedRouteSDK<TInput, TOutput>) {
    super(mixedRoute.pools, mixedRoute.input, mixedRoute.output)
  }
}
