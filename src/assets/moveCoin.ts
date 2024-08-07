import { parseTypeTag, TypeTagStruct } from "@aptos-labs/ts-sdk";
import { NativeCurrency, SerializedToken } from "../entities";
import { Asset } from "./asset";
import { Coin } from "./coin";

const MOVE_COIN = '0x1::aptos_coin::AptosCoin' as const;

export class MoveCoin extends NativeCurrency {
  address: typeof MOVE_COIN = MOVE_COIN;

  structTag: TypeTagStruct = parseTypeTag(MOVE_COIN) as TypeTagStruct

  projectLink = 'https://movementlabs.xyz';

  protected constructor(chainId: number) {
    super(chainId, 8, 'MOVE', 'Move Coin');
  }

  public static _moveCache: { [chainId: number]: MoveCoin } = {};

  public static onChain(chainId: number): MoveCoin {
    if (this._moveCache[chainId]) {
      return this._moveCache[chainId];
    }
    const move = new MoveCoin(chainId);
    this._moveCache[chainId] = move;
    return move;
  }

  public equals(other: Asset): boolean {
    if (other.chainId === this.chainId) {
      if (other.isNative || other.address === this.address) {
        return true
      }

      return false
    }

    return false
  }

  get wrapped(): Coin {
    return new Coin(
      this.chainId,
      this.address,
      this.decimals,
      this.symbol,
      this.name,
      this.projectLink
    )
  }

  public sortsBefore(other: Asset): boolean {
    return this.address.toLowerCase() < other.address.toLowerCase()
  }

  public get serialize(): SerializedToken {
    return {
      address: this.address,
      chainId: this.chainId,
      decimals: this.decimals,
      symbol: this.symbol,
      name: this.name,
      projectLink: this.projectLink,
    }
  }
}