import { zodFunction } from '@lib/background/tools/zodFunction';
import { z } from 'zod';

const TabInfo = z.object({
  id: z.number().optional(),
  url: z.string().optional(),
  title: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  groupId: z.number(),
  windowId: z.number().optional(),
});

function convertTabToTabInfo({
  id,
  url,
  groupId,
  title,
  width,
  height,
  windowId,
}: chrome.tabs.Tab): z.infer<typeof TabInfo> {
  return { id, url, groupId, title, width, height, windowId };
}

const GetTabsInfoParams = z.object({
  filterGroupId: z.number().optional(),
});

async function getTabsInfo(params: z.infer<typeof GetTabsInfoParams>) {
  const tabs = await chrome.tabs.query({
    groupId: params.filterGroupId,
  });
  return tabs.map(convertTabToTabInfo);
}

async function getCurrentTabInfo() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs.at(0);

  if (activeTab?.id) {
    return convertTabToTabInfo(activeTab);
  } else {
    return undefined;
  }
}

const NavigateTabParams = z.object({
  action: z.enum(['goBack', 'goForward', 'move', 'reload', 'focus']),
  tabId: z.number().optional(),
  url: z.string().optional(),
});

function moveTab(url: string) {
  window.location.href = url;
}

async function navigateTab(params: z.infer<typeof NavigateTabParams>) {
  try {
    switch (params.action) {
      case 'goBack':
        await chrome.tabs.goBack();
        break;
      case 'goForward':
        await chrome.tabs.goForward();
        break;
      case 'move': {
        if (!params.url) {
          return { success: false, reason: 'url is required' };
        }
        const tab = await getCurrentTabInfo();
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab?.id ?? params.tabId },
            func: moveTab,
            args: [params.url],
          });
        } catch {
          await chrome.tabs.create({ url: params.url });
        }
        break;
      }
      case 'reload':
        await chrome.tabs.reload();
        break;
      case 'focus':
        if (!params.tabId) {
          return { success: false, reason: 'tabId is required' };
        }
        await chrome.tabs.update(params.tabId, { active: true });
        break;
    }
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, reason: (e as Error).message };
  }
}

const TabGroupParams = z.object({
  action: z.enum(['group', 'ungroup']),
  groupId: z.number().optional(),
  windowId: z.number().optional(),
  tabIds: z.array(z.number()),
});

async function tabGroup(params: z.infer<typeof TabGroupParams>) {
  try {
    switch (params.action) {
      case 'group': {
        if (params.groupId === undefined) {
          const groupId = await chrome.tabs.group({
            tabIds: params.tabIds,
            createProperties: { windowId: params.windowId },
          });
          return { success: true, groupId };
        }
        await chrome.tabs.group({ tabIds: params.tabIds, groupId: params.groupId });
        break;
      }
      case 'ungroup':
        await chrome.tabs.ungroup(params.tabIds);
        break;
    }
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, reason: (e as Error).message };
  }
}

const TabCreateOrRemoveParams = z.object({
  action: z.enum(['create', 'remove']),
  url: z.string().optional(),
  tabIds: z.array(z.number()).optional(),
});

async function tabCreateOrRemove(params: z.infer<typeof TabCreateOrRemoveParams>) {
  try {
    switch (params.action) {
      case 'create':
        await chrome.tabs.create({ url: params.url });
        break;
      case 'remove':
        if (!params.tabIds?.length) {
          return { success: false, reason: 'tabIds is required' };
        }
        await chrome.tabs.remove(params.tabIds);
        break;
    }
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, reason: (e as Error).message };
  }
}

async function GetAllTabGroups() {
  const tabGroups = await chrome.tabGroups.query({});
  return tabGroups.map(({ id, title, color, collapsed }) => {
    return { id, title, color, collapsed };
  });
}

const UpdateTabGroupParams = z.object({
  groupId: z.number(),
  title: z.string().optional(),
  color: z.enum(['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange']),
  collapsed: z.boolean().optional(),
});

async function updateTabGroup(params: z.infer<typeof UpdateTabGroupParams>) {
  try {
    await chrome.tabGroups.update(params.groupId, {
      title: params.title,
      color: params.color,
      collapsed: params.collapsed,
    });
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, reason: (e as Error).message };
  }
}

export const tabsTools = [
  zodFunction({
    name: 'getCurrentTabInfo',
    function: async () => {
      const tab = await getCurrentTabInfo();
      if (!tab) {
        return { success: false, reason: 'Tab not found' };
      }
      return tab;
    },
    schema: z.object({}),
    description: 'Get the current tab information. (like url, title, tabId, etc.)',
  }),
  zodFunction({
    function: getTabsInfo,
    schema: z.object({}),
    description: 'Get all tabs information.',
  }),
  zodFunction({
    function: navigateTab,
    schema: NavigateTabParams,
    description: 'Navigate the current tab. (goBack, goForward, move, reload, focus)',
  }),
  zodFunction({
    function: tabGroup,
    schema: TabGroupParams,
    description: 'Group or ungroup tabs.',
  }),
  zodFunction({
    function: tabCreateOrRemove,
    schema: TabCreateOrRemoveParams,
    description: 'Create or remove tabs.',
  }),
  zodFunction({
    function: GetAllTabGroups,
    schema: z.object({}),
    description: 'Get all tab groups.',
  }),
  zodFunction({
    function: updateTabGroup,
    schema: UpdateTabGroupParams,
    description: 'Update tab group.',
  }),
];
