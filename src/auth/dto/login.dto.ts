import { IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  siiauCode!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password!: string;
}
