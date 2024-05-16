export function getNearbyElementByPosition({ x, y }: { x: number; y: number }) {
  const elementExactlyPoint = document.elementFromPoint(x, y);

  const findNearbyElements = (distance: number, step = 5) => {
    const eightDirections = [
      [0, step],
      [step, 0],
      [0, -step],
      [-step, 0],
      [step, step],
      [-step, -step],
      [step, -step],
      [-step, step],
    ];
    const count = distance / step;
    const nearbyElements: Element[] = [];
    eightDirections.forEach(([stepX, stepY]) => {
      for (let i = 0; i < count; i++) {
        const element = document.elementFromPoint(x + stepX * i, y + stepY * i);
        element && nearbyElements.push(element);
      }
    });
    return nearbyElements;
  };

  return { findNearbyElements, elementExactlyPoint };
}
