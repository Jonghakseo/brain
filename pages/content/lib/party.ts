import party from 'party-js';

export function showPartyEffect() {
  console.log('tada!');
  party.confetti(document.body, {
    count: party.variation.range(20, 200),
    size: party.variation.range(0.8, 2.2),
    // ... and more!
  });
}
