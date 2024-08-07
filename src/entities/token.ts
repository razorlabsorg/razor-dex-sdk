import { BaseCurrency } from './baseCurrency';
import invariant from 'tiny-invariant';
import { Currency } from './currency';

export interface SerializedToken {
  chainId: number;
  address: string;
  decimals: number;
  symbol: string;
  name?: string;
  projectLink?: string;
}

export class Token extends BaseCurrency {
  public readonly isNative: false = false as const;
  public readonly isToken: true = true as const;
  public readonly isFungibleAsset: boolean;

  public readonly address: string;
  public readonly projectLink?: string;

  public constructor(
    chainId: number,
    address: string,
    decimals: number,
    symbol: string,
    isFungibleAsset: boolean,
    name?: string,
    projectLink?: string,
  ) {
    super(chainId, decimals, symbol, name);
    this.address = address;
    this.isFungibleAsset = isFungibleAsset;
    
    this.projectLink = projectLink;
  }

  public equals(other: Currency): boolean {
    return (
      other.isToken &&
      this.chainId === other.chainId &&
      this.address === other.address
    );
  }

  public sortsBefore(other: Token): boolean {
    invariant(this.chainId === other.chainId, 'CHAIN_IDS');
    invariant(this.address !== other.address, 'ADDRESSES');
    return this.address.toLowerCase() < other.address.toLowerCase();
  }

  public get wrapped(): Token {
    return this;
  }

  public get serialize(): SerializedToken {
    return {
      address: this.address,
      chainId: this.chainId,
      decimals: this.decimals,
      symbol: this.symbol,
      name: this.name,
      projectLink: this.projectLink,
    };
  }
}
