import { Token } from '../entities';
import { HexString } from '../utils/hexString';
import { Asset } from './asset';

export class Coin extends Token {
  public constructor(
    chainId: number,
    address: string,
    decimals: number,
    symbol: string,
    name?: string,
    projectLink?: string,
  ) {
    super(
      chainId,
      new HexString(address).toShortString() as `0x${string}`,
      decimals,
      symbol,
      false,
      name,
      projectLink,
    );
  }

  public sortsBefore(other: Asset): boolean {
    return super.sortsBefore(other.wrapped);
  }

  public equals(other: Asset): boolean {
    return (
      this.chainId === other.chainId &&
      new HexString(this.address).toShortString() ===
        new HexString(other.address).toShortString()
    );
  }
}
