import type { SnykPayload, SonarPayload, TrivyPayload } from '@/features/triage/types/domain'

export const MOCK_SONAR_REPORTS: SonarPayload[] = [
  {
    key: 'AX-SONAR-001',
    rule: 'java:S3649',
    severity: 'CRITICAL',
    component: 'payments-api:src/user/repository.ts',
    line: 42,
    message: 'Unsanitized user input reaches SQL query.',
    service: 'payments-api',
    environment: 'prod',
    project: 'payments-api',
    reportId: 'scan-sonar-2026-03-06',
    repository: 'github.com/acme/payments-api',
  },
  {
    key: 'AX-SONAR-002',
    rule: 'java:S3649',
    severity: 'CRITICAL',
    component: 'payments-api:src/user/repository.ts',
    line: 44,
    message: 'Unsanitized user input reaches SQL query.',
    service: 'payments-api',
    environment: 'prod',
    project: 'payments-api',
    reportId: 'scan-sonar-2026-03-06',
    repository: 'github.com/acme/payments-api',
  },
]

export const MOCK_SNYK_REPORTS: SnykPayload[] = [
  {
    id: 'SNYK-JS-LODASH-567746',
    title: 'Prototype Pollution',
    severity: 'high',
    packageName: 'lodash',
    version: '4.17.19',
    cve: ['CVE-2021-23337'],
    cwe: ['CWE-1321'],
    service: 'web-portal',
    environment: 'stage',
    project: 'web-portal',
    reportId: 'scan-snyk-2026-03-06',
    repository: 'github.com/acme/web-portal',
  },
]

export const MOCK_TRIVY_REPORTS: TrivyPayload[] = [
  {
    vulnerabilityId: 'CVE-2023-38545',
    title: 'curl heap overflow',
    severity: 'CRITICAL',
    packageName: 'curl',
    installedVersion: '8.0.1-r0',
    fixedVersion: '8.4.0-r0',
    image: 'registry.acme.local/payments-api:1.2.0',
    digest: 'sha256:abc123',
    service: 'payments-api',
    environment: 'prod',
    project: 'payments-api-image',
    reportId: 'scan-trivy-2026-03-06',
  },
]
