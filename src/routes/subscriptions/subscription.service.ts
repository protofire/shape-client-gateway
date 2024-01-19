import { Inject, Injectable } from '@nestjs/common';
import { SubscriptionRepository } from '@/domain/subscriptions/subscription.repository';
import { ISubscriptionRepository } from '@/domain/subscriptions/subscription.repository.interface';

@Injectable()
export class SubscriptionService {
  constructor(
    @Inject(ISubscriptionRepository)
    private readonly repository: SubscriptionRepository,
  ) {}

  async subscribe(args: {
    chainId: string;
    safeAddress: string;
    account: string;
    categoryKey: string;
  }): Promise<void> {
    await this.repository.subscribe(args);
  }

  async unsubscribe(args: {
    categoryKey: string;
    token: string;
  }): Promise<void> {
    await this.repository.unsubscribe(args);
  }

  async unsubscribeAll(args: { token: string }): Promise<void> {
    await this.repository.unsubscribeAll(args);
  }
}
