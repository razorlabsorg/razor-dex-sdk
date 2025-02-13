import {
  InsufficientInputAmountError,
  InsufficientReservesError,
  sqrt,
  CurrencyAmount,
  Price,
  FIVE,
  ONE,
  ZERO,
  _10000,
  _9975,
  BigintIsh,
  MINIMUM_LIQUIDITY,
  Token,
} from '@razorlabs/swap-sdk-core'
import invariant from 'tiny-invariant'

import { AMM_SIGNER } from '../constants'
import { AccountAddress, createObjectAddress, Hex } from '@aptos-labs/ts-sdk'

const getPairSeed = (token0: Token, token1: Token): string => {
  const validatedToken0Address = AccountAddress.from(token0.address).toStringLong()
  const validatedToken1Address = AccountAddress.from(token1.address).toStringLong()
  if (token0.sortsBefore(token1)) {
    return validatedToken0Address + validatedToken1Address.slice(2)
  } else {
    return validatedToken1Address + validatedToken0Address.slice(2)
  }
}

export const computePairAddress = ({ tokenA, tokenB }: { tokenA: Token; tokenB: Token }): string => {
  const rawSeed = getPairSeed(tokenA, tokenB)
  const seed = Hex.fromHexInput(rawSeed).toUint8Array()
  const account = AccountAddress.from(AMM_SIGNER)
  const address = createObjectAddress(account, seed)

  return address.toString()
}

export class Pair {
  public readonly liquidityToken: Token

  private readonly tokenAmounts: [CurrencyAmount<Token>, CurrencyAmount<Token>]

  public static getAddress(tokenA: Token, tokenB: Token): string {
    return computePairAddress({ tokenA, tokenB })
  }

  public constructor(currencyAmountA: CurrencyAmount<Token>, tokenAmountB: CurrencyAmount<Token>) {
    const tokenAmounts = currencyAmountA.currency.sortsBefore(tokenAmountB.currency) // does safety checks
      ? [currencyAmountA, tokenAmountB]
      : [tokenAmountB, currencyAmountA]
    this.liquidityToken = new Token(
      tokenAmounts[0].currency.chainId,
      Pair.getAddress(tokenAmounts[0].currency, tokenAmounts[1].currency),
      8,
      'RAZOR LP',
      `Razor ${tokenAmounts[0].currency.symbol}-${tokenAmounts[1].currency.symbol} LP`,
    )
    this.tokenAmounts = tokenAmounts as [CurrencyAmount<Token>, CurrencyAmount<Token>]
  }

  /**
   * Returns true if the token is either token0 or token1
   * @param token to check
   */
  public involvesToken(token: Token): boolean {
    return token.equals(this.token0) || token.equals(this.token1)
  }

  /**
   * Returns the current mid price of the pair in terms of token0, i.e. the ratio of reserve1 to reserve0
   */
  public get token0Price(): Price<Token, Token> {
    const result = this.tokenAmounts[1].divide(this.tokenAmounts[0])
    return new Price(this.token0, this.token1, result.denominator, result.numerator)
  }

  /**
   * Returns the current mid price of the pair in terms of token1, i.e. the ratio of reserve0 to reserve1
   */
  public get token1Price(): Price<Token, Token> {
    const result = this.tokenAmounts[0].divide(this.tokenAmounts[1])
    return new Price(this.token1, this.token0, result.denominator, result.numerator)
  }

  /**
   * Return the price of the given token in terms of the other token in the pair.
   * @param token token to return price of
   */
  public priceOf(token: Token): Price<Token, Token> {
    invariant(this.involvesToken(token), 'TOKEN')
    return token.equals(this.token0) ? this.token0Price : this.token1Price
  }

  /**
   * Returns the chain ID of the tokens in the pair.
   */
  public get chainId(): number {
    return this.token0.chainId
  }

  public get token0(): Token {
    return this.tokenAmounts[0].currency
  }

  public get token1(): Token {
    return this.tokenAmounts[1].currency
  }

  public get reserve0(): CurrencyAmount<Token> {
    return this.tokenAmounts[0]
  }

  public get reserve1(): CurrencyAmount<Token> {
    return this.tokenAmounts[1]
  }

  public reserveOf(token: Token): CurrencyAmount<Token> {
    invariant(this.involvesToken(token), 'TOKEN')
    return token.equals(this.token0) ? this.reserve0 : this.reserve1
  }

  public getOutputAmount(inputAmount: CurrencyAmount<Token>): [CurrencyAmount<Token>, Pair] {
    invariant(this.involvesToken(inputAmount.currency), 'TOKEN')
    if (this.reserve0.quotient === ZERO || this.reserve1.quotient === ZERO) {
      throw new InsufficientReservesError()
    }
    const inputReserve = this.reserveOf(inputAmount.currency)
    const outputReserve = this.reserveOf(inputAmount.currency.equals(this.token0) ? this.token1 : this.token0)
    const inputAmountWithFee = inputAmount.quotient * _9975
    const numerator = inputAmountWithFee * outputReserve.quotient
    const denominator = inputReserve.quotient * _10000 + inputAmountWithFee
    const outputAmount = CurrencyAmount.fromRawAmount(
      inputAmount.currency.equals(this.token0) ? this.token1 : this.token0,
      numerator / denominator,
    )
    if (outputAmount.quotient === ZERO) {
      throw new InsufficientInputAmountError()
    }
    return [outputAmount, new Pair(inputReserve.add(inputAmount), outputReserve.subtract(outputAmount))]
  }


  public getInputAmount(outputAmount: CurrencyAmount<Token>): [CurrencyAmount<Token>, Pair] {
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
    const numerator = inputReserve.quotient * outputAmount.quotient * _10000
    const denominator = outputReserve.quotient - outputAmount.quotient * _9975
    const inputAmount = CurrencyAmount.fromRawAmount(
      outputAmount.currency.equals(this.token0) ? this.token1 : this.token0,
      (numerator / denominator) + ONE,
    )
    return [inputAmount, new Pair(inputReserve.add(inputAmount), outputReserve.subtract(outputAmount))]
  }

  public getLiquidityMinted(
    totalSupply: CurrencyAmount<Token>,
    tokenAmountA: CurrencyAmount<Token>,
    tokenAmountB: CurrencyAmount<Token>,
  ): CurrencyAmount<Token> {
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
    token: Token,
    totalSupply: CurrencyAmount<Token>,
    liquidity: CurrencyAmount<Token>,
    feeOn = false,
    kLast?: BigintIsh,
  ): CurrencyAmount<Token> {
    invariant(this.involvesToken(token), 'TOKEN')
    invariant(totalSupply.currency.equals(this.liquidityToken), 'TOTAL_SUPPLY')
    invariant(liquidity.currency.equals(this.liquidityToken), 'LIQUIDITY')
    invariant(liquidity.quotient <= totalSupply.quotient, 'LIQUIDITY')

    let totalSupplyAdjusted: CurrencyAmount<Token>
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

    if (totalSupply.equalTo(0)) {
      return CurrencyAmount.fromRawAmount(token, 0)
    }

    return CurrencyAmount.fromRawAmount(
      token,
      (liquidity.quotient * this.reserveOf(token).quotient) / totalSupplyAdjusted.quotient,
    )
  }
}
