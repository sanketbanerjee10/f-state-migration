import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createGamePerformanceTimings,
  GamePerformanceRecorder,
  resetGamePerformanceTimings,
} from '@/game/core/GamePerformanceDiagnostics';

describe('GamePerformanceRecorder', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps the spike frame timings and preceding samples', () => {
    const recorder = new GamePerformanceRecorder();
    const timings = createGamePerformanceTimings();
    recorder.recordFrame(0, 0, timings, null);
    recorder.recordFrame(16, 16, timings, null);
    expect(recorder.getSnapshot().captureDurationMs).toBe(16);
    recorder.reset();
    recorder.recordFrame(16, 16, timings, null);
    recorder.recordUiPoll(0.7, 1.4);
    recorder.recordFrame(32, 16, timings, null);
    timings.updateMs = 7.5;
    timings.projectileCollisionMs = 4;
    recorder.recordFrame(72, 40, timings, null);

    const spike = recorder.getSnapshot().spikes[0];
    expect(spike).toMatchObject({
      timestamp: 72,
      frameTimeMs: 40,
      updateMs: 7.5,
      projectileCollisionMs: 4,
      arena: 'unavailable',
      gameMode: 'unavailable',
    });
    expect(spike?.precedingFrameTimesMs).toEqual([16, 16]);
  });

  it('retains bounded frame and spike histories across frame-buffer wrap', () => {
    const recorder = new GamePerformanceRecorder();
    const timings = createGamePerformanceTimings();
    recorder.recordFrame(16, 16, timings, null);
    recorder.recordFrame(32, 16, timings, null);
    recorder.recordFrame(72, 40, timings, null);
    for (let frame = 5; frame <= 651; frame += 1) {
      recorder.recordFrame(frame * 16, 16, timings, null);
    }

    const snapshot = recorder.getSnapshot();
    expect(snapshot.frameCount).toBe(650);
    expect(snapshot.frameTimeMs).toBe(16);
    expect(snapshot.spikes.length).toBeGreaterThan(0);
    expect(snapshot.spikes[0]?.frameTimeMs).toBe(40);
    expect(snapshot.spikes[0]?.precedingFrameTimesMs).toEqual([16, 16]);
    expect(snapshot.spikes[0]?.followingFrameTimesMs).toEqual([16, 16, 16]);
  });

  it('validates thresholds and clears captured values on reset', () => {
    const recorder = new GamePerformanceRecorder();
    const timings = createGamePerformanceTimings();

    expect(() => recorder.setThresholds([33, 16.7, 50])).toThrow(RangeError);
    recorder.setThresholds([20, 40, 60]);
    recorder.recordFrame(16, 45, timings, null);
    expect(recorder.getSnapshot().framesOverThreshold2).toBe(1);

    recorder.reset();
    expect(recorder.getSnapshot()).toMatchObject({
      frameCount: 0,
      framesOverThreshold2: 0,
      uiTimings: { snapshotBuildMs: 0, pollWorkMs: 0 },
      spikes: [],
    });
  });

  it('calculates session FPS from non-zero frame intervals', () => {
    const recorder = new GamePerformanceRecorder();
    const timings = createGamePerformanceTimings();
    recorder.recordFrame(16, 0, timings, null);
    recorder.recordFrame(32, 16, timings, null);
    recorder.recordFrame(64, 32, timings, null);

    expect(recorder.getSnapshot().averageFps).toBeCloseTo(1000 / 24);
  });

  it('records event p95/max and keeps callback timing distinct from RAF gaps', () => {
    const recorder = new GamePerformanceRecorder();
    const timings = createGamePerformanceTimings();
    for (let frame = 1; frame <= 20; frame += 1) {
      resetGamePerformanceTimings(timings);
      timings.updateMs = frame;
      timings.rafSchedulingGapMs = frame === 20 ? 80 : 2;
      timings.events.counts.hitEvents = frame === 20 ? 4 : 1;
      timings.events.durationCounts.enemyDamage = 1;
      timings.events.totalMs.enemyDamage = frame;
      timings.events.maxMs.enemyDamage = frame;
      timings.events.samplesMs.enemyDamage.push(frame);
      recorder.recordFrame(
        frame * 16,
        frame === 20 ? 40 : 16,
        timings,
        null,
      );
    }

    const snapshot = recorder.getSnapshot();
    const enemyDamage = snapshot.eventTimings.find(
      (event) => event.name === 'enemyDamage',
    );
    const spike = snapshot.spikes[0];
    expect(enemyDamage).toMatchObject({
      sampleCount: 20,
      p95Ms: 19,
      maxMs: 20,
      totalMs: 210,
    });
    expect(snapshot.eventCountTotals.hitEvents).toBe(23);
    expect(snapshot.timingStatisticsMs.updateMs).toMatchObject({
      p95Ms: 19,
      maxMs: 20,
    });
    expect(snapshot.timingStatisticsMs.rafSchedulingGapMs).toMatchObject({
      p95Ms: 2,
      maxMs: 80,
    });
    expect(spike).toMatchObject({
      frameTimeMs: 40,
      estimatedSchedulingGapMs: 80,
      events: {
        counts: { hitEvents: 4 },
        totalMs: { enemyDamage: 20 },
        maxMs: { enemyDamage: 20 },
      },
    });
  });

  it('correlates long tasks, GC and UI polling with a spike interval', () => {
    const callbacks: PerformanceObserverCallback[] = [];
    class FakePerformanceObserver {
      static supportedEntryTypes = ['longtask', 'gc', 'paint'];

      constructor(callback: PerformanceObserverCallback) {
        callbacks.push(callback);
      }

      observe(): void {}
      disconnect(): void {}
    }
    vi.stubGlobal('PerformanceObserver', FakePerformanceObserver);

    const recorder = new GamePerformanceRecorder();
    recorder.startBrowserMonitoring();
    const longTask = Object.assign(
      { name: 'script', entryType: 'longtask', startTime: 40, duration: 60 },
      { attribution: [{ name: 'self', containerType: 'window' }] },
    ) as PerformanceEntry;
    const thresholdLongTask = Object.assign(
      { name: 'script', entryType: 'longtask', startTime: 35, duration: 50 },
    ) as PerformanceEntry;
    const gc = Object.assign(
      { name: 'MajorGC', entryType: 'gc', startTime: 60, duration: 5 },
      { detail: { kind: 2, flags: 1 } },
    ) as PerformanceEntry;
    const emit = (
      callback: PerformanceObserverCallback | undefined,
      entry: PerformanceEntry,
    ) => {
      callback?.(
        { getEntries: () => [entry] } as PerformanceObserverEntryList,
        {} as PerformanceObserver,
      );
    };
    emit(callbacks[0], thresholdLongTask);
    emit(callbacks[0], longTask);
    emit(callbacks[1], gc);

    const timings = createGamePerformanceTimings();
    recorder.recordFrame(16, 16, timings, null);
    recorder.recordUiPoll(2, 8, 42, 50);
    timings.previousCallbackDurationMs = 5;
    timings.rafSchedulingGapMs = 7;
    recorder.recordFrame(72, 56, timings, null);

    const snapshot = recorder.getSnapshot();
    const spike = snapshot.spikes[0];
    expect(snapshot.browserMetrics).toMatchObject({
      longTaskSupport: 'available',
      longTaskCount: 1,
      garbageCollectionSupport: 'available',
      garbageCollectionCount: 1,
      paintTimingSupport: 'available',
      latestRafSchedulingGapMs: 7,
    });
    expect(spike).toMatchObject({
      previousCallbackDurationMs: 5,
      estimatedSchedulingGapMs: 7,
    });
    expect(spike?.correlatedLongTasks).toHaveLength(1);
    expect(spike?.correlatedLongTasks[0]?.attribution).toEqual([
      'self:window',
    ]);
    expect(spike?.correlatedGarbageCollections).toHaveLength(1);
    expect(spike?.correlatedUiPolls).toHaveLength(1);
  });

  it('marks browser monitoring unavailable when PerformanceObserver is missing', () => {
    vi.stubGlobal('PerformanceObserver', undefined);
    const recorder = new GamePerformanceRecorder();
    recorder.startBrowserMonitoring();

    expect(recorder.getSnapshot().browserMetrics).toMatchObject({
      longTaskSupport: 'unavailable',
      garbageCollectionSupport: 'unavailable',
      paintTimingSupport: 'unavailable',
    });
  });

  it('reports support separately for each browser entry type', () => {
    class LongTaskOnlyPerformanceObserver {
      static supportedEntryTypes = ['longtask'];

      constructor(_callback: PerformanceObserverCallback) {}
      observe(): void {}
      disconnect(): void {}
    }
    vi.stubGlobal('PerformanceObserver', LongTaskOnlyPerformanceObserver);

    const recorder = new GamePerformanceRecorder();
    recorder.startBrowserMonitoring();

    expect(recorder.getSnapshot().browserMetrics).toMatchObject({
      longTaskSupport: 'available',
      garbageCollectionSupport: 'unavailable',
      paintTimingSupport: 'unavailable',
    });
  });

  it('exports bounded measurements and definitions without profile data', () => {
    vi.stubGlobal('navigator', { userAgent: 'test browser' });
    const recorder = new GamePerformanceRecorder();
    const timings = createGamePerformanceTimings();
    timings.renderMs = 2;
    recorder.recordFrame(16, 16, timings, null);
    recorder.recordUiPoll(0.7, 1.4);
    recorder.setArenaBackgroundCacheMetrics({
      generationCount: 2,
      cacheRebuildCount: 2,
    });
    const canvas = {
      width: 800,
      height: 600,
      clientWidth: 400,
      clientHeight: 300,
    } as HTMLCanvasElement;

    const report = recorder.exportReport(canvas, 2) as {
      browser: string;
      canvas: { devicePixelRatio: number };
      processingStatisticsMs: { renderMs: { currentMs: number } };
      latestUiTimingsMs: { snapshotBuildMs: number; pollWorkMs: number };
      arenaBackgroundCache: {
        generationCount: number;
        cacheRebuildCount: number;
      };
      frameHistory: unknown[];
      metricDefinitions: Record<string, string>;
      [key: string]: unknown;
    };

    expect(report.browser).toBe('test browser');
    expect(report.canvas.devicePixelRatio).toBe(2);
    expect(report.processingStatisticsMs.renderMs.currentMs).toBe(2);
    expect(report.latestUiTimingsMs).toEqual({
      snapshotBuildMs: 0.7,
      pollWorkMs: 1.4,
    });
    expect(report.arenaBackgroundCache).toEqual({
      generationCount: 2,
      cacheRebuildCount: 2,
    });
    expect(report.frameHistory).toHaveLength(1);
    expect(report.metricDefinitions).toHaveProperty('processingCoverage');
    expect(report).not.toHaveProperty('profile');
    expect(report).not.toHaveProperty('localStorage');
  });
});
