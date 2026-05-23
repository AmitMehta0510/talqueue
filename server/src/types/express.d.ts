// src/types/express.d.ts

import "express-serve-static-core";
import type { AuthenticatedUser } from "modules/auth/auth.selectors";

declare module "express-serve-static-core" {

  interface Request {

    user?: AuthenticatedUser;
  }
}
