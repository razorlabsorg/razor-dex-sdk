import { InputViewFunctionData } from "@aptos-labs/ts-sdk"
import { V2_FACTORY_ADDRESS } from "../addresses"

export const get_pair = (tokenA: string, tokenB: string): InputViewFunctionData => {
  return {
    typeArguments: [],
    functionArguments: [tokenA, tokenB],
    function: `${V2_FACTORY_ADDRESS}::get_pair`,
  }
}