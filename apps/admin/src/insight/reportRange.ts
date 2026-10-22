import { useSearchParams } from 'react-router';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The report dates from the URL (`?from=&to=`). Both empty means the API's default, the current leave
 * period; a half-given or malformed range is ignored.
 */
export function useReportRange() {
  const [search, setSearch] = useSearchParams();
  const from = search.get('from');
  const to = search.get('to');
  const valid = Boolean(from && to && DATE.test(from) && DATE.test(to) && from <= to);
  return {
    from: valid ? from! : undefined,
    to: valid ? to! : undefined,
    setRange: (range: [string | null, string | null]) =>
      setSearch(
        (current) => {
          const next = new URLSearchParams(current);
          next.delete('page');
          if (range[0] && range[1]) {
            next.set('from', range[0]);
            next.set('to', range[1]);
          } else if (!range[0] && !range[1]) {
            next.delete('from');
            next.delete('to');
          }
          return next;
        },
        { replace: true },
      ),
  };
}

/** Filters kept in the URL next to the dates, so an export can use exactly what is on screen. */
export function useReportFilter(name: string): [string | undefined, (value: string | null) => void] {
  const [search, setSearch] = useSearchParams();
  return [
    search.get(name) ?? undefined,
    (value) =>
      setSearch(
        (current) => {
          const next = new URLSearchParams(current);
          next.delete('page');
          if (value) next.set(name, value);
          else next.delete(name);
          return next;
        },
        { replace: true },
      ),
  ];
}
