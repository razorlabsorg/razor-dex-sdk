import { Token } from '@razorlabs/swap-sdk-core'
import { CLAMM_ADDRESS, FeeAmount } from '../constants'
import { AccountAddress, createObjectAddress, Hex } from '@aptos-labs/ts-sdk'

const getPoolSeed = (token0: Token, token1: Token, fee: FeeAmount): string => {
  const validatedToken0Address = AccountAddress.from(token0.address).toStringLong()
  const validatedToken1Address = AccountAddress.from(token1.address).toStringLong()
  if (token0.sortsBefore(token1)) {
    return validatedToken0Address + validatedToken1Address.slice(2) + fee
  } else {
    return validatedToken1Address + validatedToken0Address.slice(2) + fee
  }
}

export function computePoolAddress({ tokenA, tokenB, fee }: { tokenA: Token; tokenB: Token; fee: FeeAmount }): string {
  const rawSeed = getPoolSeed(tokenA, tokenB, fee)
  const seed = Hex.fromHexInput(rawSeed).toUint8Array()
  const account = AccountAddress.from(CLAMM_ADDRESS)
  const address = createObjectAddress(account, seed)
  return address.toString()
}
