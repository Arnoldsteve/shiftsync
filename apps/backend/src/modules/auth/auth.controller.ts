import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LoginDto } from '@shiftsync/shared';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { ApiLoginDocs } from './auth.docs';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Login endpoint - public
   * Requirements: 30.1, 30.2
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiLoginDocs()
  async login(@Body() data: LoginDto) {
    return this.authService.authenticate(data);
  }
}
