#!/usr/bin/env node

const { Command } = require('commander');
const scanner = require('./scanner');
const logger = require('./utils/logger');

const program = new Command();

program
  .name('crscan')
  .description('Container Registry Security Scanner CLI')
  .version('0.3.2');  // TODO: update this automatically

program
  .command('scan')
  .description('Scan a container image for vulnerabilities')
  .argument('<image>', 'Image to scan (e.g., nginx:latest)')
  .option('-r, --registry <registry>', 'Registry URL', 'docker.io')
  .option('-p, --policy <file>', 'Custom policy file')
  .option('-o, --output <file>', 'Output file for results')
  .option('--json', 'Output in JSON format')
  .action(async (image, options) => {
    try {
      console.log(`Scanning ${image}...`);
      console.log('');
      
      const results = await scanner.scanImage(image, {
        registry: options.registry,
        policies: options.policy ? [options.policy] : []
      });
      
      if (options.json) {
        console.log(JSON.stringify(results, null, 2));
      } else {
        printResults(results);
      }
      
      // Exit with error code if vulnerabilities found
      const exitCode = results.summary.critical > 0 || results.summary.high > 5 ? 1 : 0;
      process.exit(exitCode);
      
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

program
  .command('info')
  .description('Display scanner information')
  .action(() => {
    console.log('Container Registry Security Scanner');
    console.log('Version: 0.3.1');
    console.log('Author: Mario Perez');
    console.log('');
    console.log('Capabilities:');
    console.log('  - CVE vulnerability scanning');
    console.log('  - Policy enforcement');
    console.log('  - Image signature verification');
    console.log('  - Multi-registry support');
  });

function printResults(results) {
  console.log('=== Scan Results ===');
  console.log(`Image: ${results.image}`);
  console.log(`Scanned: ${results.scannedAt}`);
  console.log(`Duration: ${results.duration}`);
  console.log('');
  
  console.log('--- Summary ---');
  console.log(`Total Vulnerabilities: ${results.summary.totalVulnerabilities}`);
  console.log(`  Critical: ${results.summary.critical}`);
  console.log(`  High: ${results.summary.high}`);
  console.log(`  Medium: ${results.summary.medium}`);
  console.log(`  Low: ${results.summary.low}`);
  console.log(`Policy Violations: ${results.summary.policyViolations}`);
  console.log(`Signature Valid: ${results.summary.signatureValid ? 'Yes' : 'No'}`);
  console.log('');
  
  if (results.vulnerabilities.length > 0) {
    console.log('--- Vulnerabilities ---');
    results.vulnerabilities.slice(0, 10).forEach(vuln => {
      console.log(`${vuln.cveId} [${vuln.severity}] - ${vuln.package} ${vuln.version}`);
      console.log(`  Score: ${vuln.score}`);
    });
    
    if (results.vulnerabilities.length > 10) {
      console.log(`... and ${results.vulnerabilities.length - 10} more`);
    }
    console.log('');
  }
  
  if (results.policyResults.violations.length > 0) {
    console.log('--- Policy Violations ---');
    results.policyResults.violations.forEach(v => {
      console.log(`[${v.severity.toUpperCase()}] ${v.rule}: ${v.message}`);
    });
    console.log('');
  }
  
  if (results.policyResults.warnings.length > 0) {
    console.log('--- Warnings ---');
    results.policyResults.warnings.forEach(w => {
      console.log(`[${w.severity.toUpperCase()}] ${w.rule}: ${w.message}`);
    });
    console.log('');
  }
  
  const status = results.summary.critical === 0 && results.summary.policyViolations === 0
    ? '✓ PASS'
    : '✗ FAIL';
  console.log(`Status: ${status}`);
}

program.parse();
