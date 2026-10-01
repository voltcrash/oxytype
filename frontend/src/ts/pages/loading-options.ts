export type LoadingOptions = {
  /**
   * Get the loading mode for this page.
   * "none" - No loading screen will be shown.
   * "sync" - A loading spinner or bar (depending on style) will be shown until the page is ready.
   * { mode: "async", beforeLoading, afterLoading } - The loadingPromise will be executed in the background and afterLoading called after it resolves.
   */
  loadingMode: () =>
    | "none"
    | "sync"
    | { mode: "async"; beforeLoading?: () => void; afterLoading?: () => void };
  /**
   * When this promise resolves, the loading screen will be hidden.
   */
  loadingPromise: () => Promise<void>;
} & (
  | {
      style: "spinner";
    }
  | {
      style: "bar";
      /**
       * Keyframes for the loading bar.
       * Each keyframe will be shown in order, with the specified percentage and duration.
       * If not provided, a loading spinner will be shown instead.
       */
      keyframes: {
        /**
         * Percentage of the loading bar to fill.
         */
        percentage: number;
        /**
         * Duration in milliseconds for the keyframe animation.
         */
        durationMs: number;
        /**
         * Text to display below the loading bar.
         */
        text?: string;
      }[];
    }
);
