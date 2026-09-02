import { Fruit, TradeAnalysis, VerdictGrade } from '../types';

export function formatMoney(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '0';
  if (amount >= 1000000000) {
    return (amount / 1000000000).toFixed(amount % 1000000000 === 0 ? 0 : 2) + 'B';
  }
  if (amount >= 1000000) {
    return (amount / 1000000).toFixed(amount % 1000000 === 0 ? 0 : 2) + 'M';
  }
  if (amount >= 1000) {
    return (amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1) + 'K';
  }
  return amount.toLocaleString();
}

export function formatBeli(amount: number): string {
  return `$${formatMoney(amount)}`;
}

export function calculateTrade(
  yourFruits: (Fruit | null | undefined)[] = [],
  theirFruits: (Fruit | null | undefined)[] = []
): TradeAnalysis {
  const safeYour = (yourFruits || []).filter((f): f is Fruit => Boolean(f && typeof f === 'object'));
  const safeTheir = (theirFruits || []).filter((f): f is Fruit => Boolean(f && typeof f === 'object'));

  const yourMarketValue = safeYour.reduce((sum, f) => sum + (f.marketValue || 0), 0);
  const theirMarketValue = safeTheir.reduce((sum, f) => sum + (f.marketValue || 0), 0);

  const yourBeliValue = safeYour.reduce((sum, f) => sum + (f.beliPrice || 0), 0);
  const theirBeliValue = safeTheir.reduce((sum, f) => sum + (f.beliPrice || 0), 0);

  // In-Game 40% Beli difference rule check:
  // If either side is 0, skip check if it's gamepasses or empty
  let isBeliCompliant = true;
  if (yourBeliValue > 0 && theirBeliValue > 0) {
    const higherBeli = Math.max(yourBeliValue, theirBeliValue);
    const lowerBeli = Math.min(yourBeliValue, theirBeliValue);
    const beliDiffRatio = (higherBeli - lowerBeli) / higherBeli;
    isBeliCompliant = beliDiffRatio <= 0.4;
  }

  const diff = theirMarketValue - yourMarketValue;

  if (yourMarketValue === 0 && theirMarketValue === 0) {
    return {
      yourMarketValue: 0,
      theirMarketValue: 0,
      yourBeliValue: 0,
      theirBeliValue: 0,
      diff: 0,
      percentageDiff: 0,
      grade: '—',
      title: 'EMPTY TRADE CHAMBER',
      subtitle: 'Select fruits or gamepasses on both sides to evaluate market fairness and compliance.',
      barPercentage: 50,
      barColor: 'bg-slate-700',
      isBeliCompliant: true,
      factors: {
        demandScore: 5,
        liquidityScore: 5,
        hypeFactor: 5,
        rarityParity: 5,
        futureTrend: 'Neutral',
        tradeEfficiency: 100,
      },
    };
  }

  const percentageDiff = yourMarketValue > 0 ? (diff / yourMarketValue) * 100 : theirMarketValue > 0 ? 100 : 0;

  let grade: VerdictGrade = 'F';
  let title = 'FAIR TRADE';
  let subtitle = 'Balanced market exchange with equivalent value parity.';
  let barColor = 'bg-amber-400';
  let barPercentage = 50;

  if (percentageDiff >= 35) {
    grade = 'BW';
    title = 'BIG WIN (BW)';
    subtitle = 'Massive profit margin. You are receiving significantly higher market liquidity and valuation.';
    barColor = 'bg-emerald-400';
    barPercentage = Math.min(95, 75 + (percentageDiff - 35) / 2);
  } else if (percentageDiff >= 10) {
    grade = 'W';
    title = 'WIN (W)';
    subtitle = 'Favorable trade in your favor. Net positive gain over current trading market averages.';
    barColor = 'bg-emerald-500';
    barPercentage = 60 + ((percentageDiff - 10) / 25) * 15;
  } else if (percentageDiff <= -35) {
    grade = 'BL';
    title = 'BIG LOSS (BL)';
    subtitle = 'Severe value deficit. You are giving up heavily overvalued assets for underperforming returns.';
    barColor = 'bg-rose-500';
    barPercentage = Math.max(5, 25 - (Math.abs(percentageDiff) - 35) / 2);
  } else if (percentageDiff <= -10) {
    grade = 'L';
    title = 'LOSS (L)';
    subtitle = 'Unfavorable trade. You are slightly overpaying compared to typical Blox Fruits market rates.';
    barColor = 'bg-rose-400';
    barPercentage = 40 - ((Math.abs(percentageDiff) - 10) / 25) * 15;
  } else {
    grade = 'F';
    title = 'FAIR TRADE (F)';
    subtitle = 'Optimal trade parity. Both offer sides fall within the standard ±10% market variance window.';
    barColor = 'bg-amber-400';
    barPercentage = 50 + (percentageDiff / 10) * 10;
  }

  // Calculate demand and liquidity scores
  const avgYourDemand = safeYour.length ? safeYour.reduce((s, f) => s + (f.demand || 5), 0) / safeYour.length : 5;
  const avgTheirDemand = safeTheir.length ? safeTheir.reduce((s, f) => s + (f.demand || 5), 0) / safeTheir.length : 5;

  const avgYourHype = safeYour.length ? safeYour.reduce((s, f) => s + (f.hypeFactor || 5), 0) / safeYour.length : 5;
  const avgTheirHype = safeTheir.length ? safeTheir.reduce((s, f) => s + (f.hypeFactor || 5), 0) / safeTheir.length : 5;

  return {
    yourMarketValue,
    theirMarketValue,
    yourBeliValue,
    theirBeliValue,
    diff,
    percentageDiff,
    grade,
    title,
    subtitle,
    barPercentage: Math.max(0, Math.min(100, barPercentage)),
    barColor,
    isBeliCompliant,
    factors: {
      demandScore: Number(avgTheirDemand.toFixed(1)),
      liquidityScore: Number(avgYourDemand.toFixed(1)),
      hypeFactor: Number(avgTheirHype.toFixed(1)),
      rarityParity: safeYour.length === safeTheir.length ? 10 : 7,
      futureTrend: percentageDiff > 5 ? 'Bullish' : percentageDiff < -5 ? 'Bearish' : 'Neutral',
      tradeEfficiency: Math.max(0, Math.min(100, Math.round(100 - Math.abs(percentageDiff) / 2))),
    },
  };
}
