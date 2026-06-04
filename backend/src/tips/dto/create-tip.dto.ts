import { IsString, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTipDto {
  @ApiProperty()
  @IsString()
  matchId: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  predictedHome: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  predictedAway: number;
}
