import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getLoginNonce,
  verifySignature,
  getSession,
  logOutSession,
} from "../../apis/api";

export const useSIWE = () => {
  const queryClient = useQueryClient();
  const getNonce = useMutation({ mutationFn: getLoginNonce });
  const verify = useMutation({
    mutationFn: verifySignature,
    onError: (err) => {
      console.error("error here: ", err);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["siwe-session"] }),
  });

  const session = useQuery({
    queryKey: ["siwe-session"],
    queryFn: getSession,
    staleTime: 60000,
    retry: false,
  });

  const logOut = useMutation({
    mutationFn: logOutSession,
    onSuccess: () => queryClient.setQueryData(["siwe-session"], null),
  });
  return { getNonce, verify, session, logOut };
};
