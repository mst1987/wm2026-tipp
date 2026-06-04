import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, GatewayIntentBits, TextChannel } from 'discord.js';

@Injectable()
export class DiscordBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DiscordBotService.name);
  private readonly client: Client;

  constructor(private readonly config: ConfigService) {
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
    });
  }

  async onModuleInit() {
    const token = this.config.get<string>('DISCORD_BOT_TOKEN');
    if (!token || token === 'your_discord_bot_token') {
      this.logger.warn('Discord bot token not configured, skipping login');
      return;
    }
    this.client.once('ready', () => {
      this.logger.log(`Discord bot ready: ${this.client.user?.tag}`);
    });
    await this.client.login(token).catch((err) => {
      this.logger.error('Discord bot login failed', err.message);
    });
  }

  async onModuleDestroy() {
    this.client.destroy();
  }

  async sendMessage(channelId: string, message: string) {
    try {
      const channel = await this.client.channels.fetch(channelId);
      if (channel instanceof TextChannel) {
        await channel.send(message);
      }
    } catch (err: any) {
      this.logger.error(`Failed to send message to channel ${channelId}`, err.message);
    }
  }
}
