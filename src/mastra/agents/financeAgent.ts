import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

export const financeAgent = new Agent({
  name: "Finance Bot",
  instructions: "Бот работает на чистом парсере команд без AI",
  model: openai("gpt-4o-mini"),
});
