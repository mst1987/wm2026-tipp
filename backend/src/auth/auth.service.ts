import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateDiscordUser(profile: any) {
    const user = await this.usersService.upsertFromDiscord({
      discordId: profile.id,
      username: profile.username,
      discriminator: profile.discriminator,
      avatar: profile.avatar,
      email: profile.email,
    });
    return user;
  }

  generateToken(user: { id: string; discordId: string; username: string }) {
    const payload = { sub: user.id, discordId: user.discordId, username: user.username };
    return this.jwtService.sign(payload);
  }

  async validateToken(payload: any) {
    return this.usersService.findById(payload.sub);
  }
}
