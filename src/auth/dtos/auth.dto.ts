import {  IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty({ message: 'errors.username_missing' })
  @Matches(/^[a-z0-9._-]+$/, {
    message: 'errors.username_invalid', 
  })
  username: string;

  @IsString()
  @MinLength(6)
  @IsNotEmpty({ message: 'errors.password_missing' })
  password: string;
}