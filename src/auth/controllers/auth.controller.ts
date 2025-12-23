import {
  BadRequestException,
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  NotAcceptableException,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  Request,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { CurrentUser } from '../decorators/current-user.decorator';
import { RegisterDto } from '../dtos/auth.dto';
import { LoginResponseDto } from '../dtos/login-response.dto';
import { UpdatePasswordDto } from '../dtos/update-password.dto';
import { JwtAuthGuard } from '../jwt/guard';
import { JwImplem } from '../jwt/jwt.strategy';
import { Auth } from '../models/auth.model';
import { AuthService } from '../services/auth.service';
import { EmailService } from '../services/emails.service';


@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService,
    private jwImplem: JwImplem,
    private emailService: EmailService,
    private config: ConfigService) { }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const user = await this.authService.register(dto);
    if (!user.id)
      throw new NotAcceptableException('error.cannot_create_user');
    return { message: 'User registered successfully', userId: user.id };
  }

  @Post('login')
  async login(@Body() dto: RegisterDto, @Request() req) {
    const loginResponse = await this.authService.login(dto, req);
    const responseDto = new LoginResponseDto(loginResponse.access_token, loginResponse.refresh_token, loginResponse.auth)
    return responseDto.toJson()
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Request() req, @CurrentUser() user) {
    return this.authService.logout(user.id);
  }

  @Post('refresh')
  async refresh(@Body() body: { refresh_token: string }, @Req() req) {
    const loginResponse = await this.authService.refreshToken(body.refresh_token, req);
    const responseDto = new LoginResponseDto(loginResponse.access_token, loginResponse.refresh_token, loginResponse.auth)
    return responseDto.toJson()
  }

  @UseGuards(JwtAuthGuard)
  @Get('validate')
  async validateToken(@CurrentUser() auth: any) {
    let user = await this.authService.findById(auth.userId)
    return { valid: true, user: user };
  }

  @Get('check-username')
  async checkUsername(@Query('username') username: string) {
    if (!username || username.length < 3) {
      return { available: false, suggestions: [] };
    }

    const isAvailable = await this.authService.isUsernameAvailable(username);
    if (isAvailable) {
      return { available: true };
    } else {
      const suggestions = Array.from(
        { length: 3 },
        (_, i) => `${username}${Math.floor(Math.random() * 1000)}`,
      );
      return { available: false, suggestions };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('update-password')
  async updatePassword(
    @Req() req,
    @Body() body: UpdatePasswordDto,
  ): Promise<{ message: string }> {
    const { oldPassword, newPassword } = body;

    await this.authService.updatePassword(req.user.id, oldPassword, newPassword);
    return { message: 'Password updated successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('update-email-phone')
  async updatteAuth(@Req() req, @Body() body: {
    email: string,
    phone: string
  }, @CurrentUser() auth: Auth) {

    if (!auth.id) {
      throw new UnauthorizedException("errors.user_not_found")
    }
    const user = await this.authService.findById(auth.id);

    if (!user) {
      throw new UnauthorizedException("errors.user_not_found");
    }

    const { email, phone } = body;
    user.account_recuperation_email = email
    user.phone_number = phone
    return await this.authService.updateAuth(user);

  }

  @Get('send-confirm-emails/:email')
  async sendEmailWithTemplate(@Param('email') email: string) {

    let user = await this.authService.findAuthByUsernameOrEmail(email);

    if (!user) {
      throw new NotFoundException('errors.no_accound_found')
    }

    if (!user.account_recuperation_email) {
      throw new BadRequestException('errors.user_has_no_mail')
    }

    const token = await this.jwImplem.generateEmailConfirmationToken(user.id, user.account_recuperation_email)
    user.email_verification_token = token
    await this.authService.updateAuth(user)
    try {
      const baseURl = this.config.get('APP_URL') ?? 'http://localhost:3000'
      const success = await this.emailService.sendTemplatedEmail(
        user.account_recuperation_email,
        user.username,
        baseURl + '/api/v1/auth/treat-confirm-emails/' + token,
        {
          subject: "Email verification",
          companyName: this.config.get('COMPANY_NAME') ?? 'COMPANY_NAME',
          supportUrl: this.config.get('SUPPORT_URL') ?? 'SUPPORT_URL',
        }
      );

      return {
        success,
        message: success
          ? 'Validation email sent successfully'
          : 'Failed to send validation email',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error sending validation email',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('treat-confirm-emails/:token')
  async treatConfirmEmail(@Param('token') token: string, @Res() res: Response) {
    const verifiedToken = await this.jwImplem.verifyEmailConfirmationToken(token)
    if (!verifiedToken.userId) {
      return "Token expired or malformed"
    }
    let auth = await this.authService.findById(verifiedToken.userId)
    if (!auth || auth.email_verification_token !== token) {
      return 'account do not exist'
    }
    auth.email_verified = true
    auth.email_verification_token = null
    this.authService.updateAuth(auth)
    return res.redirect(this.config.get('FRONTEND_URL') ?? 'http://localhost:4200');

  }

  @Get('send-reset-password-mail/:account')
  async resetPasswordEmail(@Param('account') accountIdentifier: string) {
    if (!accountIdentifier) {
      throw new BadRequestException('errors.missing_params')
    }
    const auth = await this.authService.findAuthByUsernameOrEmail(accountIdentifier)

    if (!auth?.email_verified || !auth.account_recuperation_email) {
      throw new BadRequestException('errors.email_not_provided_for_account')
    }

    const token = await this.jwImplem.generatePasswordResetToken(auth.id, auth.account_recuperation_email)
    auth.reset_password_token = token
    this.authService.updateAuth(auth)
    try {
      const baseURl = this.config.get('FRONTEND_URL') ?? 'http://localhost:4200'
      const success = await this.emailService.sendTemplatedEmail(
        auth.account_recuperation_email,
        auth.username,
        baseURl + '/reset-password/' + token,
        {
          subject: "Password reset",
          companyName: this.config.get('COMPANY_NAME') ?? 'COMPANY_NAME',
          supportUrl: this.config.get('SUPPORT_URL') ?? 'SUPPORT_URL',
        }, 'layouts/reset-password.pug'
      );

      return {
        success,
        message: success
          ? 'Validation email sent successfully'
          : 'Failed to send validation email',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error sending validation email',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('reset-password')
  async resetPassword(@Body() params: {
    password: string,
    token: string
  }) {
    const validateToken = await this.jwImplem.verifyPasswordResetToken(params.token)
    if (!validateToken.isValid || !validateToken.userId) {
      throw new NotFoundException('errors.no_accound_found')
    }
    const user = await this.authService.findById(validateToken.userId)
    if (user?.reset_password_token !== params.token) {
      throw new NotFoundException('errors.token_expired')
    }
    const result = await this.authService.resetPassword(user.id, params.password)
    if (!result) {
      throw new InternalServerErrorException("")
    }
    return {
      message: "ok"
    }
  }
}