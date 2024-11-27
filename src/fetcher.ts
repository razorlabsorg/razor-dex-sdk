import { TokenAmount } from './entities/fractions/tokenAmount'
import { Pair } from './entities/pair'
import invariant from 'tiny-invariant'
import { AMM_RESOURCE_ACCOUNT, ChainId } from './constants'
import { Token } from './entities/token'
import { Aptos, AptosConfig, InputViewFunctionData } from '@aptos-labs/ts-sdk'

export function getNetworkRPCUrl(chainId: ChainId) {
  switch (chainId) {
    case ChainId.PORTO_TESTNET:
    default:
      return 'https://aptos.testnet.porto.movementlabs.xyz/v1'
  }
}

export function getNetworkIndexerUrl(chainId: ChainId) {
  switch (chainId) {
    case ChainId.PORTO_TESTNET:
    default:
      return 'https://indexer.testnet.porto.movementnetwork.xyz/v1/graphql'
  }
}

export function getDefaultProvider(chainId: ChainId) {
  const config = new AptosConfig({
    fullnode: getNetworkRPCUrl(chainId),
    indexer: getNetworkIndexerUrl(chainId),
  })
  const provider = new Aptos(config)
  return provider
}

export const getReserves = (pairAddress: string): InputViewFunctionData => {
  return {
    typeArguments: [],
    functionArguments: [pairAddress],
    function: `${AMM_RESOURCE_ACCOUNT}::pair::get_reserves`,
  }
}

let TOKEN_DECIMALS_CACHE: { [chainId: number]: { [address: string]: number } } = {
  [ChainId.PORTO_TESTNET]: {},
}

/**
 * Contains methods for constructing instances of pairs and tokens from on-chain data.
 */
export abstract class Fetcher {
  /**
   * Cannot be constructed.
   */
  private constructor() {}

  /**
   * Fetch information for a given token on the given chain, using the given provider.
   * @param chainId chain of the token
   * @param address address of the token on the chain
   * @param provider provider used to fetch the token
   * @param symbol optional symbol of the token
   * @param name optional name of the token
   */
  public static async fetchTokenData(
    chainId: ChainId,
    address: string,
    provider = getDefaultProvider(chainId),
    symbol?: string,
    name?: string,
  ): Promise<Token> {
    const parsedDecimals =
      typeof TOKEN_DECIMALS_CACHE?.[chainId]?.[address] === 'number'
        ? TOKEN_DECIMALS_CACHE[chainId][address]
        : await provider.fungibleAsset
            .getFungibleAssetMetadataByAssetType({ assetType: address })
            .then(({ decimals }) => {
              TOKEN_DECIMALS_CACHE = {
                ...TOKEN_DECIMALS_CACHE,
                [chainId]: {
                  ...TOKEN_DECIMALS_CACHE?.[chainId],
                  [address]: decimals,
                },
              }
              return decimals
            })
    return new Token(chainId, address, parsedDecimals, symbol, name)
  }

  /**
   * Fetches information about a pair and constructs a pair from the given two tokens.
   * @param tokenA first token
   * @param tokenB second token
   * @param provider the provider to use to fetch the data
   */
  public static async fetchPairData(
    tokenA: Token,
    tokenB: Token,
    provider = getDefaultProvider(tokenA.chainId),
  ): Promise<Pair> {
    invariant(tokenA.chainId === tokenB.chainId, 'CHAIN_ID')
    const address = Pair.getAddress(tokenA, tokenB)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [reserves0, reserves1, _] = await provider.view({
      payload: getReserves(address),
    })
    const balances = tokenA.sortsBefore(tokenB)
      ? [reserves0, reserves1]
      : [reserves1, reserves0]
    return new Pair(
      new TokenAmount(tokenA, balances[0] as bigint),
      new TokenAmount(tokenB, balances[1] as bigint),
    )
  }
}
