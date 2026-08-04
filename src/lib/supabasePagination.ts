export const SUPABASE_PAGE_SIZE = 1000;
export const SUPABASE_ID_BATCH_SIZE = 75;

type PageResult<T> = {
  data: T[] | null;
  error: unknown;
};

export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + SUPABASE_PAGE_SIZE - 1);
    if (error) throw error;
    const page = data || [];
    rows.push(...page);
    if (page.length < SUPABASE_PAGE_SIZE) break;
  }
  return rows;
}

export async function fetchInBatches<T>(
  ids: string[],
  fetchPage: (idsForRequest: string[], from: number, to: number) => PromiseLike<PageResult<T>>
): Promise<T[]> {
  const rows: T[] = [];
  for (let index = 0; index < ids.length; index += SUPABASE_ID_BATCH_SIZE) {
    const idsForRequest = ids.slice(index, index + SUPABASE_ID_BATCH_SIZE);
    rows.push(...(await fetchAllPages((from, to) => fetchPage(idsForRequest, from, to))));
  }
  return rows;
}
