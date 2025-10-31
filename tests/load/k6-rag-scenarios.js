import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

export const errorRate = new Rate('errors');
export const l1Duration = new Trend('l1_duration');
export const l2Duration = new Trend('l2_duration');
export const l3Duration = new Trend('l3_duration');

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

const BASE_URL = __ENV.BASE_URL || 'https://amerivetaibot.bcgenrolls.com';
const API_PATH = __ENV.API_PATH || '/api/qa';

function buildPayload(query, tierHint) {
  return JSON.stringify({
    query,
    companyId: __ENV.COMPANY_ID || 'amerivet',
    userId: __ENV.USER_ID || 'load-test-user',
    planYear: __ENV.PLAN_YEAR || '2025',
    metadata: {
      tierHint,
      testRunId: __ENV.TEST_RUN_ID || `k6-${Date.now()}`,
    },
  });
}

function executeRequest(query, tierHint, durationMetric) {
  const response = http.post(`${BASE_URL}${API_PATH}`, buildPayload(query, tierHint), {
    headers: DEFAULT_HEADERS,
    tags: { tier: tierHint },
  });

  const passed = check(response, {
    'status is 200': (r) => r.status === 200,
    'has answer text': (r) => (r.json('answer') || '').length > 0,
  });

  if (!passed) {
    errorRate.add(1);
  }

  const latency = response.timings.duration;
  durationMetric.add(latency);

  return response;
}

export const options = {
  discardResponseBodies: false,
  thresholds: {
    errors: ['rate<0.05'],
    http_req_duration: ['p(95)<4000', 'p(99)<6500'],
    l1_duration: ['p(95)<1500'],
    l2_duration: ['p(95)<3000'],
    l3_duration: ['p(95)<5500'],
  },
  scenarios: {
    l1_cached: {
      executor: 'constant-arrival-rate',
      exec: 'scenarioL1',
      rate: Number(__ENV.L1_RATE || 30),
      timeUnit: '1m',
      duration: __ENV.L1_DURATION || '5m',
      preAllocatedVUs: Number(__ENV.L1_VUS || 10),
    },
    l2_semantic: {
      executor: 'ramping-arrival-rate',
      exec: 'scenarioL2',
      timeUnit: '1m',
      startRate: Number(__ENV.L2_START_RATE || 10),
      stages: [
        { target: Number(__ENV.L2_MAX_RATE || 60), duration: __ENV.L2_RAMP || '6m' },
        { target: Number(__ENV.L2_MAX_RATE || 60), duration: __ENV.L2_HOLD || '4m' },
        { target: 0, duration: '1m' },
      ],
      preAllocatedVUs: Number(__ENV.L2_VUS || 20),
      maxVUs: Number(__ENV.L2_MAX_VUS || 100),
    },
    l3_complex: {
      executor: 'constant-vus',
      exec: 'scenarioL3',
      vus: Number(__ENV.L3_VUS || 15),
      duration: __ENV.L3_DURATION || '5m',
    },
  },
};

export function scenarioL1() {
  const response = executeRequest(
    __ENV.L1_QUERY || 'What is my medical deductible?',
    'L1',
    l1Duration,
  );

  sleep(Number(__ENV.L1_SLEEP || 1));
  return response;
}

export function scenarioL2() {
  const response = executeRequest(
    __ENV.L2_QUERY || 'Compare the dental and medical benefits for family coverage.',
    'L2',
    l2Duration,
  );

  sleep(Number(__ENV.L2_SLEEP || 1.2));
  return response;
}

export function scenarioL3() {
  const response = executeRequest(
    __ENV.L3_QUERY || 'If I add my spouse mid-year, how does that affect premiums and HSA contributions?',
    'L3',
    l3Duration,
  );

  sleep(Number(__ENV.L3_SLEEP || 1.5));
  return response;
}
