import type { Request, Response, NextFunction } from "express";
import type { Address } from "viem";
import { getAddress } from "viem";

declare global {
  namespace Express {
    interface Request {
      userAddress: Address;
    }
  }
}

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const siwe = req.session.siwe;
  if (!siwe) return res.status(401).json({ msg: "Not authenticated" });
  // Normalize once, here, so every handler compares checksummed addresses
  req.userAddress = getAddress(siwe.address);
  next();
};
