import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Address } from "viem";
import { useConnection, useConfig, useDisconnect } from "wagmi";
import { useSIWE } from "../hooks/useSIWE";
import { createSiweMessage } from "viem/siwe";
import { signMessage } from "wagmi/actions";

type Session = { address: Address; chainId: number };
type AuthCtx = {
  userSession: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSigningIn: boolean;
  signInError: string | null;
  signIn: () => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthCtx | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { getNonce, verify, session, logOut } = useSIWE();
  const { address, chainId, status, isConnected } = useConnection();
  const config = useConfig();
  const disconnect = useDisconnect();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  const signIn = async () => {
    if (isSigningIn) return;
    if (!address || !chainId) {
      setSignInError("Wallet not connected");
      return;
    }
    setIsSigningIn(true);
    setSignInError(null);
    try {
      const { nonce } = await getNonce.mutateAsync();
      const message = createSiweMessage({
        address,
        chainId,
        domain: window.location.host,
        nonce,
        uri: window.location.origin,
        version: "1",
        statement: "Sign in to event indexer",
        expirationTime: new Date(Date.now() + 10 * 60 * 1000),
      });
      const signature = await signMessage(config, {
        account: address,
        message: message,
      });
      const payload = { message: message, signature: signature };
      verify.mutate(payload);
    } catch (err) {
      const e = err as { shortMessage?: string; message?: string };
      setSignInError(e.shortMessage ?? e.message ?? "Sign in failed");
    } finally {
      setIsSigningIn(false);
    }
  };

  const signOut = () => {
    logOut.mutate();
    disconnect.mutate();
  };

  const userSession = session.data ?? null;
  useEffect(() => {
    if (!userSession || logOut.isPending) return;
    if (status === "connecting" || status === "reconnecting") return; // page-load rehydration
    if (
      !isConnected ||
      address?.toLowerCase() !== userSession.address.toLowerCase()
    ) {
      signOut();
    }
  }, [userSession, status, isConnected, address, logOut.isPending]);

  const isAuthenticated =
    !!userSession &&
    isConnected &&
    address?.toLowerCase() === userSession.address.toLowerCase();

  return (
    <AuthContext.Provider
      value={{
        userSession,
        isAuthenticated,
        isLoading: session.isPending,
        isSigningIn,
        signInError,
        signIn: signIn,
        signOut: signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};
