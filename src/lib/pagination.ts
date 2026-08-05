// Shared `?page=`/`?limit=` parsing for every paginated list endpoint (see
// api-conventions.md's "{ items, total }" pagination shape) — keeps the
// clamping rules (page >= 1, 1 <= limit <= MAX_PAGE_SIZE) identical across
// every route/page that fetches a bounded slice instead of a whole table.
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

export function getPagination(
  searchParams: URLSearchParams,
  defaultLimit: number = DEFAULT_PAGE_SIZE
): PaginationParams {
  const rawPage = Number(searchParams.get("page"));
  const rawLimit = Number(searchParams.get("limit"));

  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const limit =
    Number.isFinite(rawLimit) && rawLimit >= 1
      ? Math.min(Math.floor(rawLimit), MAX_PAGE_SIZE)
      : defaultLimit;

  return { page, limit, skip: (page - 1) * limit, take: limit };
}

export interface Paginated<T> {
  items: T[];
  total: number;
}
