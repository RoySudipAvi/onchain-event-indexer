import type { Address, Hex } from "viem";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
export type SiweSession = { address: Address; chainId: number };

export const getWatchedAddress = async () => {
  const res = await fetch(`${API_BASE_URL}/watched-addresses`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Failed to fetch users");
  }
  const data = await res.json();
  return data;
};

export const watchAddress = async (payload) => {
  const res = await fetch(`${API_BASE_URL}/watch-address`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  console.log("result came: ", res);
  const response = await res.json();
  if (!res.ok) throw new Error(`Create failed: ${response.msg}`);
  return response;
};

export const deleteWatchedAddress = async (payload) => {
  const res = await fetch(
    `${API_BASE_URL}/delete-watched-address/${payload.id}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );
  const response = await res.json();
  if (!res.ok) throw new Error(`Create failed: ${response.msg}`);
  return response;
};

export type EventSortBy =
  "id" | "blockNumber" | "eventName" | "contract" | "indexedAt";
export type SortOrder = "asc" | "desc";

export const getEvents = async (
  page: number,
  limit: number,
  sortBy: EventSortBy,
  sortOrder: SortOrder,
  eventsFilter: string,
) => {
  const res = await fetch(
    `${API_BASE_URL}/feed?page=${page}&limit=${limit}&sortBy=${sortBy}&sortOrder=${sortOrder}&filters=${eventsFilter}`,
  );
  if (!res.ok) {
    throw new Error("Failed to fetch events");
  }
  const data = await res.json();
  return data;
};

export const getLoginNonce = async () => {
  const res = await fetch(`${API_BASE_URL}/siwe/getNonce`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Failed to fetch nonce");
  }
  const data = await res.json();
  return data;
};

export const verifySignature = async (payload: {
  message: string;
  signature: Hex;
}) => {
  const res = await fetch(`${API_BASE_URL}/siwe/verify`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error("Failed to verify");
  }
  const response = await res.json();
  return response;
};

export const getSession = async (): Promise<SiweSession | null> => {
  const res = await fetch(`${API_BASE_URL}/siwe/me`, {
    credentials: "include",
  });
  if (res.status === 401) return null;
  if (!res.ok) {
    throw new Error("session check failed");
  }
  const response = await res.json();
  return response;
};

export const logOutSession = async () => {
  const res = await fetch(`${API_BASE_URL}/siwe/logout`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("log out failed");
  }
  const response = await res.json();
  return response;
};
