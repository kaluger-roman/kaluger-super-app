export type NewsItem = {
  id: string;
  title: string;
  content: string;
  version: string | null;
  publishedAt: string;
  createdAt: string;
};

export type NewsPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type NewsListResponse = {
  news: NewsItem[];
  pagination: NewsPagination;
};
