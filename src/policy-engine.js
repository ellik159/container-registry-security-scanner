const fs = require('fs').promises;
const path = require('path');
const logger = require('./utils/logger');

const DEFAULT_POLICY_PATH = path.join(__dirname, '../config/default-policy.json');

class PolicyEngine {
  constructor() {
    this.defaultPolicy = null;
  }
  
  async loadDefaultPolicy() {
    if (!this.defaultPolicy) {
      try {
        const policyData = await fs.readFile(DEFAULT_POLICY_PATH, 'utf8');
        this.defaultPolicy = JSON.parse(policyData);
      } catch (err) {
        logger.warn(`Could not load default policy: ${err.message}`);
        this.defaultPolicy = this.getHardcodedDefaults();
      }
    }
    return this.defaultPolicy;
  }
  
  getHardcodedDefaults() {
    return {
      maxCriticalVulns: 0,
      maxHighVulns: 5,
      maxMediumVulns: 20,
      requireSignature: false,
      allowedRegistries: ['docker.io', 'gcr.io', 'quay.io'],
      blockedPackages: [],
      maxImageSize: 2 * 1024 * 1024 * 1024, // 2GB
      maxImageAge: 365 // days
    };
  }
  
  async evaluate(imageInfo, vulnerabilities, customPolicies = []) {
    const policy = await this.loadDefaultPolicy();
    const violations = [];
    const warnings = [];
    
    // Check vulnerability counts
    const criticalCount = vulnerabilities.filter(v => v.severity === 'CRITICAL').length;
    const highCount = vulnerabilities.filter(v => v.severity === 'HIGH').length;
    const mediumCount = vulnerabilities.filter(v => v.severity === 'MEDIUM').length;
    
    if (criticalCount > policy.maxCriticalVulns) {
      violations.push({
        rule: 'max-critical-vulnerabilities',
        severity: 'high',
        message: `Image has ${criticalCount} critical vulnerabilities (max allowed: ${policy.maxCriticalVulns})`
      });
    }
    
    if (highCount > policy.maxHighVulns) {
      violations.push({
        rule: 'max-high-vulnerabilities',
        severity: 'medium',
        message: `Image has ${highCount} high vulnerabilities (max allowed: ${policy.maxHighVulns})`
      });
    }
    
    if (mediumCount > policy.maxMediumVulns) {
      warnings.push({
        rule: 'max-medium-vulnerabilities',
        severity: 'low',
        message: `Image has ${mediumCount} medium vulnerabilities (max allowed: ${policy.maxMediumVulns})`
      });
    }
    
    // Check image size
    if (imageInfo.Size > policy.maxImageSize) {
      warnings.push({
        rule: 'max-image-size',
        severity: 'low',
        message: `Image size ${this.formatBytes(imageInfo.Size)} exceeds recommended maximum ${this.formatBytes(policy.maxImageSize)}`
      });
    }
    
    // Check image age
    const imageAge = this.getImageAgeDays(imageInfo.Created);
    if (imageAge > policy.maxImageAge) {
      warnings.push({
        rule: 'max-image-age',
        severity: 'low',
        message: `Image is ${imageAge} days old (max recommended: ${policy.maxImageAge} days)`
      });
    }
    
    // Check for root user (common security issue)
    if (imageInfo.Config?.User === '' || imageInfo.Config?.User === 'root') {
      violations.push({
        rule: 'non-root-user',
        severity: 'medium',
        message: 'Image runs as root user - security best practice is to use non-root user'
      });
    }
    
    const passed = violations.length === 0;
    
    logger.info(`Policy evaluation: ${passed ? 'PASSED' : 'FAILED'} (${violations.length} violations, ${warnings.length} warnings)`);
    
    return {
      passed,
      violations,
      warnings,
      policy: {
        name: 'default',
        version: '1.0'
      }
    };
  }
  
  formatBytes(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }
  
  getImageAgeDays(created) {
    const createdDate = new Date(created);
    const now = new Date();
    const diffMs = now - createdDate;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }
}

module.exports = new PolicyEngine();
