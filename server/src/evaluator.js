// The new evaluator.js file

const ranks = '23456789TJQKA';

function getHandRank(sevenCards) {
  const combinations = [];
  function findCombinations(offset, combo) {
      if (combo.length === 5) { combinations.push(combo); return; }
      if (offset >= sevenCards.length) return;
      findCombinations(offset + 1, [...combo, sevenCards[offset]]);
      findCombinations(offset + 1, combo);
  }
  findCombinations(0, []);
  
  let bestScore = [-1];

  for (const hand of combinations) {
    const handRanks = hand.map(c => ranks.indexOf(c[0])).sort((a, b) => b - a);
    const handSuits = hand.map(c => c[1]);
    const rankCounts = handRanks.reduce((acc, r) => { acc[r] = (acc[r] || 0) + 1; return acc; }, {});
    const counts = Object.values(rankCounts).sort((a, b) => b - a);
    const isFlush = new Set(handSuits).size === 1;
    
    let isStraight = false;
    const uniqueRanks = [...new Set(handRanks)];
    if (uniqueRanks.length >= 5) {
        if (uniqueRanks[0] - uniqueRanks[4] === 4) isStraight = true;
        else if (JSON.stringify(uniqueRanks.slice(0,5)) === JSON.stringify([12,3,2,1,0])) isStraight = true;
    }

    let score = [];
    const sortedUniqueRanksByCount = Object.keys(rankCounts).map(Number).sort((a,b) => {
        const countA = rankCounts[a]; const countB = rankCounts[b];
        if (countA !== countB) return countB - countA;
        return b - a;
    });

    if (isStraight && isFlush) score = [8, isStraight && JSON.stringify(uniqueRanks.slice(0,5)) === JSON.stringify([12,3,2,1,0]) ? 3 : sortedUniqueRanksByCount[0]];
    else if (counts[0] === 4) score = [7, ...sortedUniqueRanksByCount];
    else if (counts[0] === 3 && counts[1] >= 2) score = [6, ...sortedUniqueRanksByCount];
    else if (isFlush) score = [5, ...handRanks];
    else if (isStraight) score = [4, isStraight && JSON.stringify(uniqueRanks.slice(0,5)) === JSON.stringify([12,3,2,1,0]) ? 3 : sortedUniqueRanksByCount[0]];
    else if (counts[0] === 3) score = [3, ...sortedUniqueRanksByCount];
    else if (counts[0] === 2 && counts[1] === 2) score = [2, ...sortedUniqueRanksByCount];
    else if (counts[0] === 2) score = [1, ...sortedUniqueRanksByCount];
    else score = [0, ...handRanks];

    for (let i = 0; i < Math.max(bestScore.length, score.length); i++) {
        if ((score[i] ?? -1) > (bestScore[i] ?? -1)) { bestScore = score; break; }
        if ((score[i] ?? -1) < (bestScore[i] ?? -1)) break;
    }
  }
  return bestScore;
}

module.exports = { getHandRank };