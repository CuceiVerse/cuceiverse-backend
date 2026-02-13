import { IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  siiauCode: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password: string;
}
