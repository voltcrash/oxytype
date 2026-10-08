import { describe, it, expect } from "vite-plus/test";
import { createTestTimer, TimerTick } from "../src/timer";

describe("timer grid", () => {
  it("reschedules early firings and catches up without shifting the grid", () => {
    const ticks: TimerTick[] = [];
    const clock = createTestTimer({ onTick: (tick) => ticks.push(tick) });
    clock.start(100);
    expect(clock.advance(1099)).toBe(1);
    expect(ticks).toEqual([]);
    expect(clock.advance(3350)).toBe(750);
    expect(ticks).toEqual([
      { now: 3350, timer: 1, catchup: true },
      { now: 3350, timer: 2, catchup: true },
      { now: 3350, timer: 3, drift: 2250 },
    ]);
    expect(clock.advance(4100)).toBe(1000);
    expect(ticks.at(-1)).toEqual({ now: 4100, timer: 4, drift: 0 });
  });

  it("stops during catch-up without an extra tick", () => {
    const ticks: number[] = [];
    const clock = createTestTimer({
      onTick: (tick) => {
        ticks.push(tick.timer);
        if (tick.timer === 2) clock.stop();
      },
    });
    clock.start(0);
    expect(clock.advance(5500)).toBeNull();
    expect(ticks).toEqual([1, 2]);
    expect(clock.advance(6500)).toBeNull();
    clock.start(7000);
    clock.advance(8000);
    expect(ticks).toEqual([1, 2, 1]);
  });
});
