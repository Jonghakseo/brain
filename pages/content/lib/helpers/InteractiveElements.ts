function isInteractive(element: HTMLElement, style: CSSStyleDeclaration): boolean {
  if (
    element.tagName === 'A' ||
    element.tagName === 'INPUT' ||
    element.tagName === 'BUTTON' ||
    element.tagName === 'SELECT' ||
    element.tagName === 'TEXTAREA' ||
    element.role === 'button'
  ) {
    return true;
  }
  if (
    element.hasAttribute('onclick') ||
    element.hasAttribute('onmousedown') ||
    element.hasAttribute('onmouseup') ||
    element.hasAttribute('onkeydown') ||
    element.hasAttribute('onkeyup')
  ) {
    return true;
  }

  return element.tagName === 'DIV' && style.cursor === 'pointer';
}

function isVisible(element: HTMLElement, style: CSSStyleDeclaration): boolean {
  if (element.offsetWidth === 0 && element.offsetHeight === 0) {
    return false;
  }
  return (
    style.opacity !== '' &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    element.getAttribute('aria-hidden') !== 'true'
  );
}

const getNearestLabel = (element: HTMLElement) => {
  let maxDepth = 5;
  let current: HTMLElement | null | undefined = element;
  while (maxDepth) {
    if (current?.tagName === 'LABEL') {
      return current;
    }
    current = current?.parentElement;
    maxDepth--;
  }
  return null;
};

type Position = {
  x: number;
  y: number;
};

type InteractiveElement = {
  id: number;
  distance: number;
} & (
  | {
      type: 'link';
      name: string;
      url: string | null;
    }
  | {
      type: 'input';
      label: string;
      placeholder: string;
    }
  | {
      type: 'button';
      text: string;
    }
);

function convertLink(element: HTMLElement) {
  return {
    type: 'link',
    name: element.ariaLabel || element.title || element.innerText || element.textContent || '',
    url: element.getAttribute('href'),
  } as const;
}

function convertInput(element: HTMLElement) {
  const nearestLabel = getNearestLabel(element);

  return {
    type: 'input',
    label:
      element.ariaLabel || nearestLabel?.textContent || element.title || element.innerText || element.textContent || '',
    placeholder: element.getAttribute('placeholder') ?? '',
  } as const;
}

function convertButton(element: HTMLElement) {
  return {
    type: 'button',
    text: element.ariaLabel || element.title || element.innerText || element.textContent || '',
  } as const;
}

let memoWeakMap = new WeakMap<HTMLElement, boolean>();

export function convertInteractiveElement(element: HTMLElement, position: Position): InteractiveElement | null {
  if (memoWeakMap.has(element)) {
    return null;
  }
  memoWeakMap.set(element, true);

  const style = window.getComputedStyle(element);
  if (element.hasAttribute('data-brain-element-id')) {
    return null;
  }
  if (!isVisible(element, style) || !isInteractive(element, style)) {
    return null;
  }
  const rect = element.getBoundingClientRect();
  const distance = Math.sqrt((rect.x - position.x) ** 2 + (rect.y - position.y) ** 2);
  element.setAttribute('data-brain-element-id', (++id).toString());

  switch (element.tagName) {
    case 'A':
      return { ...convertLink(element), distance, id };
    case 'TEXTAREA':
    case 'INPUT':
      return { ...convertInput(element), distance, id };
    case 'DIV':
    case 'BUTTON':
      return { ...convertButton(element), distance, id };
  }
  return null;
}

export function findInteractiveElementsDeep(htmlElement: HTMLElement, position: Position): InteractiveElement[] {
  const interactiveElements: InteractiveElement[] = [];

  function traverse(element: HTMLElement) {
    const interactiveElement = convertInteractiveElement(element, position);
    if (interactiveElement) {
      interactiveElements.push(interactiveElement);
    }

    element.childNodes.forEach(child => {
      if (child instanceof HTMLElement) {
        traverse(child);
      }
    });
  }

  traverse(htmlElement);
  return interactiveElements;
}

function getLinkByName() {}

function getInputByPlaceholder(placeholder: string) {}

function getByName(name: string) {}

let id = 0;
export function cleanup() {
  document.querySelectorAll('[data-brain-element-id]').forEach(element => {
    element.removeAttribute('data-brain-element-id');
  });
  id = 0;
  memoWeakMap = new WeakMap<HTMLElement, boolean>();
}

export function getElementByInteractiveElementId(id: number) {
  const element = document.querySelector('[data-brain-element-id="' + id + '"]');
  if (element instanceof HTMLElement) {
    return element;
  }
  throw new Error('Not implemented');
}
