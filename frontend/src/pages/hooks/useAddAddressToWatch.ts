import { useMutation, useQueryClient } from "@tanstack/react-query";
import { watchAddress } from "../../apis/api";

export const useAddAddressToWatch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: watchAddress,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["watched-addresses"] }),
    onError: (err) => {
      console.error("error here: ", err);
    },
  });
};
