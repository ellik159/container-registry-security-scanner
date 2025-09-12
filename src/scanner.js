const Docker = require('dockerode');
const cveChecker = require('./cve-checker');
const policyEngine = require('./policy-engine');
const signatureVerifier = require('./signature-verifier');
const logger = require('./utils/logger');

// TODO: maybe make this configurable via options
const docker = new Docker({ 
  socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock' 
});

class ImageScanner {
  async scanImage(imageTag, options = {}) {
    const startTime = Date.now();
    
    try {
      logger.info(`Starting scan: ${imageTag}`);
      
      // Pull if needed
      await this.ensureImage(imageTag);
      
      // Get basic image info
      const imageInfo = await this.getImageInfo(imageTag);
      
      // Extract layers and packages
      const layers = await this.analyzeLayers(imageInfo);
      const packages = await this.extractPackages(imageTag);
      
      // Run all the checks
      const vulnerabilities = await cveChecker.checkVulnerabilities(packages);
      const signatureStatus = await signatureVerifier.verify(imageTag);
      const policyResults = await policyEngine.evaluate(
        imageInfo, 
        vulnerabilities, 
        options.policies
      );
      
      const duration = Date.now() - startTime;
      
      // Build the result object
      return {
        image: imageTag,
        scannedAt: new Date().toISOString(),
        duration: `${duration}ms`,
        summary: {
          totalVulnerabilities: vulnerabilities.length,
          critical: vulnerabilities.filter(v => v.severity === 'CRITICAL').length,
          high: vulnerabilities.filter(v => v.severity === 'HIGH').length,
          medium: vulnerabilities.filter(v => v.severity === 'MEDIUM').length,
          low: vulnerabilities.filter(v => v.severity === 'LOW').length,
          policyViolations: policyResults.violations.length,
          signatureValid: signatureStatus.valid
        },
        imageInfo: {
          id: imageInfo.Id,
          size: imageInfo.Size,
          created: imageInfo.Created,
          architecture: imageInfo.Architecture,
          os: imageInfo.Os,
          layers: layers.length
        },
        vulnerabilities,
        policyResults,
        signatureStatus,
        packages: packages.length  // just the count for summary
      };
      
    } catch (error) {
      logger.error(`Scan failed for ${imageTag}: ${error.message}`, { stack: error.stack });
      // Better error message for debugging
      throw new Error(`Failed to scan image ${imageTag}: ${error.message}`);
    }
  }
  
  async ensureImage(imageTag) {
    try {
      // Check if image exists locally
      const image = docker.getImage(imageTag);
      await image.inspect();
      logger.info(`Image ${imageTag} found locally`);
    } catch (err) {
      // Image not found, try to pull it
      logger.info(`Pulling image ${imageTag}...`);
      await new Promise((resolve, reject) => {
        docker.pull(imageTag, (err, stream) => {
          if (err) return reject(err);
          
          docker.modem.followProgress(stream, (err, output) => {
            if (err) return reject(err);
            resolve(output);
          });
        });
      });
      logger.info(`Image ${imageTag} pulled successfully`);
    }
  }
  
  async getImageInfo(imageTag) {
    const image = docker.getImage(imageTag);
    const info = await image.inspect();
    return info;
  }
  
  async analyzeLayers(imageInfo) {
    // Extract layer information
    const layers = imageInfo.RootFS?.Layers || [];
    
    return layers.map((layer, index) => ({
      id: layer,
      index,
      // Could add more layer analysis here
    }));
  }
  
  async extractPackages(imageTag) {
    // This is a simplified version - in production would use proper package extraction
    // For now, creates a container, runs package manager commands, and parses output
    
    try {
      // TODO: add timeout here, some images take forever
      const container = await docker.createContainer({
        Image: imageTag,
        Cmd: ['/bin/sh', '-c', 'which dpkg && dpkg -l || which rpm && rpm -qa || which apk && apk info || echo "no package manager found"'],
        AttachStdout: true,
        AttachStderr: true,
        Tty: false
      });
      
      await container.start();
      
      // Wait for container to finish
      const waitResult = await container.wait();
      // console.log('Container exit code:', waitResult.StatusCode);  // debug
      
      // Get logs
      const logs = await container.logs({
        stdout: true,
        stderr: true
      });
      
      // Clean up
      await container.remove();
      
      // Parse package list (simplified)
      const packageList = this.parsePackageOutput(logs.toString());
      
      return packageList;
      
    } catch (err) {
      logger.warn(`Could not extract packages: ${err.message}`);
      // Return empty array if can't extract packages
      return [];
    }
  }
  
  parsePackageOutput(output) {
    // Simplified package parsing
    const packages = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      // Very basic dpkg parsing
      if (line.match(/^ii\s+/)) {
        const parts = line.split(/\s+/);
        if (parts.length >= 3) {
          packages.push({
            name: parts[1],
            version: parts[2],
            type: 'deb'
          });
        }
      }
      // Basic rpm parsing - fixed bug with hyphenated names
      else if (line.match(/^[\w\-\+]+\-[\d\.]+/)) {
        const match = line.match(/^([\w\-\+]+)\-([\d\.]+)/);
        if (match) {
          packages.push({
            name: match[1],
            version: match[2],
            type: 'rpm'
          });
        }
      }
    }
    
    logger.info(`Extracted ${packages.length} packages`);
    return packages;
  }
}

module.exports = new ImageScanner();
