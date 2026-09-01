import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getStandardErrorMessage } from "@/client/lib/error-messages";

/**
 * A side panel whose data costs money.
 *
 * Every one of these runs at least one charged DataForSEO task per keyword, so
 * none of them fetches until the user opens it, and each closes again when the
 * focused keyword changes — leaving one open would buy its task on every row
 * click. Re-opening a keyword already looked at is free: the query cache still
 * holds it.
 */
export type LazyKeywordPanel<T> = {
  data: T | null;
  open: boolean;
  setOpen: (open: boolean) => void;
  loading: boolean;
  error: string | null;
  retry: () => void;
};

export function useLazyKeywordPanel<T>({
  queryKey,
  keyword,
  fetch,
  errorMessage,
}: {
  queryKey: unknown[];
  keyword: string | null;
  fetch: (keyword: string) => Promise<T>;
  errorMessage: string;
}): LazyKeywordPanel<T> {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [keyword]);

  const query = useQuery({
    queryKey,
    queryFn: () => fetch(keyword!),
    enabled: !!keyword && open,
  });

  return {
    data: query.data ?? null,
    open,
    setOpen,
    loading: open && query.isLoading,
    error: query.isError
      ? getStandardErrorMessage(query.error, errorMessage)
      : null,
    retry: () => void query.refetch(),
  };
}
