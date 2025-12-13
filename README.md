# Authentication Microservice (auth-ms)

This is a standalone authentication microservice built with NestJS that handles user authentication, session management, and token-based security for multiple applications.

## Features

- User registration and login
- JWT-based authentication with refresh tokens
- Session management and tracking
- Password reset and update functionality
- Username availability checking
- Device tracking and session history
- Multi-factor authentication support (email, SMS, authenticator app)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update the values for your environment

3. Create the database:
   ```bash
   # Using psql
   createdb auth_ms
   ```

4. Run migrations:
   ```bash
   # After implementing migrations
   npm run migration:run
   ```

5. Start the server:
   ```bash
   # Development
   npm run start:dev

   # Production
   npm run build
   npm run start:prod
   ```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Login with username/password
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout (invalidate tokens)
- `GET /api/v1/auth/validate` - Validate current token
- `GET /api/v1/auth/check-username` - Check username availability
- `POST /api/v1/auth/update-password` - Update password (authenticated)

### Sessions
- Session tracking is automatic via interceptor
- Each login/refresh creates a new session entry
- Sessions track device, IP, and last activity

## Integration Guide

### Frontend Integration

1. Install the auth client package (when published):
   ```bash
   npm install @your-org/auth-client
   ```

2. Configure the auth module in your app:
   ```typescript
   // app.module.ts
   import { AuthModule } from '@your-org/auth-client';

   @NgModule({
     imports: [
       AuthModule.forRoot({
         apiUrl: 'http://localhost:3000/api/v1'
       })
     ]
   })
   ```

3. Use the auth service:
   ```typescript
   import { AuthService } from '@your-org/auth-client';

   export class AppComponent {
     constructor(private authService: AuthService) {}

     async login(username: string, password: string) {
       const result = await this.authService.login(username, password);
       // Handle result
     }
   }
   ```

### Backend Integration

1. Configure your backend to validate JWTs from this auth service:
   ```typescript
   // Example for NestJS
   import { JwtStrategy } from './jwt.strategy';

   @Module({
     imports: [
       JwtModule.register({
         secret: process.env.JWT_SECRET // Must match auth service
       })
     ],
     providers: [JwtStrategy]
   })
   ```

2. Use the JWT guard:
   ```typescript
   @UseGuards(JwtAuthGuard)
   @Controller('protected')
   export class ProtectedController {}
   ```

## Development

### Adding New Features

1. Create feature module:
   ```bash
   nest g module feature-name
   ```

2. Add controller and service:
   ```bash
   nest g controller feature-name
   nest g service feature-name
   ```

3. Update module imports and implement features

### Testing

```bash
# Unit tests
npm run test

# e2e tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Security Considerations

- Use HTTPS in production
- Set secure cookie options
- Configure CORS properly
- Keep JWT_SECRET secure and unique
- Implement rate limiting
- Add request validation
- Use proper password hashing
- Enable audit logging

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.