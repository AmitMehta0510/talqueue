import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { env } from "shared/config/env";

export interface AuthTokenPayload extends JwtPayload {
  userId: string;
}

const tokenOptions: SignOptions = {
  expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
};

export const generateToken = (userId: string) => {
  return jwt.sign(
    { userId },
    env.JWT_SECRET,
    tokenOptions
  );
};

export const verifyToken = (token: string): AuthTokenPayload => {
  const decoded = jwt.verify(token, env.JWT_SECRET);

  if (
    typeof decoded === "string" ||
    typeof decoded.userId !== "string"
  ) {
    throw new jwt.JsonWebTokenError("Invalid token");
  }

  return decoded as AuthTokenPayload;
};
