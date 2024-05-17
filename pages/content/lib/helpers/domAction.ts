import { delay } from '@chrome-extension-boilerplate/shared';

const DELAY = {
  CLICK: 300, // Set this value to control the delay between clicks
  KEYSTROKE: 100, // Set this value to control typing speed
};

async function clickEvent(element: HTMLElement) {
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await delay(DELAY.CLICK);
  element.click();
  await delay(DELAY.CLICK);
}

async function typingEvent(element: HTMLElement, text: string) {
  const initialValue = (element as HTMLTextAreaElement).value;
  element.focus();

  for (const char of text) {
    element.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
    await delay(DELAY.KEYSTROKE / 2);
    element.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
    await delay(DELAY.KEYSTROKE / 2);
  }
  if ((element as HTMLTextAreaElement).value === initialValue) {
    await delay(DELAY.KEYSTROKE);
    element.dispatchEvent(new InputEvent('input', { bubbles: true, data: text }));
    await delay(DELAY.KEYSTROKE);
  }
  if ((element as HTMLTextAreaElement).value === initialValue) {
    (element as HTMLTextAreaElement).value = text;
  }
}

async function keyPressEvent(element: HTMLElement, key: string) {
  element.focus();
  element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  await delay(DELAY.KEYSTROKE / 2);
  element.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
  await delay(DELAY.KEYSTROKE / 2);
}

export const domAction = {
  click: clickEvent,
  type: typingEvent,
  keyPress: keyPressEvent,
  //   TODO select text(double click), select all text(triple clicks), scroll, copyClipboard, etc.
};
