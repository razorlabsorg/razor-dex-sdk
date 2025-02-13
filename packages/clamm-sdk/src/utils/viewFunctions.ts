import { InputViewFunctionData } from '@aptos-labs/ts-sdk'
import { CLAMM_ADDRESS } from '../constants'

export const getPoolAddress = (tokenA: string, tokenB: string, fee: number): InputViewFunctionData => {
  return {
    typeArguments: [],
    functionArguments: [tokenA, tokenB, fee],
    function: `${CLAMM_ADDRESS}::factory::get_pool_address`,
  }
}

export const encodePath = (tokenA: string, tokenB: string, fee: number): InputViewFunctionData => {
  return {
    typeArguments: [],
    functionArguments: [tokenA, fee, tokenB],
    function: `${CLAMM_ADDRESS}::path::encode_single_pool`,
  }
}
