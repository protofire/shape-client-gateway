import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { VerifyAuthMessageDto } from '@/routes/auth/entities/verify-auth-message.dto';
import { IAuthRepository } from '@/domain/auth/auth.repository.interface';
import { IJwtService } from '@/domain/interfaces/jwt-api.interface';
import { Request } from 'express';
import {
  CacheService,
  ICacheService,
} from '@/datasources/cache/cache.service.interface';
import { CacheRouter } from '@/datasources/cache/cache.router';

@Injectable()
export class AuthService {
  static readonly NONCE_EXPIRATION_TTL_IN_SECONDS = 60 * 60;
  static readonly AUTH_TOKEN_TOKEN_TYPE = 'Bearer';

  constructor(
    @Inject(IAuthRepository)
    private readonly authRepository: IAuthRepository,
    @Inject(IJwtService)
    private readonly jwtService: IJwtService,
    @Inject(CacheService) private readonly cacheService: ICacheService,
  ) {}

  /**
   * Generates a unique nonce and stores it in cache for later verification
   *
   * @returns nonce - unique string to be signed
   */
  async getNonce(): Promise<{
    nonce: string;
  }> {
    const nonce = this.authRepository.generateNonce();
    const cacheDir = CacheRouter.getAuthNonceCacheDir(nonce);

    // Store nonce for reference to prevent replay attacks
    await this.cacheService.set(
      cacheDir,
      nonce,
      AuthService.NONCE_EXPIRATION_TTL_IN_SECONDS,
    );

    return {
      nonce,
    };
  }

  /**
   * Verifies the validity of a signed message and returns an access token:
   *
   * 1. Ensure the message itself has not expired.
   * 2. Ensure the nonce was generated by us/is not a replay attack.
   * 3. Verify the signature of the message.
   * 4. Return an access token if all checks pass.
   *
   * @param args.request - Express request object
   * @param args.verifyAuthMessageDto - DTO containing the message and signature to verify
   *
   * @returns accessToken - JWT access token
   * @returns tokenType - token type (Bearer) to be used in the Authorization header
   * @returns expiresIn - time in seconds until the token expires (if applicable)
   */
  async verify(args: {
    request: Request;
    verifyAuthMessageDto: VerifyAuthMessageDto;
  }): Promise<{
    accessToken: string;
    tokenType: string;
    expiresIn: number | null;
  }> {
    const { message, signature } = args.verifyAuthMessageDto;

    const hasExpired =
      !!message.expirationTime && new Date(message.expirationTime) < new Date();

    const cacheDir = CacheRouter.getAuthNonceCacheDir(
      args.verifyAuthMessageDto.message.nonce,
    );
    const isValidNonce = await (async (): Promise<boolean> => {
      // Ensure nonce was generated by us/not a replay attack
      try {
        const cache = await this.cacheService.get(cacheDir);
        return cache === message.nonce;
      } catch {
        return false;
      }
    })();

    await this.cacheService.deleteByKey(cacheDir.key);

    if (hasExpired || !isValidNonce) {
      throw new UnauthorizedException();
    }

    const isValidSignature = await this.authRepository
      .verifyMessage({
        message,
        signature,
      })
      .catch(() => false);

    if (!isValidSignature) {
      throw new UnauthorizedException();
    }

    const expiresIn = message.expirationTime
      ? this.getSecondsUntil(new Date(message.expirationTime))
      : null;
    const notBefore = message.notBefore
      ? this.getSecondsUntil(new Date(message.notBefore))
      : null;

    return {
      accessToken: this.jwtService.sign(message, {
        ...(expiresIn && { expiresIn }),
        ...(notBefore && { notBefore }),
      }),
      tokenType: AuthService.AUTH_TOKEN_TOKEN_TYPE,
      expiresIn,
    };
  }

  private getSecondsUntil(date: Date): number {
    return Math.floor((date.getTime() - Date.now()) / 1000);
  }
}
