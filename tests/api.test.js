const request = require('supertest');
const app = require('../src/server');

describe('API Endpoints', () => {
  test('GET /api/health should return healthy status', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.body.status).toBe('healthy');
    expect(response.body).toHaveProperty('uptime');
  });

  test('POST /api/scan should accept valid scan request', async () => {
    const response = await request(app)
      .post('/api/scan')
      .send({
        image: 'nginx:latest',
        registry: 'docker.io'
      })
      .expect(202);

    expect(response.body).toHaveProperty('scanId');
    expect(response.body.status).toBe('scanning');
  });

  test('POST /api/scan should reject invalid image format', async () => {
    const response = await request(app)
      .post('/api/scan')
      .send({
        image: 'invalid image name!@#'
      })
      .expect(400);

    expect(response.body.error).toBe('Invalid request');
  });

  test('GET /api/scan/:id should return 404 for non-existent scan', async () => {
    await request(app)
      .get('/api/scan/nonexistent')
      .expect(404);
  });

  test('GET /api/scans should return recent scans list', async () => {
    const response = await request(app)
      .get('/api/scans')
      .expect(200);

    expect(response.body).toHaveProperty('scans');
    expect(Array.isArray(response.body.scans)).toBe(true);
  });
});
