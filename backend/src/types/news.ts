export type NewsItemResponse = {
  id: string;
  title: string;
  content: string;
  version: string | null;
  publishedAt: string;
  createdAt: string;
};

export type NewsPaginationResponse = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
