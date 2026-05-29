type BoundingBox = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export const getBoundingBox = (
  x: number,
  y: number,
  width: number,
  height: number,
): BoundingBox => {
  const halfWidth = Math.max(0, width) / 2;
  const halfHeight = Math.max(0, height) / 2;

  return {
    left: x - halfWidth,
    right: x + halfWidth,
    top: y - halfHeight,
    bottom: y + halfHeight,
  };
};

export const isInsideBoundingBox = (x: number, y: number, box: BoundingBox): boolean => {
  return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
};
