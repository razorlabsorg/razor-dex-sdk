import { Currency, Token } from '@razorlabs/swap-sdk-core'
import { Pool } from '@razorlabs/clamm-sdk'
import { Pair } from '@razorlabs/amm-sdk'
import { MixedRouteSDK } from '../entities/mixedRoute/route'
import { MoveString } from '@aptos-labs/ts-sdk'
import { AMM_FEE_PATH_PLACEHOLDER } from '../constants'

const ADDR_SIZE = 32
const FEE_SIZE = 3

export function encodePacked(inputs: any[]): Uint8Array {
  const encodedPacked: number[] = []

  for (const input of inputs) {
    if (typeof input === 'string') {
      const encodedString = new MoveString(input).bcsToBytes()
      for (let j = 0; j < ADDR_SIZE; j++) {
        encodedPacked.push(encodedString[j])
      }
    } else if (typeof input === 'number') {
      const feeBytes = new Uint8Array(8)
      new DataView(feeBytes.buffer).setBigUint64(0, BigInt(input), true)
      for (let j = 0; j < FEE_SIZE; j++) {
        encodedPacked.push(feeBytes[j])
      }
    }
  }

  return new Uint8Array(encodedPacked)
}

/**
 * Converts a route to a hex encoded path
 * @notice only supports exactIn route encodings
 * @param route the mixed path to convert to an encoded path
 * @returns the exactIn encoded path
 */
export function encodeMixedRouteToPath(route: MixedRouteSDK<Currency, Currency>): Uint8Array {
  const firstInputToken: Token = route.input.wrapped

  const { path } = route.pools.reduce(
    (
      { inputToken, path }: { inputToken: Token; path: (string | number)[] },
      pool: Pool | Pair,
      index
    ): { inputToken: Token; path: (string | number)[] } => {
      const outputToken: Token = pool.token0.equals(inputToken) ? pool.token1 : pool.token0
      if (index === 0) {
        return {
          inputToken: outputToken,
          path: [inputToken.address, pool instanceof Pool ? pool.fee : AMM_FEE_PATH_PLACEHOLDER, outputToken.address],
        }
      } else {
        return {
          inputToken: outputToken,
          path: [...path, pool instanceof Pool ? pool.fee : AMM_FEE_PATH_PLACEHOLDER, outputToken.address],
        }
      }
    },
    { inputToken: firstInputToken, path: [] }
  )

  return encodePacked(path)
}
