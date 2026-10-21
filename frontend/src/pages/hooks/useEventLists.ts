import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getEvents } from "../../apis/api";
import type { EventSortBy, SortOrder } from "../../apis/api";

export const useEventLists = (
  page: number,
  limit: number,
  sortBy: EventSortBy,
  sortOrder: SortOrder,
  eventsFilter: string,
) => {
  return useQuery({
    queryKey: ["event-list", page, limit, sortBy, sortOrder, eventsFilter],
    queryFn: () => getEvents(page, limit, sortBy, sortOrder, eventsFilter),
    staleTime: 30000,
    placeholderData: keepPreviousData,
  });
};
