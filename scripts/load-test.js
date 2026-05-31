import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    { duration: '10s', target: 20 },
    { duration: '20s', target: 100 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<100'],  // fail if p95 > 100ms
  },
}

export default function () {
  const r = http.get(`${__ENV.BASE_URL}/test-slug`)
  check(r, {
    'status is 2xx or 3xx': (r) => r.status < 400,
  })
  sleep(0.1)
}
