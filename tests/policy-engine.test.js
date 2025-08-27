const policyEngine = require('../src/policy-engine');

describe('PolicyEngine', () => {
  const mockImageInfo = {
    Id: 'sha256:abc123',
    Size: 100000000,
    Created: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    Config: {
      User: 'root'
    }
  };

  test('should load default policy', async () => {
    const policy = await policyEngine.loadDefaultPolicy();
    expect(policy).toHaveProperty('maxCriticalVulns');
  });

  test('should flag critical vulnerabilities', async () => {
    const vulnerabilities = [
      { severity: 'CRITICAL', cveId: 'CVE-2024-0001' },
      { severity: 'HIGH', cveId: 'CVE-2024-0002' }
    ];

    const result = await policyEngine.evaluate(mockImageInfo, vulnerabilities);
    
    expect(result.passed).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });

  test('should warn on root user', async () => {
    const result = await policyEngine.evaluate(mockImageInfo, []);
    
    const rootViolation = result.violations.find(v => v.rule === 'non-root-user');
    expect(rootViolation).toBeDefined();
  });
});
