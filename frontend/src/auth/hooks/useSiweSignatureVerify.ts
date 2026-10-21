import { useMutation } from "@tanstack/react-query";
import { verifySignature } from "../../apis/api";

export const useSiweSignatureVerify = () => {
  return useMutation({
    mutationFn: verifySignature,
    onError: (err) => {
      console.error("error here: ", err);
    },
  });
};
