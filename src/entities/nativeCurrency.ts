import { BaseCurrency } from './baseCurrency';

export abstract class NativeCurrency extends BaseCurrency {
  public readonly isNative: true = true as const;
  public readonly isToken: false = false as const;
  public readonly isFungibleAsset: false = false as const;
}
