import type { Finding } from '@/features/triage/types/domain'

function hashString(value: string): string {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function makeFingerprint(vulnerabilityKey: string, assetKey: string): string {
  return `fp_${hashString(`${vulnerabilityKey}|${assetKey}`)}`
}

export function makeFindingId(fingerprint: string): string {
  return `fnd_${hashString(fingerprint)}`
}

export function makeAssetKey(finding: Pick<Finding, 'asset'>): string {
  const repository = finding.asset.repository ?? 'repo:none'
  const image = finding.asset.image ?? 'image:none'
  return [finding.asset.service, finding.asset.environment, repository, image].join('|')
}
