import { Currency, CurrencyAmount, Token } from '../entities';

export { computePriceImpact } from './computePriceImpact';
export { sortedInsert } from './sortedInsert';
export { sqrt } from './sqrt';

// compare two token amounts with highest one coming first
function balanceComparator(
  balanceA?: CurrencyAmount<Token>,
  balanceB?: CurrencyAmount<Token>,
) {
  if (balanceA && balanceB) {
    return balanceA.greaterThan(balanceB)
      ? -1
      : balanceA.equalTo(balanceB)
        ? 0
        : 1;
  }
  if (balanceA && balanceA.greaterThan('0')) {
    return -1;
  }
  if (balanceB && balanceB.greaterThan('0')) {
    return 1;
  }
  return 0;
}

export function getTokenComparator(balances: {
  [tokenAddress: string]: CurrencyAmount<Token> | undefined;
}): (tokenA: Token, tokenB: Token) => number {
  return function sortTokens(tokenA: Token, tokenB: Token): number {
    // -1 = a is first
    // 1 = b is first

    // sort by balances
    const balanceA = balances[tokenA.address];
    const balanceB = balances[tokenB.address];

    const balanceComp = balanceComparator(balanceA, balanceB);
    if (balanceComp !== 0) return balanceComp;

    if (tokenA.symbol && tokenB.symbol) {
      // sort by symbol
      return tokenA.symbol.toLowerCase() < tokenB.symbol.toLowerCase() ? -1 : 1;
    }
    return tokenA.symbol ? -1 : tokenB.symbol ? -1 : 0;
  };
}

export function sortCurrencies<T extends Currency>(currencies: T[]): T[] {
  return currencies.sort((a, b) => {
    if (a.isNative) {
      return -1;
    }
    if (b.isNative) {
      return 1;
    }
    return a.sortsBefore(b) ? -1 : 1;
  });
}
