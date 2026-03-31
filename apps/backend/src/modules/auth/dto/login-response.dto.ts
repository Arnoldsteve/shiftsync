import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({
    example: 'clx1234567890',
    description: 'User ID',
  })
  id: string;

  @ApiProperty({
    example: 'admin@shiftsync.com',
    description: 'User email address',
  })
  email: string;

  @ApiProperty({
    example: 'John',
    description: 'User first name',
  })
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'User last name',
  })
  lastName: string;

  @ApiProperty({
    example: 'ADMIN',
    description: 'User role',
    enum: ['ADMIN', 'MANAGER', 'STAFF'],
  })
  role: string;
}

export class LoginResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token',
  })
  token: string;

  @ApiProperty({
    type: UserResponseDto,
    description: 'Authenticated user information',
  })
  user: UserResponseDto;
}
