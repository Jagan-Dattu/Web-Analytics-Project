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
    const handRanks = hand.map(c => ranks.indexOf(c[0])).sort((a,b)=>b-a);
    const handSuits = hand.map(c => c[1]);

    const rankCounts = handRanks.reduce((acc,r)=>{
      acc[r] = (acc[r]||0)+1; return acc;
    }, {});
    const counts = Object.values(rankCounts).sort((a,b)=>b-a);

    const isFlush = new Set(handSuits).size === 1;

    let isStraight = false;
    const uniqRanks = [...new Set(handRanks)].sort((a,b)=>b-a);
    if (uniqRanks.length >= 5) {
      for (let i=0; i<=uniqRanks.length-5; i++) {
        if (uniqRanks[i]-uniqRanks[i+4]===4) { isStraight=true; break; }
      }
      // wheel straight A-2-3-4-5
      if (JSON.stringify(uniqRanks.slice(-4).concat(12)) === JSON.stringify([3,2,1,0,12])) isStraight=true;
    }

    let score = [];
    const sortedUniqueRanksByCount = Object.keys(rankCounts).map(Number)
      .sort((a,b)=>{
        const cA = rankCounts[a], cB = rankCounts[b];
        if (cA!==cB) return cB-cA;
        return b-a;
      });

    if (isStraight && isFlush) score=[8, Math.max(...uniqRanks)];
    else if (counts[0]===4) score=[7, ...sortedUniqueRanksByCount];
    else if (counts[0]===3 && counts[1]>=2) score=[6, ...sortedUniqueRanksByCount];
    else if (isFlush) score=[5, ...handRanks];
    else if (isStraight) score=[4, Math.max(...uniqRanks)];
    else if (counts[0]===3) score=[3, ...sortedUniqueRanksByCount];
    else if (counts[0]===2 && counts[1]===2) score=[2, ...sortedUniqueRanksByCount];
    else if (counts[0]===2) score=[1, ...sortedUniqueRanksByCount];
    else score=[0, ...handRanks];

    for (let i=0;i<Math.max(bestScore.length,score.length);i++){
      if ((score[i]??-1)>(bestScore[i]??-1)) { bestScore=score; break; }
      if ((score[i]??-1)<(bestScore[i]??-1)) break;
    }
  }
  return bestScore;
}

function handRankToName(score){
  if (!score || score.length===0) return "Unknown";
  switch(score[0]){
    case 8: return "Straight Flush";
    case 7: return "Four of a Kind";
    case 6: return "Full House";
    case 5: return "Flush";
    case 4: return "Straight";
    case 3: return "Three of a Kind";
    case 2: return "Two Pair";
    case 1: return "One Pair";
    default: return "High Card";
  }
}

module.exports = { getHandRank, handRankToName };
