import "./App.css";
import { Routes, Route, NavLink } from "react-router";
import ConnectWallet from "./auth/components/ConnectWallet";
import UserProfile from "./auth/components/UserProfile";
import WatchedAddresses from "./pages/components/WatchedAddresses";
import PersonalFeed from "./pages/components/PersonalFeed";
import { useConnection } from "wagmi";
import { useAuth } from "./auth/components/Auth";
import SIWE from "./auth/components/SIWE";

const primaryBtn =
  "inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-indigo-500 px-3.5 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryBtn =
  "inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-1.5 text-sm font-medium text-zinc-200 transition hover:bg-zinc-700 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50";
const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
    isActive ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-100"
  }`;

function App() {
  const connection = useConnection();
  const { isAuthenticated, signIn, isLoading, signOut } = useAuth();

  if (!connection.address) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-zinc-950 p-6 text-zinc-100">
        <div className="text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-400" />
            <h1 className="text-2xl font-semibold tracking-tight">
              Event Indexer
            </h1>
          </div>
          <p className="text-sm text-zinc-400">
            Live on-chain events for the addresses you watch
          </p>
        </div>
        <ConnectWallet />
      </div>
    );
  }

  // Connected: header bar + routed content
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-400" />
              <h1 className="text-lg font-semibold tracking-tight">
                Event Indexer
              </h1>
            </div>
            {isAuthenticated && (
              <nav className="flex gap-1">
                <NavLink to="/" end className={navLinkClass}>
                  Feed
                </NavLink>
                <NavLink to="/watchlist" className={navLinkClass}>
                  Watch List
                </NavLink>
              </nav>
            )}
          </div>
          <div className="flex items-center gap-3">
            <UserProfile />
            <span className="h-6 w-px bg-zinc-800" aria-hidden="true" />
            <button type="button" onClick={signOut} className={secondaryBtn}>
              {isAuthenticated ? "Log out" : "Disconnect"}
            </button>
          </div>
        </div>
      </header>

      <main>
        {isAuthenticated ? (
          <Routes>
            <Route path="/" element={<PersonalFeed />} />
            <Route path="/watchlist" element={<WatchedAddresses />} />
          </Routes>
        ) : isLoading ? null : (
          <div className="flex justify-center p-6">
            <SIWE />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
