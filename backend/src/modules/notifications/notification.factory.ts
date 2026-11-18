import { Injectable } from '@nestjs/common';

export type NotificationChannel = 'EMAIL' | 'SMS' | 'WHATSAPP';

export interface NotificationPayload {
  recipient: string;
  subject: string;
  body: string;
}

export interface NotificationReceipt {
  channel: NotificationChannel;
  provider: string;
  recipient: string;
  status: 'SENT';
  timestamp: string;
  preview: string;
}

export interface NotificationSender {
  send(payload: NotificationPayload): NotificationReceipt;
}

export class EmailNotificationSender implements NotificationSender {
  send(payload: NotificationPayload): NotificationReceipt {
    return {
      channel: 'EMAIL',
      provider: 'SendGrid Transactional Adapter',
      recipient: payload.recipient,
      status: 'SENT',
      timestamp: new Date().toISOString(),
      preview: `[Correo] ${payload.subject}: ${payload.body}`,
    };
  }
}

export class SmsNotificationSender implements NotificationSender {
  send(payload: NotificationPayload): NotificationReceipt {
    return {
      channel: 'SMS',
      provider: 'Twilio SMS Gateway Adapter',
      recipient: payload.recipient,
      status: 'SENT',
      timestamp: new Date().toISOString(),
      preview: `[SMS] ${payload.body}`,
    };
  }
}

export class WhatsAppNotificationSender implements NotificationSender {
  send(payload: NotificationPayload): NotificationReceipt {
    return {
      channel: 'WHATSAPP',
      provider: 'WhatsApp Cloud Business Adapter',
      recipient: payload.recipient,
      status: 'SENT',
      timestamp: new Date().toISOString(),
      preview: `[WhatsApp] ${payload.body}`,
    };
  }
}

/**
 * Patrón Creacional Factory Method: instancia dinámicamente el canal de notificación
 * adecuado (Correo, SMS o WhatsApp) según la preferencia clínica del paciente.
 */
@Injectable()
export class NotificationSenderFactory {
  create(channel: NotificationChannel): NotificationSender {
    switch (channel) {
      case 'SMS':
        return new SmsNotificationSender();
      case 'WHATSAPP':
        return new WhatsAppNotificationSender();
      case 'EMAIL':
      default:
        return new EmailNotificationSender();
    }
  }
}
