import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertFromDiscord(data: {
    discordId: string;
    username: string;
    discriminator?: string;
    avatar?: string;
    email?: string;
  }) {
    return this.prisma.user.upsert({
      where: { discordId: data.discordId },
      update: {
        username: data.username,
        discriminator: data.discriminator,
        avatar: data.avatar,
        email: data.email,
      },
      create: data,
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findAll() {
    return this.prisma.user.findMany({ orderBy: { username: 'asc' } });
  }
}
