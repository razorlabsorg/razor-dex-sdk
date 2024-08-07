import type { Coin } from './coin';
import { FungibleAsset } from './fungibleAsset';
import type { MoveCoin } from './moveCoin';

export type Asset = MoveCoin | Coin | FungibleAsset;
