import { Mastra } from "@mastra/core";
import { registerApiRoute } from "../mastra/inngest";

export function registerTelegramTrigger({
  triggerType,
  handler,
}: {
  triggerType: string;
  handler: (mastra: Mastra, triggerInfo: any) => Promise<any>;
}) {
  return [
    registerApiRoute("/webhooks/telegram/action", {
      method: "POST",
      handler: async (c) => {
        const mastra = c.get("mastra");
        const payload = await c.req.json();
        
        await handler(mastra, {
          type: triggerType,
          payload,
        });
        
        return c.text("OK", 200);
      },
    }),
  ];
}
