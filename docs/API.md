# API Documentation

## Endpoints

### Health Check

**GET** `/api/health`

Returns server health status.

**Response:**
```json
{
  "status": "healthy",
  "uptime": 12345,
  "timestamp": "2024-09-15T10:30:00.000Z"
}
```

### Scan Image

**POST** `/api/scan`

Initiates a security scan for a container image.

**Request Body:**
```json
{
  "image": "nginx:latest",
  "registry": "docker.io",
  "policies": ["default"]
}
```

**Response (202 Accepted):**
```json
{
  "scanId": "scan_1001",
  "status": "scanning",
  "message": "Scan initiated successfully",
  "statusUrl": "/api/scan/scan_1001"
}
```

### Get Scan Results

**GET** `/api/scan/:id`

Retrieves results for a specific scan.

**Response:**
```json
{
  "id": "scan_1001",
  "image": "nginx:latest",
  "status": "completed",
  "results": {
    "summary": {
      "totalVulnerabilities": 12,
      "critical": 0,
      "high": 2,
      "medium": 5,
      "low": 5
    },
    "vulnerabilities": [...],
    "policyResults": {...}
  }
}
```

### List Scans

**GET** `/api/scans?limit=10`

Lists recent scans.

**Response:**
```json
{
  "total": 50,
  "scans": [...]
}
```

## Error Responses

All endpoints may return standard error responses:

**400 Bad Request:**
```json
{
  "error": "Invalid request",
  "details": [...]
}
```

**404 Not Found:**
```json
{
  "error": "Scan not found",
  "scanId": "scan_1234"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error"
}
```
