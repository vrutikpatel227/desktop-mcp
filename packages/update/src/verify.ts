import { verify } from 'node:crypto';

export type ReleaseManifest = {
  version: string;
  platform: string;
  artifactUrl: string;
  sha256: string;
  issuedAt: string;
};

export function verifyRelease(manifest: ReleaseManifest, signatureBase64: string, publicKeyPem: string) {
  const payload = JSON.stringify(manifest);
  return verify(
    null,
    Buffer.from(payload, 'utf8'),
    publicKeyPem,
    Buffer.from(signatureBase64, 'base64')
  );
}
