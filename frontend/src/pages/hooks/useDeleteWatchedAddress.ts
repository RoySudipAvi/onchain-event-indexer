import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteWatchedAddress } from "../../apis/api";

export const useDeleteWatchedAddress = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteWatchedAddress,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["watched-addresses"] }),
    onError: (err) => {
      console.log("Error deleting: ", err);
    },
  });
};
