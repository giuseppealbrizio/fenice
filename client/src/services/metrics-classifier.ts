/**
 * M2B Metrics Classifier with anti-flap.
 * Classifies endpoint metrics into: normal | latency_high | error_rate_high | unknown.
 * Anti-flap: requires N consecutive samples above/below threshold to change state.
 */

import type { EndpointMetrics } from '../types/world-delta';
import type { MetricsClassifierConfig, MetricsState } from '../types/semantic';
import { DEFAULT_METRICS_CONFIG } from '../types/semantic';

interface EndpointBuffer {
  samples: EndpointMetrics[];
  currentState: MetricsState;
}

export class MetricsClassifier {
  private readonly config: MetricsClassifierConfig;
  private readonly buffers = new Map<string, EndpointBuffer>();

  constructor(config: MetricsClassifierConfig = DEFAULT_METRICS_CONFIG) {
    this.config = config;
  }

  push(entityId: string, metrics: EndpointMetrics): void {
    let buffer = this.buffers.get(entityId);
    if (!buffer) {
      buffer = { samples: [], currentState: 'unknown' };
      this.buffers.set(entityId, buffer);
    }

    buffer.samples.push(metrics);
    // Keep only last N samples (antiFlap window)
    if (buffer.samples.length > this.config.antiFlap) {
      buffer.samples.shift();
    }

    // Recompute state if we have enough samples
    if (buffer.samples.length >= this.config.antiFlap) {
      buffer.currentState = this.computeState(buffer);
    }
  }

  classify(entityId: string): MetricsState {
    const buffer = this.buffers.get(entityId);
    if (!buffer) return 'unknown';
    return buffer.currentState;
  }

  remove(entityId: string): void {
    this.buffers.delete(entityId);
  }

  reset(): void {
    this.buffers.clear();
  }

  private computeState(buffer: EndpointBuffer): MetricsState {
    const { latencyThresholdMs, errorRateThreshold, antiFlap } = this.config;
    const recent = buffer.samples.slice(-antiFlap);

    const allLatencyHigh = recent.every((m) => m.p95 > latencyThresholdMs);
    const allErrorRateHigh = recent.every((m) => m.errorRate > errorRateThreshold);
    const allLatencyNormal = recent.every((m) => m.p95 <= latencyThresholdMs);
    const allErrorRateNormal = recent.every((m) => m.errorRate <= errorRateThreshold);

    // Precedence: error_rate_high > latency_high
    if (allErrorRateHigh) return 'error_rate_high';
    if (allLatencyHigh && allErrorRateNormal) return 'latency_high';

    // Anti-flap exit: only return to normal if ALL recent are normal
    if (allLatencyNormal && allErrorRateNormal) return 'normal';

    // Otherwise hold current state (anti-flap: don't flip on mixed signals)
    return buffer.currentState === 'unknown' ? 'normal' : buffer.currentState;
  }
}
