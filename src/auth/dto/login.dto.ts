import { IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  codigo!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(72)
  nip!: string;
}
