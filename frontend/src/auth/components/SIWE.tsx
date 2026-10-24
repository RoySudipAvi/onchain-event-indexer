import { useAuth } from "./Auth";
const SIWE = () => {
  const { signIn, isSigningIn, signInError } = useAuth();
  return (
    <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-lg">
      <h3 className="text-lg font-semibold tracking-tight">
        Sign In With Ethereum
      </h3>
      <div className="mt-5 space-y-2">
        <button
          type="button"
          onClick={signIn}
          disabled={isSigningIn}
          className="flex w-full items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm font-medium text-zinc-100 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Sign In
        </button>
      </div>
      {signInError && (
        <p className="mt-3 break-all text-sm text-red-400">{signInError}</p>
      )}
    </div>
  );
};

export default SIWE;
