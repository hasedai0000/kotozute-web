import { z } from "zod";

export const REMINDER_ENABLED_DEFAULT = false;

export const notificationsSchema = z.object({
  reminderEnabled: z.boolean({
    message: "有効／無効を指定してください",
  }),
});

export type NotificationsInput = z.infer<typeof notificationsSchema>;
export type NotificationPreferences = NotificationsInput;
