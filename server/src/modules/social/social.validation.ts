import { z } from "zod";

export const reviewConnectionSchema =
  z.object({
    status: z.enum([
      "ACCEPTED",
      "REJECTED",
    ]),
  });