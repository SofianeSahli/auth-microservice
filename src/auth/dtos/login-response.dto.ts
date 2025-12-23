import { Auth } from "../models/auth.model";

export class LoginResponseDto {

    constructor(private readonly token: string, private readonly refreshToken: string, private readonly auth: Auth) { }

    toJson() {
        return {
            access_token: this.token,
            refresh_token: this.refreshToken,
            authData: {
                username: this.auth.username,
                account_recuperation_email: this.auth.account_recuperation_email,
                email_verified: this.auth.email_verified,
                use_double_auth_email: this.auth.use_double_auth_email,
                use_double_auth_sms: this.auth.use_double_auth_sms,
                phone_number: this.auth.phone_number,
                phone_verified: this.auth.phone_verified,
                use_double_auth_app: this.auth.use_double_auth_app
            }
        }
    }
}