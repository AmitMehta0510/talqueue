// src/types/express.d.ts

import "express-serve-static-core";
import { JwtPayload } from "jsonwebtoken";

declare module "express-serve-static-core" {

  interface Request {

    user?: JwtPayload & {
      id: string;
      email?: string;
      username?: string;
    };
  }
}