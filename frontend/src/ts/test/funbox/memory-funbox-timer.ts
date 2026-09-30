import { getWordsWrapperElement } from "../../states/test-dom";
import {
  setMemoryTimerText,
  setMemoryTimerVisibility,
} from "../../states/funbox-timers";

let memoryTimer: number | null = null;
let memoryInterval: NodeJS.Timeout | null = null;

export function show(): void {
  setMemoryTimerVisibility("shown");
}

export function hide(): void {
  setMemoryTimerVisibility("hidden");
}

export function reset(): void {
  if (memoryInterval !== null) {
    clearInterval(memoryInterval);
    memoryInterval = null;
  }
  memoryTimer = null;
  hide();
}

export function start(time: number): void {
  reset();
  memoryTimer = time;
  update(memoryTimer);
  show();
  memoryInterval = setInterval(() => {
    if (memoryTimer === null) return;
    memoryTimer -= 1;
    memoryTimer === 0 ? hide() : update(memoryTimer);
    if (memoryTimer <= 0) {
      reset();
      getWordsWrapperElement()?.hide();
    }
  }, 1000);
}

export function update(sec: number): void {
  setMemoryTimerText(`Timer left to memorise all words: ${sec}s`);
}
