import { allSettled, fork } from "effector";
import { describe, it, expect, vi, beforeEach } from "vitest";

import type { NewsItem, NewsListResponse } from "@shared";
import { newsApi } from "@shared";

import * as newsModel from "../news.model";

vi.mock("@shared", async () => {
  const actual = await vi.importActual("@shared");
  return {
    ...actual,
    newsApi: {
      getAll: vi.fn(),
      hasUnread: vi.fn(),
      markRead: vi.fn(),
    },
  };
});

const mockedGetAll = vi.mocked(newsApi.getAll);
const mockedHasUnread = vi.mocked(newsApi.hasUnread);
const mockedMarkRead = vi.mocked(newsApi.markRead);

const createNewsItem = (overrides: Partial<NewsItem> = {}): NewsItem => ({
  id: "1",
  title: "Test News",
  content: "Test content",
  version: "1.0.0",
  publishedAt: "2024-06-15T12:00:00.000Z",
  createdAt: "2024-06-15T12:00:00.000Z",
  ...overrides,
});

const createResponse = (
  news: NewsItem[],
  pagination: Partial<NewsListResponse["pagination"]> = {},
): NewsListResponse => ({
  news,
  pagination: {
    page: 1,
    limit: 20,
    total: news.length,
    totalPages: 1,
    ...pagination,
  },
});

describe("news.model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should trigger loadNewsFx with page 1 on loadNews", async () => {
    const item = createNewsItem();
    const response = createResponse([item]);
    mockedGetAll.mockResolvedValue(response);

    const scope = fork();
    await allSettled(newsModel.loadNews, { scope });

    expect(mockedGetAll).toHaveBeenCalledWith(1);
    expect(scope.getState(newsModel.$news)).toEqual([item]);
  });

  it("should replace $news on page 1", async () => {
    const oldItem = createNewsItem({ id: "old" });
    const newItem = createNewsItem({ id: "new" });
    const response = createResponse([newItem], { page: 1 });
    mockedGetAll.mockResolvedValue(response);

    const scope = fork({
      values: [[newsModel.$news, [oldItem]]],
    });

    await allSettled(newsModel.loadNews, { scope });

    expect(scope.getState(newsModel.$news)).toEqual([newItem]);
  });

  it("should append to $news on page > 1", async () => {
    const existingItem = createNewsItem({ id: "1" });
    const newItem = createNewsItem({ id: "2" });
    const response = createResponse([newItem], { page: 2, totalPages: 3 });
    mockedGetAll.mockResolvedValue(response);

    const scope = fork({
      values: [
        [newsModel.$news, [existingItem]],
        [newsModel.$pagination, { page: 1, limit: 20, total: 2, totalPages: 3 }],
      ],
    });

    await allSettled(newsModel.loadMoreNews, { scope });

    expect(mockedGetAll).toHaveBeenCalledWith(2);
    expect(scope.getState(newsModel.$news)).toEqual([existingItem, newItem]);
  });

  it("should not load more on last page", async () => {
    const scope = fork({
      values: [
        [newsModel.$news, [createNewsItem()]],
        [newsModel.$pagination, { page: 2, limit: 20, total: 2, totalPages: 2 }],
      ],
    });

    await allSettled(newsModel.loadMoreNews, { scope });

    expect(mockedGetAll).not.toHaveBeenCalled();
  });

  it("should not load more when pagination is null", async () => {
    const scope = fork({
      values: [[newsModel.$pagination, null]],
    });

    await allSettled(newsModel.loadMoreNews, { scope });

    expect(mockedGetAll).not.toHaveBeenCalled();
  });

  it("should update $hasUnread on checkUnread", async () => {
    mockedHasUnread.mockResolvedValue({ hasUnread: true });

    const scope = fork();
    await allSettled(newsModel.checkUnread, { scope });

    expect(scope.getState(newsModel.$hasUnread)).toBe(true);
  });

  it("should set $hasUnread to false on markRead", async () => {
    mockedMarkRead.mockResolvedValue(undefined);

    const scope = fork({
      values: [[newsModel.$hasUnread, true]],
    });

    await allSettled(newsModel.markRead, { scope });

    expect(scope.getState(newsModel.$hasUnread)).toBe(false);
  });

  it("should trigger loadNews and markRead on NewsPageGate.open", async () => {
    const item = createNewsItem();
    const response = createResponse([item]);
    mockedGetAll.mockResolvedValue(response);
    mockedMarkRead.mockResolvedValue(undefined);

    const scope = fork();
    await allSettled(newsModel.NewsPageGate.open, {
      scope,
      params: undefined as unknown as void,
    });

    expect(mockedGetAll).toHaveBeenCalledWith(1);
    expect(mockedMarkRead).toHaveBeenCalled();
  });
});
