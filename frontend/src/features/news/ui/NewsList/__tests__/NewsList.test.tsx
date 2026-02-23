import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { allSettled, fork } from "effector";
import { Provider } from "effector-react";
import { describe, it, expect, vi } from "vitest";

import { newsModel } from "@entities";
import type { NewsItem, NewsPagination } from "@shared";
import { theme } from "@shared";

import { NewsList } from "../NewsList";

vi.mock("../../NewsCard", () => ({
  NewsCard: ({ news }: { news: NewsItem }) => (
    <div data-testid="news-card">{news.title}</div>
  ),
}));

const renderWithProviders = (
  ui: React.ReactElement,
  { news = [], pagination = null }: {
    news?: NewsItem[];
    pagination?: NewsPagination | null;
  } = {},
) => {
  const scope = fork({
    values: [
      [newsModel.$news, news],
      [newsModel.$pagination, pagination],
    ],
  });

  return render(
    <Provider value={scope}>
      <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </Provider>,
  );
};

const createNewsItem = (overrides: Partial<NewsItem> = {}): NewsItem => ({
  id: "1",
  title: "Test",
  content: "Content",
  version: "1.0.0",
  publishedAt: "2024-06-15T12:00:00.000Z",
  createdAt: "2024-06-15T12:00:00.000Z",
  ...overrides,
});

describe("NewsList", () => {
  it("should show empty message when no news and not loading", () => {
    renderWithProviders(<NewsList />);

    expect(screen.getByText("Пока нет новостей")).toBeInTheDocument();
  });

  it("should render NewsCard for each news item", () => {
    const items = [
      createNewsItem({ id: "1", title: "First" }),
      createNewsItem({ id: "2", title: "Second" }),
    ];

    renderWithProviders(<NewsList />, {
      news: items,
      pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
    });

    const cards = screen.getAllByTestId("news-card");
    expect(cards).toHaveLength(2);
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });

  it("should show load more button when more pages available", () => {
    renderWithProviders(<NewsList />, {
      news: [createNewsItem()],
      pagination: { page: 1, limit: 20, total: 40, totalPages: 2 },
    });

    expect(screen.getByRole("button", { name: "Загрузить ещё" })).toBeInTheDocument();
  });

  it("should hide load more button on last page", () => {
    renderWithProviders(<NewsList />, {
      news: [createNewsItem()],
      pagination: { page: 2, limit: 20, total: 2, totalPages: 2 },
    });

    expect(screen.queryByRole("button", { name: "Загрузить ещё" })).not.toBeInTheDocument();
  });

  it("should show disabled button with loading text while loading", async () => {
    let resolveLoad: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolveLoad = resolve;
    });

    const scope = fork({
      values: [
        [newsModel.$news, [createNewsItem()]],
        [newsModel.$pagination, { page: 1, limit: 20, total: 40, totalPages: 2 }],
      ],
      handlers: [[newsModel.loadNewsFx, () => pendingPromise]],
    });

    // Trigger load to set pending state
    void allSettled(newsModel.loadNewsFx, { scope, params: 1 });

    render(
      <Provider value={scope}>
        <ThemeProvider theme={theme}>
          <NewsList />
        </ThemeProvider>
      </Provider>,
    );

    const button = screen.getByRole("button", { name: "Загрузка..." });
    expect(button).toBeDisabled();

    // Resolve to avoid hanging promise
    resolveLoad!({ news: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
  });
});
