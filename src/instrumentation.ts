import type { Instrumentation } from "next";
import { logger } from "@/lib/logger";

// Next's global hook for uncaught errors in Route Handlers, Server
// Components, and Server Actions — covers most "app fails in production"
// cases with zero per-route changes. Purely server-side; browser runtime
// errors are reported separately (see src/lib/reportClientError.ts).
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  logger.error("Unhandled request error", {
    error,
    path: request.path,
    method: request.method,
    routeType: context.routeType,
    routePath: context.routePath,
  });
};
