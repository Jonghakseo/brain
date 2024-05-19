import { zodFunction } from '@lib/background/tools/zodFunction';
import { z } from 'zod';

const TabInfo = z.object({
  id: z.number().optional(),
  url: z.string().optional(),
  title: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  groupId: z.number().optional(),
  lastAccessed: z.number().optional(),
});

function convertTabToTabInfo({
  id,
  url,
  groupId,
  title,
  width,
  height,
  lastAccessed,
}: chrome.tabs.Tab): z.infer<typeof TabInfo> {
  return {
    id,
    url,
    groupId: groupId === -1 ? undefined : groupId,
    title,
    width,
    height,
    lastAccessed,
  };
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

  return { tab: activeTab?.id ? convertTabToTabInfo(activeTab) : undefined };
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
        const { tab } = await getCurrentTabInfo();
        try {
          const tabId = tab?.id ?? params.tabId;
          if (!tabId) {
            throw new Error('tabId is required');
          }
          await chrome.scripting.executeScript({
            target: { tabId },
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
      default:
        throw new Error('Invalid action');
    }
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, reason: (e as Error).message };
  }
}

const TabGroupParams = z.object({
  groupId: z.number().optional(),
  tabIds: z.array(z.number()),
});

async function tabGroup(params: z.infer<typeof TabGroupParams>) {
  const { groupId, tabIds } = { ...params };
  try {
    if (groupId === undefined) {
      await chrome.tabs.group({ tabIds: [...tabIds] });
    }
    await chrome.tabs.group({ tabIds: [...tabIds], groupId });
    return { success: true };
  } catch (e) {
    console.warn("Couldn't group tabs", e);
    return { success: false, reason: (e as Error).message };
  }
}

const TabUnGroupParams = z.object({
  tabIds: z.array(z.number()),
});

async function tabUnGroup(params: z.infer<typeof TabUnGroupParams>) {
  try {
    await chrome.tabs.ungroup(params.tabIds);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, reason: (e as Error).message };
  }
}

const TabCreateOrRemoveParams = z.object({
  action: z.enum(['create', 'remove']),
  url: z.string().optional(),
  urls: z.array(z.string()).optional(),
  tabIds: z.array(z.number()).optional(),
});

async function tabCreateOrRemove(params: z.infer<typeof TabCreateOrRemoveParams>) {
  try {
    switch (params.action) {
      case 'create':
        if (params.urls && params.urls.length > 0) {
          for (const url of params.urls) {
            await chrome.tabs.create({ url });
          }
        }
        params.url && (await chrome.tabs.create({ url: params.url }));
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

async function getAllTabGroups() {
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
    function: getCurrentTabInfo,
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
    description: 'Group tabs.',
  }),
  zodFunction({
    function: tabUnGroup,
    schema: TabUnGroupParams,
    description: 'Ungroup tabs.',
  }),
  zodFunction({
    function: tabCreateOrRemove,
    schema: TabCreateOrRemoveParams,
    description: 'Create or remove tabs.',
  }),
  zodFunction({
    function: getAllTabGroups,
    schema: z.object({}),
    description: 'Get all tab groups.',
  }),
  zodFunction({
    function: updateTabGroup,
    schema: UpdateTabGroupParams,
    description: 'Update tab group.',
  }),
];
