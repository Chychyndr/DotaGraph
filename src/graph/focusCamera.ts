export interface GraphPoint {
  x: number;
  y: number;
}

export interface VisibleViewBox {
  width: number;
  height: number;
}

export interface FocusScaleOptions extends VisibleViewBox {
  offsetX?: number;
  offsetY?: number;
  paddingX?: number;
  paddingY?: number;
  minScale?: number;
  maxScale?: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function visibleViewBoxForViewport(
  viewportWidth: number,
  viewportHeight: number,
  viewBoxWidth: number,
  viewBoxHeight: number,
  mode: "meet" | "slice"
): VisibleViewBox {
  if (
    viewportWidth <= 0 ||
    viewportHeight <= 0 ||
    viewBoxWidth <= 0 ||
    viewBoxHeight <= 0
  ) {
    return { width: viewBoxWidth, height: viewBoxHeight };
  }

  if (mode === "meet") {
    return { width: viewBoxWidth, height: viewBoxHeight };
  }

  const outerScale = Math.max(
    viewportWidth / viewBoxWidth,
    viewportHeight / viewBoxHeight
  );

  return {
    width: viewportWidth / outerScale,
    height: viewportHeight / outerScale
  };
}

export function calculateFocusScale(
  selected: GraphPoint,
  related: GraphPoint[],
  {
    width,
    height,
    offsetX = 0,
    offsetY = 0,
    paddingX = 84,
    paddingY = 68,
    minScale = 0.55,
    maxScale = 1.04
  }: FocusScaleOptions
): number {
  if (related.length === 0) return maxScale;

  const leftSpace = Math.max(1, width / 2 + offsetX - paddingX);
  const rightSpace = Math.max(1, width / 2 - offsetX - paddingX);
  const topSpace = Math.max(1, height / 2 + offsetY - paddingY);
  const bottomSpace = Math.max(1, height / 2 - offsetY - paddingY);

  let scale = maxScale;

  for (const point of related) {
    const dx = point.x - selected.x;
    const dy = point.y - selected.y;

    if (dx < 0) scale = Math.min(scale, leftSpace / Math.abs(dx));
    if (dx > 0) scale = Math.min(scale, rightSpace / dx);
    if (dy < 0) scale = Math.min(scale, topSpace / Math.abs(dy));
    if (dy > 0) scale = Math.min(scale, bottomSpace / dy);
  }

  return clamp(scale, minScale, maxScale);
}
