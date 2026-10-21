import { useQuery } from "@tanstack/react-query";
import { getWatchedAddress } from "../../apis/api";

export const useWatchedAddresses = () => {
  return useQuery({
    queryKey: ["watched-addresses"],
    queryFn: getWatchedAddress,
    staleTime: 15000,
  });
};
