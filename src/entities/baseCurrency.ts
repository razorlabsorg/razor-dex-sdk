import invariant from 'tiny-invariant';
import { Token } from './token';

export abstract class BaseCurrency {
  public abstract readonly isNative: boolean;
  public abstract readonly isToken: boolean;
  public readonly chainId: number;
  public readonly decimals: number;
  public readonly symbol: string;
  public readonly name?: string;

  protected constructor(
    chainId: number,
    decimals: number,
    symbol: string,
    name?: string,
  ) {
    invariant(Number.isSafeInteger(chainId), 'CHAIN_ID');
    invariant(
      decimals >= 0 && decimals < 255 && Number.isInteger(decimals),
      'DECIMALS',
    );

    this.chainId = chainId;
    this.decimals = decimals;
    this.symbol = symbol;
    this.name = name;
  }

  public abstract equals(other: BaseCurrency): boolean;

  public abstract get wrapped(): Token;
}
