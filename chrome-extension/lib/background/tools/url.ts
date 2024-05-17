import { z } from 'zod';
import { zodFunction } from './zodFunction';

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
    return [{ url: node.url ?? 'unknown', title: node.title }];
  };

  return bookmarks.flatMap(flatten);
}

const GetHistoryParams = z.object({
  recentDays: z.number().int().positive().max(7).optional(),
  searchText: z.string().optional(),
});

async function getHistory({ recentDays = 0, searchText = '' }: z.infer<typeof GetHistoryParams>) {
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

  // 방문 시간이 최근 순으로 정렬 후 상위 N 개만 반환
  return [...deduplicatedHistoryItems]
    .sort((a, b) => (b.lastVisitTime ?? 0) - (a.lastVisitTime ?? 0))
    .map(history => ({ title: history.title, url: history.url }))
    .slice(0, 20);
}

async function getMostVisitedUrls() {
  const sites = await chrome.topSites.get();
  return sites;
}

export const urlTools = [
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
  zodFunction({
    function: getMostVisitedUrls,
    schema: z.object({}),
    description: 'Get most visited urls.',
  }),
];
