import { describe, expect, it } from 'vitest'
import { Token, WMOVE } from './token'
import { ChainId } from '../constants'
import { Pair } from './pair'
import { Price, TokenAmount } from './fractions'

describe('Pair', () => {
  const MOVE = new Token(
    ChainId.PORTO_TESTNET,
    '0x000000000000000000000000000000000000000000000000000000000000000a',
    8,
    'MOVE',
    'Move Coin',
    'https://movementlabs.xyz'
  )

  const RZR = new Token(
    ChainId.PORTO_TESTNET,
    '0xec273f21cacd5f2018d9bfbd83a90dcf31371be8ffc4d15a917bb1aec5f639e3',
    8,
    'RZR',
    'Razor',
    'https://razorlabs.xyz'
  )

  describe('#getAddress', () => {
    it('returns the correct address', () => {
      expect(Pair.getAddress(MOVE, RZR)).toEqual(
        '0xdc71311a5e27d0668412053294d7983a71fd03c03f74468862d6cb305bf55308'
      )
    })
  })

  describe('#token0', () => {
    it('always is the token that sorts before', () => {
      expect(new Pair(new TokenAmount(MOVE, '100'), new TokenAmount(RZR, '100')).token0).toEqual(MOVE)
      expect(new Pair(new TokenAmount(RZR, '100'), new TokenAmount(MOVE, '100')).token0).toEqual(MOVE)
    })
  })
  describe('#token1', () => {
    it('always is the token that sorts after', () => {
      expect(new Pair(new TokenAmount(MOVE, '100'), new TokenAmount(RZR, '100')).token1).toEqual(RZR)
      expect(new Pair(new TokenAmount(RZR, '100'), new TokenAmount(MOVE, '100')).token1).toEqual(RZR)
    })
  })
  describe('#reserve0', () => {
    it('always comes from the token that sorts before', () => {
      expect(new Pair(new TokenAmount(MOVE, '100'), new TokenAmount(RZR, '101')).reserve0).toEqual(
        new TokenAmount(MOVE, '100')
      )
      expect(new Pair(new TokenAmount(RZR, '101'), new TokenAmount(MOVE, '100')).reserve0).toEqual(
        new TokenAmount(MOVE, '100')
      )
    })
  })
  describe('#reserve1', () => {
    it('always comes from the token that sorts after', () => {
      expect(new Pair(new TokenAmount(MOVE, '100'), new TokenAmount(RZR, '101')).reserve1).toEqual(
        new TokenAmount(RZR, '101')
      )
      expect(new Pair(new TokenAmount(RZR, '101'), new TokenAmount(MOVE, '100')).reserve1).toEqual(
        new TokenAmount(RZR, '101')
      )
    })
  })
  describe('#token0Price', () => {
    it('returns price of token0 in terms of token1', () => {
      expect(new Pair(new TokenAmount(MOVE, '101'), new TokenAmount(RZR, '100')).token0Price).toEqual(
        new Price(MOVE, RZR, '101', '100')
      )
      expect(new Pair(new TokenAmount(RZR, '100'), new TokenAmount(MOVE, '101')).token0Price).toEqual(
        new Price(MOVE, RZR, '101', '100')
      )
    })
  })

  describe('#token1Price', () => {
    it('returns price of token1 in terms of token0', () => {
      expect(new Pair(new TokenAmount(MOVE, '101'), new TokenAmount(RZR, '100')).token1Price).toEqual(
        new Price(RZR, MOVE, '100', '101')
      )
      expect(new Pair(new TokenAmount(RZR, '100'), new TokenAmount(MOVE, '101')).token1Price).toEqual(
        new Price(RZR, MOVE, '100', '101')
      )
    })
  })

  describe('#priceOf', () => {
    const pair = new Pair(new TokenAmount(MOVE, '101'), new TokenAmount(RZR, '100'))
    it('returns price of token in terms of other token', () => {
      expect(pair.priceOf(RZR)).toEqual(pair.token1Price)
      expect(pair.priceOf(MOVE)).toEqual(pair.token0Price)
    })
  })

  describe('#reserveOf', () => {
    it('returns reserves of the given token', () => {
      expect(new Pair(new TokenAmount(MOVE, '100'), new TokenAmount(RZR, '101')).reserveOf(MOVE)).toEqual(
        new TokenAmount(MOVE, '100')
      )
      expect(new Pair(new TokenAmount(RZR, '101'), new TokenAmount(MOVE, '100')).reserveOf(MOVE)).toEqual(
        new TokenAmount(MOVE, '100')
      )
    })
  })

  describe('#chainId', () => {
    it('returns the token0 chainId', () => {
      expect(new Pair(new TokenAmount(MOVE, '100'), new TokenAmount(RZR, '100')).chainId).toEqual(ChainId.PORTO_TESTNET)
      expect(new Pair(new TokenAmount(RZR, '100'), new TokenAmount(MOVE, '100')).chainId).toEqual(ChainId.PORTO_TESTNET)
    })
  })

  describe('#involvesToken', () => {
    it('returns true if the token is in the pair', () => {
      expect(new Pair(new TokenAmount(MOVE, '100'), new TokenAmount(RZR, '100')).involvesToken(MOVE)).toEqual(true)
      expect(new Pair(new TokenAmount(MOVE, '100'), new TokenAmount(RZR, '100')).involvesToken(RZR)).toEqual(true)
    })
    it('returns true if the wrapped token is in the pair', () => {
      expect(
        new Pair(new TokenAmount(MOVE, '100'), new TokenAmount(RZR, '100')).involvesToken(
          WMOVE[ChainId.PORTO_TESTNET]
        )
      ).toEqual(true)
    })
  })
})
