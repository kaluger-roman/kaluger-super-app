import { createStore, createEvent, createEffect, sample } from "effector";
import { createGate } from "effector-react";

import type { NewsItem, NewsPagination, NewsListResponse } from "@shared";
import { newsApi } from "@shared";

// Gates
export const NewsPageGate = createGate();

// Events
export const loadNews = createEvent();
export const loadMoreNews = createEvent();
export const checkUnread = createEvent();
export const markRead = createEvent();

// Effects
export const loadNewsFx = createEffect(async (page: number) => {
  return await newsApi.getAll(page);
});

export const checkUnreadFx = createEffect(async () => {
  return await newsApi.hasUnread();
});

export const markReadFx = createEffect(async () => {
  await newsApi.markRead();
});

// Stores
export const $news = createStore<NewsItem[]>([]);
export const $pagination = createStore<NewsPagination | null>(null);
export const $isNewsLoading = loadNewsFx.pending;
export const $hasUnread = createStore<boolean>(false);

// Load first page
sample({
  clock: loadNews,
  fn: () => 1,
  target: loadNewsFx,
});

// Load next page
sample({
  clock: loadMoreNews,
  source: $pagination,
  filter: (pagination): pagination is NewsPagination =>
    pagination !== null && pagination.page < pagination.totalPages,
  fn: (pagination: NewsPagination) => pagination.page + 1,
  target: loadNewsFx,
});

// Set news on first page, append on subsequent
sample({
  clock: loadNewsFx.doneData,
  source: $news,
  fn: (existingNews, response: NewsListResponse) =>
    response.pagination.page === 1 ? response.news : [...existingNews, ...response.news],
  target: $news,
});

sample({
  clock: loadNewsFx.doneData,
  fn: (response: NewsListResponse) => response.pagination,
  target: $pagination,
});

// Unread tracking
sample({
  clock: checkUnread,
  target: checkUnreadFx,
});

sample({
  clock: checkUnreadFx.doneData,
  fn: (result) => result.hasUnread,
  target: $hasUnread,
});

sample({
  clock: markRead,
  target: markReadFx,
});

sample({
  clock: markReadFx.done,
  fn: () => false,
  target: $hasUnread,
});

// Page lifecycle
sample({
  clock: NewsPageGate.open,
  target: [loadNews, markRead],
});
