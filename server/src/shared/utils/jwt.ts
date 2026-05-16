import jwt from "jsonwebtoken";
import { env } from "shared/config/env";

export const generateToken = (userId: string) => {
  return jwt.sign(
    { userId },
    env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};