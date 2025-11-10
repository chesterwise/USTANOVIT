import { createStep, createWorkflow } from "../inngest";
import { z } from "zod";
import { RuntimeContext } from "@mastra/core/runtime-context";
import { parseFinanceCommand } from "../utils/commandParser";
import { financeTool } from "../tools/financeTool";
import { formatNotification, type TransactionNotification } from "../utils/notifications";

const processFinanceMessageInputSchema = z.object({
  message: z.string(),
  chatId: z.string(),
  userId: z.string().optional(),
  userName: z.string().optional(),
});

const processFinanceMessageOutputSchema = z.object({
  response: z.string(),
  success: z.boolean(),
});

const processFinanceMessage = createStep({
  id: "process-finance-message",
  inputSchema: processFinanceMessageInputSchema,
  outputSchema: processFinanceMessageOutputSchema,
  execute: async ({ inputData, mastra }) => {
    try {
      const parsedCommand = parseFinanceCommand(inputData.message);
      
      if (parsedCommand.action === 'unknown') {
        return {
          response: parsedCommand.error || "Неизвестная команда",
          success: false,
        };
      }
      
      const result = await financeTool.execute({
        context: {
          action: parsedCommand.action as any,
          chatId: inputData.chatId,
          amount: parsedCommand.amount,
          employee: parsedCommand.employee,
          note: parsedCommand.note,
          userName: inputData.userName || "Пользователь",
        },
        mastra,
        runtimeContext: new RuntimeContext(),
      });
      
      let finalResponse = result.message;
      
      if (result.success && result.notificationData?.shouldNotify) {
        const notification: TransactionNotification = {
          type: result.notificationData.type as any,
          amount: result.notificationData.amount!,
          employee: result.notificationData.employee,
          note: result.notificationData.note,
          userName: result.notificationData.userName!,
          newBalance: result.notificationData.newBalance,
        };
        
        finalResponse = formatNotification(notification);
      }
      
      return {
        response: finalResponse,
        success: result.success,
      };
    } catch (error) {
      mastra?.getLogger()?.error('❌ [FinanceWorkflow] Error', { error: String(error) });
      
      return {
        response: "Произошла ошибка при обработке команды. Попробуйте еще раз.",
        success: false,
      };
    }
  },
});

export const financeWorkflow = createWorkflow({
  id: "finance-workflow",
  inputSchema: processFinanceMessageInputSchema,
  outputSchema: processFinanceMessageOutputSchema,
})
  // @ts-expect-error
  .then(processFinanceMessage)
  .commit();
