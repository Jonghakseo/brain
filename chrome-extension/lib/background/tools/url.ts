import { z } from 'zod';
import { zodFunction } from './zodFunction';

type BookmarkNode = {
  id: string;
  url: string;
  title: string;
  dateAdded?: number;
  parentId?: string;
  children?: BookmarkNode[];
};
async function getMyBookmarks() {
  const bookmarks: chrome.bookmarks.BookmarkTreeNode[] = await chrome.bookmarks.getTree();
  // tree 순회 하면서 모든 BookmarkNode 정보 가공해서 수집

  const travel = (node: chrome.bookmarks.BookmarkTreeNode): BookmarkNode[] => {
    const children = node.children ?? [];
    return children.map(child => ({
      id: child.id,
      url: child.url ?? '',
      title: child.title,
      dateAdded: child.dateAdded,
      parentId: node.id,
      children: travel(child),
    }));
  };

  return bookmarks.flatMap(travel);
}

const GetHistoryParams = z.object({
  recentDays: z.number().int().positive().min(1).max(30).default(7).optional(),
  sortBy: z.enum(['visitCount', 'lastVisitTime']).default('lastVisitTime').optional(),
  searchText: z.string().optional(),
});

async function getHistory({ recentDays = 7, searchText = '', sortBy }: z.infer<typeof GetHistoryParams>) {
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const daysAgoTime = Date.now() - millisecondsPerDay * recentDays;

  const historyItems = await chrome.history.search({
    text: searchText,
    maxResults: 50,
    startTime: daysAgoTime,
    endTime: Date.now(),
  });

  const deduplicatedHistoryItems = historyItems.reduce<chrome.history.HistoryItem[]>((acc, item) => {
    if (!acc.some(accItem => accItem.title === item.title)) {
      acc.push(item);
    }
    return acc;
  }, []);

  // 방문 시간이 최근 순으로 정렬 후 상위 N 개만 반환
  return [...deduplicatedHistoryItems]
    .sort((a, b) => {
      if (sortBy === 'visitCount') {
        return (b.visitCount ?? 0) - (a.visitCount ?? 0);
      }
      return (b.lastVisitTime ?? 0) - (a.lastVisitTime ?? 0);
    })
    .map(history => ({
      title: history.title,
      url: history.url,
      visitCount: history.visitCount,
      lastVisitTime: history.lastVisitTime,
    }))
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
    description: 'Get most visited urls. Not included visited count.',
  }),
];
