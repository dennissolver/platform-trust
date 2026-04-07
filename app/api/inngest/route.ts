import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { runRedTeam } from "@/lib/inngest/functions/run-red-team";
import { runTrustScan } from "@/lib/inngest/functions/run-trust-scan";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [runRedTeam, runTrustScan],
});
