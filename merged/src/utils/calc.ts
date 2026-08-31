import { Fruit, TradeAnalysis, VerdictGrade } from '../types';

export function formatMoney(val: number): string {
  if (val === undefined || val === null || isNaN(val)) return '0';
  if (val >= 1000000000) {
    return (val / 1000000000).toFixed(val % 1000000000 === 0 ? 0 : 2) + 'B';
  }
  if (val >= 1000000) {
    const formatted = (val / 1000000).toFixed(val % 1000000 === 0 ? 0 : 1);
    return formatted + 'M';
  }
  if (val >= 1000) {
    return (val / 1000).toFixed(0) + 'K';
  }
  return val.toLocaleString();
}

export function formatFullNumber(val: number): string {
  if (val === undefined || val === null || isNaN(val)) return '0';
  return val.toLocaleString();
}

export function calculateTrade(
  yourSlots: (Fruit | null)[],
  theirSlots: (Fruit | null)[]
): TradeAnalysis {
  const activeYour = yourSlots.filter((f): f is Fruit => f !== null);
  const activeTheir = theirSlots.filter((f): f is Fruit => f !== null);

  const yourMarketValue = activeYour.reduce((acc, f) => acc + (f.marketValue || 0), 0);
  const theirMarketValue = activeTheir.reduce((acc, f) => acc + (f.marketValue || 0), 0);

  const yourBeliValue = activeYour.reduce((acc, f) => acc + (f.beliPrice || 0), 0);
  const theirBeliValue = activeTheir.reduce((acc, f) => acc + (f.beliPrice || 0), 0);

  const diff = theirMarketValue - yourMarketValue;

  let percentageDiff = 0;
  if (yourMarketValue > 0) {
    percentageDiff = ((theirMarketValue - yourMarketValue) / yourMarketValue) * 100;
  } else if (theirMarketValue > 0) {
    percentageDiff = 100;
  }

  // 40% Beli rule check (applicable if both sides have physical beli prices > 0)
  let isBeliCompliant = true;
  if (yourBeliValue > 0 && theirBeliValue > 0) {
    const maxBeli = Math.max(yourBeliValue, theirBeliValue);
    const beliDiff = Math.abs(yourBeliValue - theirBeliValue);
    if (beliDiff / maxBeli > 0.40) {
      isBeliCompliant = false;
    }
  }

  // Calculate advanced factor scores
  const avgYourDemand = activeYour.length > 0
    ? activeYour.reduce((acc, f) => acc + (f.demand || 5), 0) / activeYour.length
    : 0;
  const avgTheirDemand = activeTheir.length > 0
    ? activeTheir.reduce((acc, f) => acc + (f.demand || 5), 0) / activeTheir.length
    : 0;
  const demandScore = Math.min(10, Math.max(1, Math.round((avgTheirDemand - avgYourDemand + 5))));

  const highDemandCount = activeTheir.filter((f) => (f.demand || 0) >= 8).length;
  const liquidityScore = Math.min(10, Math.max(1, highDemandCount * 3 + 2));

  const avgYourHype = activeYour.length > 0
    ? activeYour.reduce((acc, f) => acc + (f.hypeFactor || 5), 0) / activeYour.length
    : 0;
  const avgTheirHype = activeTheir.length > 0
    ? activeTheir.reduce((acc, f) => acc + (f.hypeFactor || 5), 0) / activeTheir.length
    : 0;
  const hypeFactor = Math.min(10, Math.max(1, Math.round(avgTheirHype)));

  const theirRising = activeTheir.filter((f) => f.trend === 'Rising').length;
  const theirFalling = activeTheir.filter((f) => f.trend === 'Falling').length;
  let futureTrend: 'Bullish' | 'Neutral' | 'Bearish' = 'Neutral';
  if (theirRising > theirFalling) futureTrend = 'Bullish';
  else if (theirFalling > theirRising) futureTrend = 'Bearish';

  const factors = {
    demandScore,
    liquidityScore,
    hypeFactor,
    rarityParity: activeTheir.length > 0 ? 8 : 0,
    futureTrend,
    tradeEfficiency: Math.min(100, Math.max(0, Math.round(50 + percentageDiff / 2))),
  };

  // Determine Grade, Title, Subtitle, and visual Bar Percentage
  if (activeYour.length === 0 && activeTheir.length === 0) {
    return {
      yourMarketValue: 0,
      theirMarketValue: 0,
      yourBeliValue: 0,
      theirBeliValue: 0,
      diff: 0,
      percentageDiff: 0,
      grade: '—',
      title: 'EMPTY TERMINAL',
      subtitle: 'Add fruits to both sides to run real-time arbitrage valuation.',
      barPercentage: 50,
      barColor: '#64748b',
      isBeliCompliant: true,
      factors,
    };
  }

  if (activeYour.length === 0 && activeTheir.length > 0) {
    return {
      yourMarketValue: 0,
      theirMarketValue,
      yourBeliValue: 0,
      theirBeliValue,
      diff: theirMarketValue,
      percentageDiff: 100,
      grade: 'BW',
      title: 'FREE ASSETS',
      subtitle: 'You are receiving free items with zero offer cost.',
      barPercentage: 100,
      barColor: '#10b981',
      isBeliCompliant: true,
      factors,
    };
  }

  if (activeYour.length > 0 && activeTheir.length === 0) {
    return {
      yourMarketValue,
      theirMarketValue: 0,
      yourBeliValue,
      theirBeliValue: 0,
      diff: -yourMarketValue,
      percentageDiff: -100,
      grade: 'BL',
      title: 'UNILATERAL GIFT',
      subtitle: 'You are offering items without receiving any return.',
      barPercentage: 0,
      barColor: '#ef4444',
      isBeliCompliant: true,
      factors,
    };
  }

  let grade: VerdictGrade = 'F';
  let title = 'FAIR EXCHANGE';
  let subtitle = 'Both sides present balanced market liquidity and value parity.';
  let barColor = '#fbbf24';

  if (percentageDiff >= 25) {
    grade = 'BW';
    title = 'BIG WIN';
    subtitle = 'Massive positive arbitrage margin in your favor.';
    barColor = '#10b981';
  } else if (percentageDiff >= 6) {
    grade = 'W';
    title = 'WIN';
    subtitle = 'Favorable trade with solid positive margin.';
    barColor = '#34d399';
  } else if (percentageDiff >= -6) {
    grade = 'F';
    title = 'FAIR';
    subtitle = 'Balanced exchange within standard market volatility tolerance.';
    barColor = '#fbbf24';
  } else if (percentageDiff >= -25) {
    grade = 'L';
    title = 'LOSS';
    subtitle = 'Unfavorable trade. You are overpaying in market value.';
    barColor = '#f87171';
  } else {
    grade = 'BL';
    title = 'BIG LOSS';
    subtitle = 'Severe value deficit. High recommendation to decline or counter-offer.';
    barColor = '#ef4444';
  }

  const clampedPercentage = Math.min(100, Math.max(0, 50 + percentageDiff / 2));

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
    barPercentage: clampedPercentage,
    barColor,
    isBeliCompliant,
    factors,
  };
}
