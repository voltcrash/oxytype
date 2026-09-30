import {
  AnimationSpec,
  BarController,
  BarElement,
  CartesianScaleOptions,
  CategoryScale,
  Chart,
  ChartData,
  ChartOptions,
  ChartType,
  DefaultDataPoint,
  Filler,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  ScaleChartOptions,
  ScatterController,
  TimeScale,
  TimeSeriesScale,
  Tooltip,
} from "chart.js";
import "chartjs-adapter-date-fns";
import chartAnnotation from "chartjs-plugin-annotation";
import chartTrendline from "chartjs-plugin-trendline";
import { createDeferred, JSXElement, onCleanup, onMount } from "solid-js";

import { Theme } from "../../constants/themes";
import { configEvent } from "../../events/config";
import { createEffectOn } from "../../hooks/effects";
import { useRef } from "../../hooks/useRef";
import { getTheme } from "../../states/theme";
import { cn } from "../../utils/cn";

Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  ScatterController,
  TimeScale,
  TimeSeriesScale,
  Tooltip,
  chartTrendline,
  chartAnnotation,
);

(
  Chart.defaults.animation as AnimationSpec<"line" | "bar" | "scatter">
).duration = 0;
Chart.defaults.elements.line.tension = 0.5;
Chart.defaults.elements.line.fill = "origin";

configEvent.subscribe(({ key, newValue }) => {
  if (key === "fontFamily") {
    Chart.defaults.font.family = newValue.replace(/_/g, " ");
  }
});

type ChartJSProps<
  T extends ChartType = ChartType,
  TData = DefaultDataPoint<T>,
> = {
  name: string;
  type: T;
  data: ChartData<T, TData>;
  options?: ChartOptions<T>;
  onChartInit?: (chart: Chart<T, TData>) => void;
  id?: string;
  class?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

export function ChartJs<T extends ChartType, TData = DefaultDataPoint<T>>(
  props: ChartJSProps<T, TData>,
): JSXElement {
  // Refs are assigned by SolidJS via the ref attribute
  const [canvasRef, canvasEl] = useRef<HTMLCanvasElement>();

  let chart: Chart<T, TData> | undefined;

  onMount(() => {
    const canvas = canvasEl();
    if (canvas === undefined) return;
    if (chart !== undefined) return;

    chart = new Chart(canvas, {
      type: props.type,
      data: props.data,
      options: addColorsToOptions(props.options as ChartOptions<T>, getTheme),
    });
    props.onChartInit?.(chart);
  });

  const updateChart = (data: ChartData<T, TData>): void => {
    if (!chart) return;

    chart.data = data;

    if (props.options) {
      chart.options = addColorsToOptions(props.options, getTheme);
    }

    chart.update("none");
  };

  const deferredData = createDeferred(() => props.data, { timeoutMs: 500 });

  createEffectOn(deferredData, (data) => updateChart(data), { defer: true });

  onCleanup(() => {
    chart?.destroy();
  });

  return (
    <canvas
      id={props.id}
      class={cn("chartCanvas", props.class)}
      ref={canvasRef}
      onMouseEnter={() => props.onMouseEnter?.()}
      onMouseLeave={() => props.onMouseLeave?.()}
    ></canvas>
  );
}

function addColorsToOptions<TType extends ChartType = ChartType>(
  options: ChartOptions<TType>,
  theme: () => Theme,
): ChartOptions<TType> {
  //axis colors
  const chartScaleOptions = options as ScaleChartOptions<TType>;
  Object.keys(chartScaleOptions.scales).forEach((scaleID) => {
    const axis = chartScaleOptions.scales[scaleID] as CartesianScaleOptions;
    axis.ticks = {
      ...axis.ticks,
      color: theme().sub,
    };
    axis.title = {
      ...axis.title,
      color: theme().sub,
    };
    axis.grid = {
      ...axis.grid,
      color: theme().subAlt,
      tickColor: theme().subAlt,
      borderColor: theme().subAlt,
    };
  });

  return options;
}
