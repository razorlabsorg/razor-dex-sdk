import { Currency, Token } from '@razorlabs/swap-sdk-core'
import { Pool, Route } from '../entities'
import { MoveString } from '@aptos-labs/ts-sdk'

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

export function encodeRouteToPath(route: Route<Currency, Currency>, exactOutput: boolean): Uint8Array {
  const firstInputToken: Token = route.input.wrapped

  const { path } = route.pools.reduce(
    (
      { inputToken, path }: { inputToken: Token; path: any[] },
      pool: Pool,
      index,
    ): { inputToken: Token; path: any[] } => {
      const outputToken: Token = pool.token0.equals(inputToken) ? pool.token1 : pool.token0
      if (index == 0) {
        return {
          inputToken: outputToken,
          path: [inputToken.address, pool.fee, outputToken.address],
        }
      }

      return {
        inputToken: outputToken,
        path: [...path, pool.fee, outputToken.address],
      }
    },
    { inputToken: firstInputToken, path: [] },
  )

  return exactOutput ? encodePacked(path.reverse()) : encodePacked(path)
}
