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
    description: 'Get all bookmarks. if you want to move url, reference this function.',
  }),
];
