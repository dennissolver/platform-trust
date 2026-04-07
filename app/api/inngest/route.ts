import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { runRedTeam } from "@/lib/inngest/functions/run-red-team";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [runRedTeam],
});
