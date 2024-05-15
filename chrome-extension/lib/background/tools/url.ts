import { z } from 'zod';
import { zodFunction } from './zodFunction';

async function getCurrentTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs.length === 0) {
    throw new Error('No active tab found');
  }
  return tabs.at(0);
}

async function getCurrentUrlWithTitle() {
  const tab = await getCurrentTab();
  return { url: tab.url, title: tab.title };
}

const MoveCurrentTabUrlParams = z.object({
  url: z.string().url(),
});

async function moveCurrentTabUrl({ url }: z.infer<typeof MoveCurrentTabUrlParams>) {
  const tab = await getCurrentTab();
  await chrome.tabs.update(tab.id, { url });
  return { url };
}

type BookmarkNode = {
  url: string;
  title: string;
};
async function getMyBookmarks() {
  const bookmarks: chrome.bookmarks.BookmarkTreeNode[] = await chrome.bookmarks.getTree();
  // tree 순회 하면서 모든 url, title 정보 BookmarkNode 배열로 평탄화
  const flatten = (node: chrome.bookmarks.BookmarkTreeNode): BookmarkNode[] => {
    if (node.children) {
      return node.children.flatMap(flatten);
    }
    return [{ url: node.url, title: node.title }];
  };

  return bookmarks.flatMap(flatten);
}

const GetHistoryParams = z.object({
  recentDays: z.number().int().positive().max(7).optional().default(7),
  searchText: z.string().optional().default(''),
  historyType: z.enum(['Frequent', 'Recent']).default('Frequent'),
});

async function getHistory({
  recentDays = 0,
  searchText = '',
  historyType = 'Frequent',
}: z.infer<typeof GetHistoryParams>) {
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const daysAgoTime = new Date().getTime() - millisecondsPerDay * recentDays;

  const historyItems = await chrome.history.search({
    text: searchText,
    maxResults: 500,
    startTime: recentDays ? daysAgoTime : undefined,
  });

  const deduplicatedHistoryItems = historyItems.reduce<chrome.history.HistoryItem[]>((acc, item) => {
    if (!acc.some(accItem => accItem.title === item.title)) {
      acc.push(item);
    }
    return acc;
  }, []);

  switch (historyType) {
    case 'Frequent':
      // 방문 횟수가 높은 순으로 정렬 후 상위 N 개만 반환
      return [...deduplicatedHistoryItems]
        .sort((a, b) => b.visitCount - a.visitCount)
        .map(history => ({ title: history.title, url: history.url }))
        .slice(0, 20);
    case 'Recent':
      // 방문 시간이 최근 순으로 정렬 후 상위 N 개만 반환
      return [...deduplicatedHistoryItems]
        .sort((a, b) => b.lastVisitTime - a.lastVisitTime)
        .map(history => ({ title: history.title, url: history.url }))
        .slice(0, 20);
  }
}

export const urlTools = [
  zodFunction({
    function: getCurrentUrlWithTitle,
    schema: z.object({}),
    description: 'Get current tab url & title',
  }),
  zodFunction({
    function: moveCurrentTabUrl,
    schema: MoveCurrentTabUrlParams,
    description: 'Move current tab to a new url',
  }),
  zodFunction({
    function: getMyBookmarks,
    schema: z.object({}),
    description: 'Get all bookmarks.',
  }),
  zodFunction({
    function: getHistory,
    schema: GetHistoryParams,
    description: 'Get Browser history items.',
  }),
];
