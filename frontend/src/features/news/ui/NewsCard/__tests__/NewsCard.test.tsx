import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import type { NewsItem } from "@shared";
import { theme } from "@shared";

import { NewsCard } from "../NewsCard";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

const createNewsItem = (overrides: Partial<NewsItem> = {}): NewsItem => ({
  id: "1",
  title: "Test Title",
  content: "Test content",
  version: "1.0.0",
  publishedAt: "2024-06-15T12:00:00.000Z",
  createdAt: "2024-06-15T12:00:00.000Z",
  ...overrides,
});

describe("NewsCard", () => {
  it("should render title", () => {
    renderWithTheme(<NewsCard news={createNewsItem({ title: "My Title" })} />);

    expect(screen.getByText("My Title")).toBeInTheDocument();
  });

  it("should render formatted date", () => {
    renderWithTheme(
      <NewsCard news={createNewsItem({ publishedAt: "2024-06-15T12:00:00.000Z" })} />,
    );

    expect(screen.getByText(/15/)).toBeInTheDocument();
    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });

  it("should render bold text", () => {
    renderWithTheme(
      <NewsCard news={createNewsItem({ content: "Some **bold** text" })} />,
    );

    const strong = document.querySelector("strong");
    expect(strong).toBeInTheDocument();
    expect(strong?.textContent).toBe("bold");
  });

  it("should render list items for lines starting with - ", () => {
    renderWithTheme(
      <NewsCard news={createNewsItem({ content: "- First item\n- Second item" })} />,
    );

    expect(screen.getByText("First item")).toBeInTheDocument();
    expect(screen.getByText("Second item")).toBeInTheDocument();
  });

  it("should render section titles for non-list non-empty lines", () => {
    renderWithTheme(
      <NewsCard news={createNewsItem({ content: "Section Header" })} />,
    );

    expect(screen.getByText("Section Header")).toBeInTheDocument();
  });

  it("should skip empty lines", () => {
    const { container } = renderWithTheme(
      <NewsCard news={createNewsItem({ content: "Line 1\n\nLine 2" })} />,
    );

    const contentBox = container.querySelector(".MuiBox-root");
    const children = Array.from(contentBox?.children ?? []);
    expect(children).toHaveLength(2);
  });
});
