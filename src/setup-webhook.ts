/**
 * Автоматическая настройка Telegram webhook при старте приложения
 */

export async function setupTelegramWebhook() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.warn(
      "⚠️  TELEGRAM_BOT_TOKEN не найден. Telegram бот не будет работать."
    );
    console.log("📝 Добавьте токен в Secrets Replit с именем TELEGRAM_BOT_TOKEN");
    return false;
  }

  try {
    // Определяем webhook URL
    let webhookUrl: string;

    // Приоритет: кастомный URL > Replit домен > Replit старый формат
    if (process.env.WEBHOOK_URL) {
      webhookUrl = process.env.WEBHOOK_URL;
    } else if (process.env.REPLIT_DOMAINS) {
      const domain = process.env.REPLIT_DOMAINS.split(",")[0];
      webhookUrl = `https://${domain}/webhooks/telegram/action`;
    } else {
      const slug = process.env.REPL_SLUG || "workspace";
      const owner = process.env.REPL_OWNER || "user";
      webhookUrl = `https://${slug}.${owner}.repl.co/webhooks/telegram/action`;
    }

    console.log("🔧 Настройка Telegram webhook...");
    console.log(`📍 Webhook URL: ${webhookUrl}`);

    // Проверяем текущий webhook
    const infoResponse = await fetch(
      `https://api.telegram.org/bot${token}/getWebhookInfo`
    );
    const infoData = await infoResponse.json();

    if (infoData.ok && infoData.result.url === webhookUrl) {
      console.log("✅ Webhook уже настроен правильно");
      return true;
    }

    // Устанавливаем webhook
    const setResponse = await fetch(
      `https://api.telegram.org/bot${token}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl }),
      }
    );
    const setData = await setResponse.json();

    if (!setData.ok) {
      console.error("❌ Ошибка при установке webhook:", setData);
      return false;
    }

    console.log("✅ Telegram webhook успешно настроен!");
    
    // Получаем информацию о боте
    const meResponse = await fetch(
      `https://api.telegram.org/bot${token}/getMe`
    );
    const meData = await meResponse.json();
    
    if (meData.ok) {
      console.log(`🤖 Бот: @${meData.result.username}`);
    }

    return true;
  } catch (error) {
    console.error("❌ Ошибка при настройке webhook:", error);
    return false;
  }
}
