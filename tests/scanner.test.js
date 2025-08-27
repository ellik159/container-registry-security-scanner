const scanner = require('../src/scanner');
const Docker = require('dockerode');

// Mock Docker
jest.mock('dockerode');

describe('ImageScanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should parse package output correctly', () => {
    const mockOutput = `ii  curl    7.68.0-1ubuntu2  amd64  command line tool
ii  openssl 1.1.1f-1ubuntu2   amd64  SSL toolkit`;

    const packages = scanner.parsePackageOutput(mockOutput);
    
    expect(packages).toHaveLength(2);
    expect(packages[0].name).toBe('curl');
    expect(packages[0].version).toBe('7.68.0-1ubuntu2');
  });

  test('should handle empty package output', () => {
    const packages = scanner.parsePackageOutput('');
    expect(packages).toHaveLength(0);
  });

  // TODO: Add more comprehensive tests
  // - Test full scan workflow
  // - Test error handling
  // - Test layer analysis
});
