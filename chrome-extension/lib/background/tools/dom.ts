import { zodFunction } from '@lib/background/tools/zodFunction';
import { z } from 'zod';
import {
  ClickElementMessage,
  delay,
  GetNearbyElementsMessage,
  KeyBoardPressMessage,
  TypeInputMessage,
} from '@chrome-extension-boilerplate/shared';
import { getCurrentTab } from '@lib/background/tools/getCurrentTab';

const GetInteractiveElementsNearbyPointParams = z.object({
  x: z.number(),
  y: z.number(),
  distance: z.number().int().min(20).max(150).positive(),
  maxCount: z.number().int().min(10).max(50).positive(),
});

async function getInteractiveElementsNearbyPoint(params: z.infer<typeof GetInteractiveElementsNearbyPointParams>) {
  const tab = await getCurrentTab();

  async function call() {
    if (!tab?.id) {
      throw new Error('Tab not found');
    }
    return await chrome.tabs.sendMessage(tab.id, {
      type: 'getNearbyElements',
      payload: params,
    } as GetNearbyElementsMessage);
  }

  try {
    return await call();
  } catch (e) {
    await chrome.tabs.reload();
    await delay(1500);
    return await call();
  }
}

const ClickElementParams = z.object({
  elementId: z.number().int(),
});

async function clickElement(params: z.infer<typeof ClickElementParams>) {
  const tab = await getCurrentTab();

  async function call() {
    if (!tab?.id) {
      throw new Error('Tab not found');
    }
    return chrome.tabs.sendMessage(tab.id, {
      type: 'clickElement',
      payload: params,
    } as ClickElementMessage);
  }

  try {
    return await call();
  } catch (e) {
    await chrome.tabs.reload();
    await delay(1500);
    return await call();
  }
}

const TypeInputParams = z.object({
  elementId: z.number().int().positive(),
  text: z.string(),
});

async function typeInput(params: z.infer<typeof TypeInputParams>) {
  const tab = await getCurrentTab();

  async function call() {
    if (!tab?.id) {
      throw new Error('Tab not found');
    }
    return await chrome.tabs.sendMessage(tab.id, {
      type: 'typeInput',
      payload: params,
    } as TypeInputMessage);
  }

  try {
    return await call();
  } catch (e) {
    await chrome.tabs.reload();
    await delay(1500);
    return await call();
  }
}

const KeyboardPressParams = z.object({
  key: z.enum(['Enter', 'Backspace', 'Spacebar']),
  elementId: z.number().int().optional(),
});

async function keyboardPress(params: z.infer<typeof KeyboardPressParams>) {
  const tab = await getCurrentTab();

  async function call() {
    if (!tab?.id) {
      throw new Error('Tab not found');
    }
    return await chrome.tabs.sendMessage(tab.id, {
      type: 'keyboardPress',
      payload: params,
    } as KeyBoardPressMessage);
  }

  try {
    return call();
  } catch (e) {
    await chrome.tabs.reload();
    await delay(1500);
    return call();
  }
}

const ClickElementBySelectorParams = z.object({
  fullXPath: z.string().optional(),
  selector: z.string().optional(),
});

async function clickElementBySelector(params: z.infer<typeof ClickElementBySelectorParams>) {
  function clickByXPath(xPath: string) {
    const node = document.evaluate(xPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)?.singleNodeValue;
    if (node instanceof HTMLElement) {
      node.click();
    }
  }

  function clickBySelector(selector: string) {
    const nodes = document.querySelectorAll(selector);
    nodes.forEach(node => {
      if (node instanceof HTMLElement) {
        node.click();
      }
    });
  }

  if (!params.selector && !params.fullXPath) {
    return { success: false, reason: 'selector or fullXPath is required' };
  }
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs.at(0);
    if (!activeTab?.id) {
      throw new Error('Tab not found');
    }
    if (params.fullXPath) {
      await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: clickByXPath,
        args: [params.fullXPath],
      });
    }
    if (params.selector) {
      await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: clickBySelector,
        args: [params.selector],
      });
    }
    return { success: true };
  } catch (e) {
    return { success: false, reason: (e as Error).message };
  }
}

export const domTools = [
  zodFunction({
    function: clickElementBySelector,
    schema: ClickElementBySelectorParams,
    description: 'Click on interactive element by selector or Full XPath.',
  }),
  // zodFunction({
  //   function: getInteractiveElementsNearbyPoint,
  //   schema: GetInteractiveElementsNearbyPointParams,
  //   description:
  //     'You can use the approximate coordinates to get information about nearby interactable elements. This is useful before interacting with the DOM, before events such as clicks occur with the information and IDs of the elements.',
  // }),
  // zodFunction({
  //   function: clickElement,
  //   schema: ClickElementParams,
  //   description: 'Click on interactive element by id. You can click one by one.',
  // }),
  // zodFunction({
  //   function: typeInput,
  //   schema: TypeInputParams,
  //   description: 'Type text into input field by id.',
  // }),
  // zodFunction({
  //   function: keyboardPress,
  //   schema: KeyboardPressParams,
  //   description: 'Press a key on the keyboard.',
  // }),
];
