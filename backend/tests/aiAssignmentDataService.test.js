const test = require('node:test');
const assert = require('node:assert/strict');
const { fingerprint } = require('../services/aiAssignmentDataService');

test('recommendation fingerprint is order-stable for object keys', () => {
  const first = { jobs: [{ job_id: 'job-1', priority: 'HIGH' }], candidates_by_job: { 'job-1': [{ mechanic_id: 'm-1', workload_minutes: 0 }] } };
  const second = { candidates_by_job: { 'job-1': [{ workload_minutes: 0, mechanic_id: 'm-1' }] }, jobs: [{ priority: 'HIGH', job_id: 'job-1' }] };
  assert.equal(fingerprint(first), fingerprint(second));
});
