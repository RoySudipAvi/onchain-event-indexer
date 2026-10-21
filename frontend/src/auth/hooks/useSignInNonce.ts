import { useQuery } from "@tanstack/react-query";
import { getLoginNonce } from "../../apis/api";

export const useSignInNonce = () => {
  return useQuery({
    queryKey: ["login-nonce"],
    queryFn: getLoginNonce,
    enabled: false,
  });
};
