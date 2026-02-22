import { describe, it, expect, beforeEach } from 'vitest';
import { MetricsClassifier } from '../services/metrics-classifier';
import type { EndpointMetrics } from '../types/world-delta';
import type { MetricsClassifierConfig } from '../types/semantic';

const CONFIG: MetricsClassifierConfig = {
  latencyThresholdMs: 500,
  errorRateThreshold: 0.05,
  antiFlap: 3,
};

function makeMetrics(p95: number, errorRate: number): EndpointMetrics {
  return { rps: 100, p50: 50, p95, errorRate };
}

describe('MetricsClassifier', () => {
  let classifier: MetricsClassifier;

  beforeEach(() => {
    classifier = new MetricsClassifier(CONFIG);
  });

  // ── Basic classification ──

  it('returns unknown with no samples', () => {
    expect(classifier.classify('ep:1')).toBe('unknown');
  });

  it('returns normal after 3 normal samples', () => {
    classifier.push('ep:1', makeMetrics(200, 0.01));
    classifier.push('ep:1', makeMetrics(300, 0.02));
    classifier.push('ep:1', makeMetrics(250, 0.01));
    expect(classifier.classify('ep:1')).toBe('normal');
  });

  it('returns latency_high after 3 consecutive high-latency samples', () => {
    classifier.push('ep:1', makeMetrics(600, 0.01));
    classifier.push('ep:1', makeMetrics(700, 0.01));
    classifier.push('ep:1', makeMetrics(550, 0.01));
    expect(classifier.classify('ep:1')).toBe('latency_high');
  });

  it('returns error_rate_high after 3 consecutive high-error samples', () => {
    classifier.push('ep:1', makeMetrics(200, 0.1));
    classifier.push('ep:1', makeMetrics(200, 0.08));
    classifier.push('ep:1', makeMetrics(200, 0.06));
    expect(classifier.classify('ep:1')).toBe('error_rate_high');
  });

  // ── Anti-flap: entry ──

  it('does not trigger latency_high with only 2 high-latency samples', () => {
    classifier.push('ep:1', makeMetrics(600, 0.01));
    classifier.push('ep:1', makeMetrics(700, 0.01));
    expect(classifier.classify('ep:1')).toBe('unknown'); // not enough samples
  });

  it('does not trigger latency_high if 3rd sample is below threshold', () => {
    classifier.push('ep:1', makeMetrics(600, 0.01));
    classifier.push('ep:1', makeMetrics(700, 0.01));
    classifier.push('ep:1', makeMetrics(400, 0.01)); // below
    expect(classifier.classify('ep:1')).toBe('normal');
  });

  // ── Anti-flap: exit ──

  it('stays latency_high until 3 consecutive normal samples', () => {
    // Enter latency_high
    classifier.push('ep:1', makeMetrics(600, 0.01));
    classifier.push('ep:1', makeMetrics(700, 0.01));
    classifier.push('ep:1', makeMetrics(550, 0.01));
    expect(classifier.classify('ep:1')).toBe('latency_high');

    // 1 normal sample — not enough to exit
    classifier.push('ep:1', makeMetrics(200, 0.01));
    expect(classifier.classify('ep:1')).toBe('latency_high');

    // 2 normal samples — not enough
    classifier.push('ep:1', makeMetrics(200, 0.01));
    expect(classifier.classify('ep:1')).toBe('latency_high');

    // 3 normal samples — now exits
    classifier.push('ep:1', makeMetrics(200, 0.01));
    expect(classifier.classify('ep:1')).toBe('normal');
  });

  // ── Precedence ──

  it('error_rate_high takes precedence when both thresholds exceeded', () => {
    classifier.push('ep:1', makeMetrics(600, 0.1));
    classifier.push('ep:1', makeMetrics(700, 0.08));
    classifier.push('ep:1', makeMetrics(550, 0.06));
    expect(classifier.classify('ep:1')).toBe('error_rate_high');
  });

  // ── Per-endpoint isolation ──

  it('classifies endpoints independently', () => {
    classifier.push('ep:1', makeMetrics(600, 0.01));
    classifier.push('ep:1', makeMetrics(700, 0.01));
    classifier.push('ep:1', makeMetrics(550, 0.01));

    classifier.push('ep:2', makeMetrics(200, 0.01));
    classifier.push('ep:2', makeMetrics(200, 0.01));
    classifier.push('ep:2', makeMetrics(200, 0.01));

    expect(classifier.classify('ep:1')).toBe('latency_high');
    expect(classifier.classify('ep:2')).toBe('normal');
  });

  // ── Reset ──

  it('reset clears all state', () => {
    classifier.push('ep:1', makeMetrics(600, 0.01));
    classifier.push('ep:1', makeMetrics(700, 0.01));
    classifier.push('ep:1', makeMetrics(550, 0.01));
    expect(classifier.classify('ep:1')).toBe('latency_high');

    classifier.reset();
    expect(classifier.classify('ep:1')).toBe('unknown');
  });
});
