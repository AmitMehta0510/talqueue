import { Router, Request, Response, NextFunction } from "express";
import swaggerUi from "swagger-ui-express";
import { generateOpenApiDocument } from "./doc";
import { env } from "shared/config/env";

const router = Router();

// Cache the generated doc — it is deterministic and expensive to re-generate
let cachedDoc: ReturnType<typeof generateOpenApiDocument> | null = null;
const getDoc = () => {
  if (!cachedDoc) cachedDoc = generateOpenApiDocument();
  return cachedDoc;
};

// Optional basic-auth gate for production docs
const DOCS_PASSWORD = env.DOCS_PASSWORD;

function checkDocsAuth(req: Request, res: Response): boolean {
  if (!DOCS_PASSWORD || env.NODE_ENV !== "production") return true;

  const auth = req.headers.authorization;
  if (!auth?.startsWith("Basic ")) {
    res.set("WWW-Authenticate", "Basic realm=\"API Docs\"");
    res.status(401).json({ message: "Docs require authentication in production" });
    return false;
  }

  const [, encoded] = auth.split(" ");
  const [, password] = Buffer.from(encoded, "base64").toString().split(":");
  if (password !== DOCS_PASSWORD) {
    res.status(401).json({ message: "Invalid docs password" });
    return false;
  }

  return true;
}

// Raw JSON spec (useful for Postman import or client SDK generation)
router.get("/docs.json", (req: Request, res: Response) => {
  if (!checkDocsAuth(req, res)) return;
  res.json(getDoc());
});

// Swagger UI
router.use(
  "/docs",
  (req: Request, res: Response, next: NextFunction) => {
    if (!checkDocsAuth(req, res)) return;
    next();
  },
  swaggerUi.serve,
  (_req: Request, _res: Response, next: NextFunction) => {
    // @ts-ignore — dynamically setup the UI with the live doc
    swaggerUi.setup(getDoc(), {
      customSiteTitle: "Engineers Platform API",
      swaggerOptions: { persistAuthorization: true },
    })(_req, _res, next);
  },
);

export default router;
