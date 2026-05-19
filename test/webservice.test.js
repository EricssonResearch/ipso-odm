/**
 * Tests for web service wrapper
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execSync, spawn } = require('child_process');

describe('Web Service', function() {
  let serverProcess;
  const PORT = 18084;

  before(function(done) {
    this.timeout(5000);
    serverProcess = spawn('node', [
      path.join(__dirname, '..', 'oma-sdf-ws', 'oma-sdf-ws.js')
    ], { env: { ...process.env, PORT: PORT } });

    serverProcess.stderr.on('data', (data) => {
      // debug output goes to stderr
    });

    serverProcess.stdout.on('data', (data) => {
      if (data.toString().includes('Starting web service')) {
        done();
      }
    });

    serverProcess.on('error', (err) => {
      done(err);
    });
  });

  after(function() {
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  function request(options, body) {
    return new Promise((resolve, reject) => {
      const req = http.request({ hostname: 'localhost', port: PORT, ...options }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      });
      req.on('error', reject);
      if (body) req.write(body);
      req.end();
    });
  }

  describe('POST /oma2sdf', function() {
    it('should convert OMA XML to SDF JSON', async function() {
      const xml = fs.readFileSync(path.join(__dirname, '..', 'samples', 'load.xml'), 'utf-8');
      const res = await request({
        path: '/oma2sdf?copyright=false&license=false',
        method: 'POST',
        headers: { 'Content-Type': 'application/xml' }
      }, xml);

      assert.strictEqual(res.status, 200);
      const result = JSON.parse(res.body);
      assert(result.sdfObject, 'Should have sdfObject');
      assert(result.sdfObject.Load, 'Should have Load object');
    });

    it('should return 400 for invalid XML', async function() {
      const res = await request({
        path: '/oma2sdf?copyright=false&license=false',
        method: 'POST',
        headers: { 'Content-Type': 'application/xml' }
      }, 'not xml at all {{{');

      assert.strictEqual(res.status, 400);
    });
  });

  describe('POST /sdf2oma', function() {
    it('should convert SDF JSON to OMA XML', async function() {
      const sdf = {
        info: { title: 'Test', copyright: 'Test', license: 'MIT' },
        sdfObject: {
          Test: {
            label: 'Test',
            description: 'A test object',
            sdfProperty: {
              value: { type: 'number', writable: false }
            }
          }
        }
      };

      const res = await request({
        path: '/sdf2oma',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, JSON.stringify(sdf));

      assert.strictEqual(res.status, 200);
      assert(res.body.includes('<?xml'), 'Should return XML');
      assert(res.body.includes('<Name>Test</Name>'), 'Should have object name');
    });

    it('should return 400 for invalid JSON', async function() {
      const res = await request({
        path: '/sdf2oma',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, 'not json');

      assert.strictEqual(res.status, 400);
    });
  });

  describe('GET /', function() {
    it('should return HTML index page', async function() {
      const res = await request({ path: '/', method: 'GET' });
      assert.strictEqual(res.status, 200);
      assert(res.body.includes('<html>'), 'Should return HTML');
    });
  });
});
