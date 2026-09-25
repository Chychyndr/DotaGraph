export interface GraphPoint {
  x: number;
  y: number;
}

export interface VisibleViewBox {
  width: number;
  height: number;
}

export interface OverviewCamera {
  anchorX: number;
  anchorY: number;
  scale: number;
}

export interface OverviewCameraOptions extends VisibleViewBox {
  paddingX?: number;
  paddingY?: number;
  minScale?: number;
  maxScale?: number;
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

export function calculateOverviewCamera(
  points: GraphPoint[],
  {
    width,
    height,
    paddingX = 24,
    paddingY = 28,
    minScale = 0.7,
    maxScale = 1
  }: OverviewCameraOptions
): OverviewCamera {
  if (points.length === 0) {
    return {
      anchorX: width / 2,
      anchorY: height / 2,
      scale: 1
    };
  }

  const xs = points.map(point => point.x);
  const ys = points.map(point => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const usableWidth = Math.max(1, width - paddingX * 2);
  const usableHeight = Math.max(1, height - paddingY * 2);

  return {
    anchorX: (minX + maxX) / 2,
    anchorY: (minY + maxY) / 2,
    scale: clamp(
      Math.min(usableWidth / spanX, usableHeight / spanY, maxScale),
      minScale,
      maxScale
    )
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
