import invariant from 'tiny-invariant'

import {
  _1000,
  _997,
  BigintIsh,
  FIVE,
  MINIMUM_LIQUIDITY,
  ONE,
  ZERO,
} from '../constants'
import { Asset, FungibleAsset } from '../assets'
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'
import { CurrencyAmount, Price } from '../entities'
import { get_pair } from './viewFunctions'
import { InsufficientInputAmountError, InsufficientReservesError } from '../errors'
import { sqrt } from '../utils'

const aptosConfig = new AptosConfig({ network: Network.DEVNET });
const client = new Aptos(aptosConfig);

// TODO (SDK: 001): Need to find a way to make this call and resolve immediately
export const computePairAddress = async ({
  tokenA,
  tokenB,
}: {
  tokenA: Asset
  tokenB: Asset
}): Promise<string> => {
  const [token0, token1] = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA] // does safety checks
  let address = await client.view({ payload: get_pair(token0.address, token1.address) })
  
  return address[0] as unknown as string
}

export class Pair {
  public readonly liquidityToken: Asset
  private readonly tokenAmounts: [CurrencyAmount<Asset>, CurrencyAmount<Asset>]

  private static addressCache: Map<string, string> = new Map();
  private static addressComputationPromises: Map<string, Promise<void>> = new Map();

  private static getCacheKey(tokenA: Asset, tokenB: Asset): string {
    return tokenA.address < tokenB.address 
      ? `${tokenA.address}-${tokenB.address}`
      : `${tokenB.address}-${tokenA.address}`;
  }

  public static getAddress(tokenA: Asset, tokenB: Asset): string {
    const cacheKey = this.getCacheKey(tokenA, tokenB);
    
    if (this.addressCache.has(cacheKey)) {
      return this.addressCache.get(cacheKey)!;
    }

    if (!this.addressComputationPromises.has(cacheKey)) {
      this.precomputeAddress(tokenA, tokenB);  // Start computing if not already in progress
    }

    return 'pending_' + cacheKey;  // Return a placeholder
  }

  private static async precomputeAddress(tokenA: Asset, tokenB: Asset): Promise<void> {
    const cacheKey = this.getCacheKey(tokenA, tokenB);
    if (!this.addressCache.has(cacheKey) && !this.addressComputationPromises.has(cacheKey)) {
      const computationPromise = computePairAddress({ tokenA, tokenB })
        .then((addr) => {
          this.addressCache.set(cacheKey, addr);
        })
        .catch((error) => {
          console.error('Error precomputing pair address:', error);
        })
        .finally(() => {
          this.addressComputationPromises.delete(cacheKey);
        });
      
      this.addressComputationPromises.set(cacheKey, computationPromise);
      await computationPromise;
    }
  }

  private constructor(currencyAmountA: CurrencyAmount<Asset>, tokenAmountB: CurrencyAmount<Asset>) {
    const tokenAmounts = currencyAmountA.currency.sortsBefore(tokenAmountB.currency)
      ? [currencyAmountA, tokenAmountB]
      : [tokenAmountB, currencyAmountA];
    this.liquidityToken = new FungibleAsset(
      tokenAmounts[0].currency.chainId,
      Pair.getAddress(tokenAmounts[0].currency, tokenAmounts[1].currency),
      8,
      'RAZOR LP',
      `Razor ${tokenAmounts[0].currency.symbol}-${tokenAmounts[1].currency.symbol} LP`,
    );
    this.tokenAmounts = tokenAmounts as [CurrencyAmount<Asset>, CurrencyAmount<Asset>];
  }

  public static async create(currencyAmountA: CurrencyAmount<Asset>, tokenAmountB: CurrencyAmount<Asset>): Promise<Pair> {
    const tokenAmounts = currencyAmountA.currency.sortsBefore(tokenAmountB.currency)
      ? [currencyAmountA, tokenAmountB]
      : [tokenAmountB, currencyAmountA];
    await Pair.precomputeAddress(tokenAmounts[0].currency, tokenAmounts[1].currency);
    return new Pair(currencyAmountA, tokenAmountB);
  }

  /**
   * Returns true if the token is either token0 or token1
   * @param token to check
   */
  public involvesToken(token: Asset): boolean {
    return token.equals(this.token0) || token.equals(this.token1)
  }

  /**
   * Returns the current mid price of the pair in terms of token0, i.e. the ratio of reserve1 to reserve0
   */
  public get token0Price(): Price<Asset, Asset> {
    const result = this.tokenAmounts[1].divide(this.tokenAmounts[0])
    return new Price(this.token0, this.token1, result.denominator, result.numerator)
  }

  /**
   * Returns the current mid price of the pair in terms of token1, i.e. the ratio of reserve0 to reserve1
   */
  public get token1Price(): Price<Asset, Asset> {
    const result = this.tokenAmounts[0].divide(this.tokenAmounts[1])
    return new Price(this.token1, this.token0, result.denominator, result.numerator)
  }

  /**
   * Return the price of the given token in terms of the other token in the pair.
   * @param token token to return price of
   */
  public priceOf(token: Asset): Price<Asset, Asset> {
    invariant(this.involvesToken(token), 'TOKEN')
    return token.equals(this.token0) ? this.token0Price : this.token1Price
  }

  /**
   * Returns the chain ID of the tokens in the pair.
   */
  public get chainId(): number {
    return this.token0.chainId
  }

  public get token0(): Asset {
    return this.tokenAmounts[0].currency
  }

  public get token1(): Asset {
    return this.tokenAmounts[1].currency
  }

  public get reserve0(): CurrencyAmount<Asset> {
    return this.tokenAmounts[0]
  }

  public get reserve1(): CurrencyAmount<Asset> {
    return this.tokenAmounts[1]
  }

  public reserveOf(token: Asset): CurrencyAmount<Asset> {
    invariant(this.involvesToken(token), 'TOKEN')
    return token.equals(this.token0) ? this.reserve0 : this.reserve1
  }

  public getOutputAmount(inputAmount: CurrencyAmount<Asset>): [CurrencyAmount<Asset>, Pair] {
    invariant(this.involvesToken(inputAmount.currency), 'TOKEN')
    if (this.reserve0.quotient === ZERO || this.reserve1.quotient === ZERO) {
      throw new InsufficientReservesError()
    }
    const inputReserve = this.reserveOf(inputAmount.currency)
    const outputReserve = this.reserveOf(inputAmount.currency.equals(this.token0) ? this.token1 : this.token0)
    const inputAmountWithFee = inputAmount.quotient * _997
    const numerator = inputAmountWithFee * outputReserve.quotient
    const denominator = inputReserve.quotient * _1000 + inputAmountWithFee
    const outputAmount = CurrencyAmount.fromRawAmount(
      inputAmount.currency.equals(this.token0) ? this.token1 : this.token0,
      numerator / denominator,
    )
    if (outputAmount.quotient === ZERO) {
      throw new InsufficientInputAmountError()
    }
    return [outputAmount, new Pair(inputReserve.add(inputAmount), outputReserve.subtract(outputAmount))]
  }

  public getInputAmount(outputAmount: CurrencyAmount<Asset>): [CurrencyAmount<Asset>, Pair] {
    invariant(this.involvesToken(outputAmount.currency), 'TOKEN')
    if (
      this.reserve0.quotient === ZERO ||
      this.reserve1.quotient === ZERO ||
      outputAmount.quotient >= this.reserveOf(outputAmount.currency).quotient
    ) {
      throw new InsufficientReservesError()
    }

    const outputReserve = this.reserveOf(outputAmount.currency)
    const inputReserve = this.reserveOf(outputAmount.currency.equals(this.token0) ? this.token1 : this.token0)
    const numerator = inputReserve.quotient * outputAmount.quotient * _1000
    const denominator = (outputReserve.quotient - outputAmount.quotient) * _997
    const inputAmount = CurrencyAmount.fromRawAmount(
      outputAmount.currency.equals(this.token0) ? this.token1 : this.token0,
      numerator / denominator + ONE,
    )
    return [inputAmount, new Pair(inputReserve.add(inputAmount), outputReserve.subtract(outputAmount))]
  }
  public getLiquidityMinted(
    totalSupply: CurrencyAmount<Asset>,
    tokenAmountA: CurrencyAmount<Asset>,
    tokenAmountB: CurrencyAmount<Asset>
  ): CurrencyAmount<Asset> {
    invariant(totalSupply.currency.equals(this.liquidityToken), 'LIQUIDITY')
    const tokenAmounts = tokenAmountA.currency.sortsBefore(tokenAmountB.currency) // does safety checks
      ? [tokenAmountA, tokenAmountB]
      : [tokenAmountB, tokenAmountA]
    invariant(tokenAmounts[0].currency.equals(this.token0) && tokenAmounts[1].currency.equals(this.token1), 'TOKEN')

    let liquidity: bigint
    if (totalSupply.quotient === ZERO) {
      liquidity = sqrt(tokenAmounts[0].quotient * tokenAmounts[1].quotient) - MINIMUM_LIQUIDITY
    } else {
      const amount0 = (tokenAmounts[0].quotient * totalSupply.quotient) / this.reserve0.quotient
      const amount1 = (tokenAmounts[1].quotient * totalSupply.quotient) / this.reserve1.quotient
      liquidity = amount0 <= amount1 ? amount0 : amount1
    }
    if (!(liquidity > ZERO)) {
      throw new InsufficientInputAmountError()
    }
    return CurrencyAmount.fromRawAmount(this.liquidityToken, liquidity)
  }

  public getLiquidityValue(
    token: Asset,
    totalSupply: CurrencyAmount<Asset>,
    liquidity: CurrencyAmount<Asset>,
    feeOn: boolean = false,
    kLast?: BigintIsh
  ): CurrencyAmount<Asset> {
    invariant(this.involvesToken(token), 'TOKEN')
    invariant(totalSupply.currency.equals(this.liquidityToken), 'TOTAL_SUPPLY')
    invariant(liquidity.currency.equals(this.liquidityToken), 'LIQUIDITY')
    invariant(liquidity.quotient <= totalSupply.quotient, 'LIQUIDITY')


    let totalSupplyAdjusted: CurrencyAmount<Asset>
    if (!feeOn) {
      totalSupplyAdjusted = totalSupply
    } else {
      invariant(!!kLast, 'K_LAST')
      const kLastParsed = BigInt(kLast)
      if (!(kLastParsed === ZERO)) {
        const rootK = sqrt(this.reserve0.quotient * this.reserve1.quotient)
        const rootKLast = sqrt(kLastParsed)
        if (rootK > rootKLast) {
          const numerator = totalSupply.quotient * (rootK - rootKLast)
          const denominator = rootK * FIVE + rootKLast
          const feeLiquidity = numerator / denominator
          totalSupplyAdjusted = totalSupply.add(CurrencyAmount.fromRawAmount(this.liquidityToken, feeLiquidity))
        } else {
          totalSupplyAdjusted = totalSupply
        }
      } else {
        totalSupplyAdjusted = totalSupply
      }
    }

    return CurrencyAmount.fromRawAmount(
      token,
      (liquidity.quotient * this.reserveOf(token).quotient) / totalSupplyAdjusted.quotient,
    )
  }
}
