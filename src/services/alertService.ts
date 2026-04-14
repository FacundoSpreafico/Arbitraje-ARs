import { config } from "../config.js";

export const sendTelegramAlert = async (message: string): Promise<boolean> => {
  if (!config.telegramBotToken || !config.telegramChatId) {
    return false;
  }

  const url = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: config.telegramChatId,
      text: message
    })
  });

  return response.ok;
};
