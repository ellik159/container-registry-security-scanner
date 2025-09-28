# Container Registry Security Scanner 🔒

Scans Docker images for security issues - CVEs, policy violations, and checks signatures. Built because I needed something simple that works with our CI pipeline.

## What it does

- Checks container images for known vulnerabilities (CVEs)
- Enforces security policies (severity limits, allowed registries, etc.)
- Verifies image signatures (basic support for now)
- Gives you a JSON report you can use in automation

## Quick Start ⚡

```bash
# Install dependencies
npm install

# Start the API server (optional)
npm start

# Or just use the CLI
npm run cli -- scan nginx:latest

# Docker version
docker build -t crscan .
docker run -v /var/run/docker.sock:/var/run/docker.sock crscan scan ubuntu:20.04
```

## Features

- CVE scanning using NVD data (needs API key for production)
- Policy engine - define what's allowed/blocked
- Basic signature verification
- REST API for integration
- CLI tool for quick checks
- Docker support obviously

## API

Basic endpoints:

```bash
# Start a scan
POST /api/scan
{
  "image": "nginx:latest"
}

# Get results
GET /api/scan/:id

# Health check
GET /api/health
```

More details in docs/API.md if you need them.

## Configuration

Copy `.env.example` to `.env` and set your NVD API key if you have one:

```
PORT=3000
LOG_LEVEL=info
NVD_API_KEY=your_key_here  # optional but recommended
DOCKER_SOCKET=/var/run/docker.sock
```

## CLI Usage

```bash
# Scan an image
node src/cli.js scan ubuntu:20.04

# With custom policy
node src/cli.js scan myapp:v1.2 --policy config/strict-policy.json

# Check status
node src/cli.js status <scan-id>
```

## Architecture

Basically: pulls image -> extracts packages -> checks CVEs -> applies policies -> gives you results.

The scanner creates a temporary container to run package manager commands (dpkg/rpm/apk) and parses the output. Could be better but works for most images.

## Development

```bash
npm install
npm test
npm run dev  # auto-reload
```

Tests are in `tests/` - coverage is around 60-70%, good enough for now.

## TODO / Known Issues

- [ ] Harbor registry support (only Docker Hub and basic auth work)
- [ ] CVE database caching - currently in-memory, should use Redis
- [ ] Signature verification is basic - needs proper chain of trust
- [ ] Large images (>2GB) can timeout
- [ ] Some registries need better auth handling
- [ ] Add webhook notifications
- [ ] Air-gapped environment support
- [ ] Add more comprehensive tests for edge cases

## Notes

The signature verification part is pretty basic right now - it just checks if a signature exists, doesn't validate the full chain. That's on the TODO list (see above).

Performance is okay for most images. The sequential scanning works fine but could be faster with parallel layer analysis. Maybe later.

Based on Docker security best practices and NIST guidelines. CVE data from NVD API (needs key for production).

Found a bug with RPM package parsing that took a while to fix - see commit from Aug 23.

## License

MIT