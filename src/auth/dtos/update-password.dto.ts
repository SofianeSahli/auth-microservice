import { IsString, MinLength } from 'class-validator';

export class UpdatePasswordDto {
  @IsString()
  oldPassword: string;

  @IsString()
  @MinLength(8, { message: 'errors.password_min' })
  newPassword: string;
}