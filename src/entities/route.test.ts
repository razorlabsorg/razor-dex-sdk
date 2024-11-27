import { describe, expect, it } from "vitest"
import { Token, WMOVE } from "./token"
import { ChainId } from "../constants"
import { Pair } from "./pair"
import { Route } from "./route"
import { TokenAmount } from "./fractions"
import { MOVE } from "./currency"


describe('Route', () => {
  const token0 = new Token(ChainId.PORTO_TESTNET, '0xec273f21cacd5f2018d9bfbd83a90dcf31371be8ffc4d15a917bb1aec5f639e3', 8, 't0')
  const token1 = new Token(ChainId.PORTO_TESTNET, '0x6e8aae037a65e90ada6715e9108fb6d585a71c72d06f3963aae94e7845f24f02', 8, 't1')
  const wmove = WMOVE[ChainId.PORTO_TESTNET]
  const pair_0_1 = new Pair(new TokenAmount(token0, '100'), new TokenAmount(token1, '200'))
  const pair_0_wmove = new Pair(new TokenAmount(token0, '100'), new TokenAmount(wmove, '100'))
  const pair_1_wmove = new Pair(new TokenAmount(token1, '175'), new TokenAmount(wmove, '100'))

  it('constructs a path from the tokens', () => {
    const route = new Route([pair_0_1], token0)
    expect(route.pairs).toEqual([pair_0_1])
    expect(route.path).toEqual([token0, token1])
    expect(route.input).toEqual(token0)
    expect(route.output).toEqual(token1)
    expect(route.chainId).toEqual(ChainId.PORTO_TESTNET)
  })

  it('can have a token as both input and output', () => {
    const route = new Route([pair_0_wmove, pair_0_1, pair_1_wmove], wmove)
    expect(route.pairs).toEqual([pair_0_wmove, pair_0_1, pair_1_wmove])
    expect(route.input).toEqual(wmove)
    expect(route.output).toEqual(wmove)
  })

  it('supports move input', () => {
    const route = new Route([pair_0_wmove], MOVE)
    expect(route.pairs).toEqual([pair_0_wmove])
    expect(route.input).toEqual(MOVE)
    expect(route.output).toEqual(token0)
  })

  it('supports move output', () => {
    const route = new Route([pair_0_wmove], token0, MOVE)
    expect(route.pairs).toEqual([pair_0_wmove])
    expect(route.input).toEqual(token0)
    expect(route.output).toEqual(MOVE)
  })
})
