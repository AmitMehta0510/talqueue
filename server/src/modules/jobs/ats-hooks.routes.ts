import { Router } from "express";
import {
  greenhouseWebhookHandler,
  leverWebhookHandler,
} from "./ats-hooks.controller";

const router = Router();

// Mount public webhook hooks
router.post("/greenhouse/:companyId", greenhouseWebhookHandler);
router.post("/lever/:companyId", leverWebhookHandler);

export default router;
