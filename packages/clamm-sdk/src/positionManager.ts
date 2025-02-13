import { BigintIsh, Currency, CurrencyAmount, ONE, Percent, ZERO } from '@razorlabs/swap-sdk-core'
import { Pool, Position } from './entities'
import { InputEntryFunctionData } from '@aptos-labs/ts-sdk'
import { CLAMM_ADDRESS } from './constants'
import invariant from 'tiny-invariant'

export const MaxUint128 = 2n ** 128n - 1n

export interface MintSpecificOptions {
  /**
   * The account that should receive the minted NFT.
   */
  recipient: string

  /**
   * Creates pool if not initialized before mint.
   */
  createPool?: boolean
}

export interface IncreaseSpecificOptions {
  /**
   * Indicates the ID of the position to increase liquidity for.
   */
  tokenId: BigintIsh

  /**
   * The account that should receive the minted NFT.
   */
  recipient: string
}

/**
 * Options for producing the calldata to add liquidity.
 */
export interface CommonAddLiquidityOptions {
  /**
   * How much the pool price is allowed to move.
   */
  slippageTolerance: Percent

  /**
   * When the transaction expires, in epoch seconds.
   */
  deadline: BigintIsh
}

export type MintOptions = CommonAddLiquidityOptions & MintSpecificOptions
export type IncreaseOptions = CommonAddLiquidityOptions & IncreaseSpecificOptions

export type AddLiquidityOptions = MintOptions | IncreaseOptions

export function isMint(options: AddLiquidityOptions): options is MintOptions {
  return Object.keys(options).some((k) => k === 'recipient')
}

export interface CollectOptions {
  /**
   * Indicates the ID of the position to collect for.
   */
  tokenId: BigintIsh

  /**
   * Expected value of tokensOwed0, including as-of-yet-unaccounted-for fees/liquidity value to be burned
   */
  expectedCurrencyOwed0: CurrencyAmount<Currency>

  /**
   * Expected value of tokensOwed1, including as-of-yet-unaccounted-for fees/liquidity value to be burned
   */
  expectedCurrencyOwed1: CurrencyAmount<Currency>

  /**
   * The account that should receive the tokens.
   */
  recipient: string
}

export interface RemoveLiquidityOptions {
  /**
   * The ID of the token to exit
   */
  tokenId: BigintIsh

  /**
   * The percentage of position liquidity to exit.
   */
  liquidityPercentage: Percent

  /**
   * How much the pool price is allowed to move.
   */
  slippageTolerance: Percent

  /**
   * When the transaction expires, in epoch seconds.
   */
  deadline: BigintIsh

  recipient?: string

  /**
   * Whether the NFT should be burned if the entire position is being exited, by default false.
   */
  burnToken?: boolean

  /**
   * Parameters to be passed on to collect
   */
  collectOptions: Omit<CollectOptions, 'tokenId'>
}

export abstract class PositionManager {
  private constructor() {}

  private static createCallParameters(pool: Pool): InputEntryFunctionData {
    return {
      function: `${CLAMM_ADDRESS}::position_manager::create_and_initialize_if_necessary`,
      functionArguments: [pool.token0.address, pool.token0.address, pool.fee, pool.sqrtRatioX96],
      typeArguments: [],
    }
  }

  public static addCallParameters(position: Position, options: AddLiquidityOptions): InputEntryFunctionData[] {
    invariant(position.liquidity > ZERO, 'ZERO_LIQUIDITY')

    const payloads: InputEntryFunctionData[] = []

    // get amounts
    const { amount0: amount0Desired, amount1: amount1Desired } = position.mintAmounts

    // adjust for slippage
    const minimumAmounts = position.mintAmountsWithSlippage(options.slippageTolerance)
    const amount0Min = minimumAmounts.amount0
    const amount1Min = minimumAmounts.amount1

    const deadline = BigInt(options.deadline)
    const recipient = options.recipient

    if (isMint(options) && options.createPool) {
      payloads.push(this.createCallParameters(position.pool))
    }

    if (isMint(options)) {
      payloads.push({
        function: `${CLAMM_ADDRESS}::position_manager::mint`,
        functionArguments: [
          position.pool.token0.address,
          position.pool.token1.address,
          position.pool.fee,
          position.tickLower,
          position.tickUpper,
          amount0Desired,
          amount1Desired,
          amount0Min,
          amount1Min,
          recipient,
          deadline,
        ],
        typeArguments: [],
      })
    } else {
      payloads.push({
        function: `${CLAMM_ADDRESS}::position_manager::increase_liquidity`,
        functionArguments: [
          BigInt(options.tokenId),
          amount0Desired,
          amount1Desired,
          amount0Min,
          amount1Min,
          deadline,
          recipient,
        ],
        typeArguments: [],
      })
    }

    return payloads
  }

  public static collectCallParameters(options: CollectOptions): InputEntryFunctionData {
    const recipient = options.recipient

    return {
      function: `${CLAMM_ADDRESS}::position_manager::collect`,
      functionArguments: [BigInt(options.tokenId), recipient, MaxUint128, MaxUint128],
      typeArguments: [],
    }
  }

  public static removeCallParameters(position: Position, options: RemoveLiquidityOptions): InputEntryFunctionData[] {
    const payloads: InputEntryFunctionData[] = []

    const deadline = BigInt(options.deadline)
    const tokenId = BigInt(options.tokenId)
    const recipient = options.recipient

    // construct a partial position with a percentage of liquidity
    const partialPosition = new Position({
      pool: position.pool,
      liquidity: options.liquidityPercentage.multiply(position.liquidity).quotient,
      tickLower: position.tickLower,
      tickUpper: position.tickUpper,
    })
    invariant(position.liquidity > ZERO, 'ZERO_LIQUIDITY')

    // slippage-adjusted underlying amounts
    const { amount0: amount0Min, amount1: amount1Min } = partialPosition.burnAmountsWithSlippage(
      options.slippageTolerance,
    )

    payloads.push({
      function: `${CLAMM_ADDRESS}::position_manager::decrease_liquidity`,
      functionArguments: [tokenId, partialPosition.liquidity, amount0Min, amount1Min, deadline, recipient],
      typeArguments: [],
    })

    const { expectedCurrencyOwed0, expectedCurrencyOwed1, ...rest } = options.collectOptions
    payloads.push(
      PositionManager.collectCallParameters({
        tokenId: options.tokenId,
        expectedCurrencyOwed0: expectedCurrencyOwed0.add(
          CurrencyAmount.fromRawAmount(expectedCurrencyOwed0.currency, amount0Min),
        ),
        expectedCurrencyOwed1: expectedCurrencyOwed1.add(
          CurrencyAmount.fromRawAmount(expectedCurrencyOwed1.currency, amount1Min),
        ),
        ...rest,
      }),
    )

    if (options.liquidityPercentage.equalTo(ONE)) {
      if (options.burnToken) {
        payloads.push({
          function: `${CLAMM_ADDRESS}::position_manager::burn`,
          functionArguments: [tokenId],
          typeArguments: [],
        })
      }
    } else {
      invariant(options.burnToken !== true, 'CANNOT_BURN')
    }

    return payloads
  }
}
