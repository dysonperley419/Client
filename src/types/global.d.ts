import type { Message } from './messages';

declare global {
  interface WindowEventMap {
    gateway_message_create: CustomEvent<Message>;
  }
}
