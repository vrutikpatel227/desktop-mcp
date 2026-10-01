import fs from 'node:fs/promises';
import { verifyRelease, type ReleaseManifest } from '../packages/update/src/verify.js';

const [manifestPath, signaturePath, publicKeyPath] = process.argv.slice(2);
if (!manifestPath || !signaturePath || !publicKeyPath) {
  console.error('Usage: npx tsx scripts/verify-release.ts manifest.json signature.b64 public-key.pem');
  process.exit(2);
}

const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8')) as ReleaseManifest;
const signature = (await fs.readFile(signaturePath, 'utf8')).trim();
const publicKey = await fs.readFile(publicKeyPath, 'utf8');
if (!verifyRelease(manifest, signature, publicKey)) {
  console.error('RELEASE_SIGNATURE_INVALID');
  process.exit(1);
}
console.log('RELEASE_SIGNATURE_VALID');
console.log(JSON.stringify(manifest, null, 2));
