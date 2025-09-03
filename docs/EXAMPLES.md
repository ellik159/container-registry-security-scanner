# Example: Scanning nginx image

```bash
# Start the server
npm start

# In another terminal, scan an image using the CLI
npm run cli scan nginx:latest

# Or use the API
curl -X POST http://localhost:3000/api/scan \
  -H "Content-Type: application/json" \
  -d '{"image": "nginx:latest"}'

# Check results
curl http://localhost:3000/api/scan/scan_1000
```

## Expected Output

```
=== Scan Results ===
Image: nginx:latest
Scanned: 2024-12-14T20:30:00.000Z
Duration: 2345ms

--- Summary ---
Total Vulnerabilities: 12
  Critical: 0
  High: 2
  Medium: 5
  Low: 5
Policy Violations: 1
Signature Valid: No

--- Vulnerabilities ---
CVE-2024-1234 [HIGH] - openssl 1.1.1
  Score: 7.5
CVE-2024-5678 [HIGH] - libssl1.1 1.1.1f
  Score: 8.2
CVE-2024-9012 [MEDIUM] - curl 7.68.0
  Score: 5.3

--- Policy Violations ---
[MEDIUM] non-root-user: Image runs as root user

Status: ✗ FAIL
```

## Different Image Examples

```bash
# Scan Ubuntu
npm run cli scan ubuntu:20.04

# Scan Alpine (usually cleaner)
npm run cli scan alpine:latest

# Scan custom image
npm run cli scan myregistry.io/myapp:v1.2.3
```
