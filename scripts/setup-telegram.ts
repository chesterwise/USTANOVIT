import "dotenv/config";

async function setupTelegramWebhook() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.error("❌ TELEGRAM_BOT_TOKEN не найден в переменных окружения!");
    console.log("\n📝 Инструкция:");
    console.log("1. Откройте https://t.me/BotFather");
    console.log("2. Создайте бота или получите токен существующего");
    console.log("3. Добавьте токен в Secrets Replit с именем TELEGRAM_BOT_TOKEN");
    process.exit(1);
  }

  // Определяем webhook URL
  let webhookUrl: string;
  
  if (process.env.REPLIT_DOMAINS) {
    const domain = process.env.REPLIT_DOMAINS.split(",")[0];
    webhookUrl = `https://${domain}/webhooks/telegram/action`;
  } else {
    const slug = process.env.REPL_SLUG || "repl";
    const owner = process.env.REPL_OWNER || "user";
    webhookUrl = `https://${slug}.${owner}.repl.co/webhooks/telegram/action`;
  }

  console.log("🔧 Настройка Telegram webhook...");
  console.log(`📍 Webhook URL: ${webhookUrl}`);
  console.log("");

  try {
    // Проверяем токен
    console.log("🔍 Проверка токена бота...");
    const meResponse = await fetch(
      `https://api.telegram.org/bot${token}/getMe`
    );
    const meData = await meResponse.json();

    if (!meData.ok) {
      console.error("❌ Неверный токен бота:", meData);
      process.exit(1);
    }

    console.log(`✅ Бот: @${meData.result.username} (${meData.result.first_name})`);
    console.log("");

    // Устанавливаем webhook
    console.log("📤 Установка webhook...");
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
      process.exit(1);
    }

    console.log("✅ Webhook успешно установлен!");
    console.log("");

    // Проверяем статус webhook
    console.log("🔍 Проверка статуса webhook...");
    const infoResponse = await fetch(
      `https://api.telegram.org/bot${token}/getWebhookInfo`
    );
    const infoData = await infoResponse.json();

    if (infoData.ok) {
      console.log("📊 Статус webhook:");
      console.log(`   URL: ${infoData.result.url}`);
      console.log(`   Pending updates: ${infoData.result.pending_update_count}`);
      if (infoData.result.last_error_date) {
        console.log(`   ⚠️  Last error: ${infoData.result.last_error_message}`);
      }
    }

    console.log("");
    console.log("✅ Готово! Теперь попробуйте написать боту в Telegram.");
    console.log("");
    console.log("💡 Доступные команды:");
    console.log("   /bank - показать баланс");
    console.log("   /bank 1000000 - установить баланс");
    console.log("   +5000 - добавить прибыль");
    console.log("   -3000 - добавить расход");
    console.log("   /statistics - показать статистику");
  } catch (error) {
    console.error("❌ Ошибка:", error);
    process.exit(1);
  }
}

setupTelegramWebhook();
