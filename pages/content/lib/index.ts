import { getNearbyElementByPosition } from '@lib/helpers/nearbyElement';
import { domAction } from '@lib/helpers/domAction';
import {
  cleanup,
  findInteractiveElementsDeep,
  getElementByInteractiveElementId,
} from '@lib/helpers/InteractiveElements';
import {
  ClickElementMessage,
  GetNearbyElementsMessage,
  KeyBoardPressMessage,
  PartyEffectMessage,
  TypeInputMessage,
} from '@chrome-extension-boilerplate/shared';
import { showPartyEffect } from '@lib/party';

const rpcMethods = {
  getNearbyElements: (payload: GetNearbyElementsMessage['payload']) => {
    cleanup();
    const position = { x: payload.x, y: payload.y };
    const { findNearbyElements, elementExactlyPoint } = getNearbyElementByPosition(position);
    const DISTANCE = payload.distance || 50;
    const NEAREST_ELEMENTS_COUNT = payload.maxCount || 20;

    const interactiveElements = [];
    if (elementExactlyPoint instanceof HTMLElement) {
      interactiveElements.push(...findInteractiveElementsDeep(elementExactlyPoint, position));
    }
    findNearbyElements(DISTANCE).forEach(element => {
      interactiveElements.push(...findInteractiveElementsDeep(element as HTMLElement, position));
    });

    const nearestElements = interactiveElements
      .sort((a, b) => a.distance - b.distance)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ distance: _, ...element }) => ({ ...element }))
      .slice(0, NEAREST_ELEMENTS_COUNT);

    return nearestElements;
  },
  clickElement: async ({ elementId }: ClickElementMessage['payload']) => {
    const element = getElementByInteractiveElementId(elementId);
    await domAction.click(element);
    return { success: true };
  },
  typeInput: async ({ elementId, text }: TypeInputMessage['payload']) => {
    const element = getElementByInteractiveElementId(elementId);
    await domAction.type(element, text);
    return { success: true };
  },
  keyboardPress: async ({ key, elementId }: KeyBoardPressMessage['payload']) => {
    const element = elementId ? getElementByInteractiveElementId(elementId) : (document.activeElement as HTMLElement);
    const _key = key === 'Spacebar' ? ' ' : key;
    await domAction.keyPress(element, _key);
    return { success: true };
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  partyEffect: async (_: PartyEffectMessage['payload']) => {
    try {
      showPartyEffect();
      return { success: true };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  },
};

const isRPCMethod = (method: string): method is keyof typeof rpcMethods => {
  return method in rpcMethods;
};

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (isRPCMethod(message.type)) {
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      sendResponse(await rpcMethods[message.type](message.payload));
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      sendResponse({ error: e.message });
    }
  }
});
