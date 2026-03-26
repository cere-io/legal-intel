import 'dotenv/config';
import { initRuntime, dumpCubbies, getCubbyTree } from './runtime.js';

async function test() {
  await initRuntime();
  const tree = getCubbyTree();
  console.log('Cubby entries loaded:', tree.length);
  console.log('\nSample paths:');
  tree.slice(0, 5).forEach(t => console.log(`  ${t.path} → ${t.preview.slice(0, 60)}`));

  const dump = dumpCubbies();
  const claim = dump['claims/vivian-theft'] as Record<string, unknown>;
  if (claim) {
    console.log('\n=== Vivian Theft Claim ===');
    console.log('Title:', claim.title);
    console.log('Strength:', claim.strength);
    console.log('Elements:', (claim.elements as Array<{id: string; status: string}>).map(e => `${e.id}:${e.status}`).join(', '));
    console.log('Connected claims:', Object.keys(claim.connected_claims as Record<string, number>));
    console.log('Evidence chain:', claim.evidence_chain);
  }

  const weights = dump['meta/claim_weights/default'] as Record<string, number>;
  if (weights) {
    console.log('\n=== Claim Weights ===');
    console.log('Count:', Object.keys(weights).length);
    console.log('Sum:', Object.values(weights).reduce((a, b) => a + b, 0).toFixed(4));
  }

  process.exit(0);
}
test();
