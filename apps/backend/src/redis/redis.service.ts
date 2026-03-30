import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;
  private cacheClient: Redis;
  private lockClient: Redis;
  private queueClient: Redis;
  private isConnected = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 3;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (!redisUrl) {
      this.logger.warn('⚠️  REDIS_URL not configured. Redis features will be disabled.');
      return;
    }

    try {
      // Main Redis client
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        retryStrategy: (times) => this.retryStrategy(times),
      });

      // Separate clients for different purposes (using different logical databases)
      this.cacheClient = new Redis(redisUrl, {
        db: 0, // Database 0 for caching
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => this.retryStrategy(times),
      });

      this.lockClient = new Redis(redisUrl, {
        db: 1, // Database 1 for distributed locks
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => this.retryStrategy(times),
      });

      this.queueClient = new Redis(redisUrl, {
        db: 2, // Database 2 for job queues
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => this.retryStrategy(times),
      });

      // Event handlers
      this.setupEventHandlers(this.client, 'Main');
      this.setupEventHandlers(this.cacheClient, 'Cache');
      this.setupEventHandlers(this.lockClient, 'Lock');
      this.setupEventHandlers(this.queueClient, 'Queue');

      // Wait for connection
      await this.client.ping();
      this.isConnected = true;
      this.logger.log('✅ Redis connected successfully');
    } catch (error) {
      this.logger.error('❌ Failed to connect to Redis', error);
      this.isConnected = false;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
    if (this.cacheClient) {
      await this.cacheClient.quit();
    }
    if (this.lockClient) {
      await this.lockClient.quit();
    }
    if (this.queueClient) {
      await this.queueClient.quit();
    }
    this.logger.log('Redis disconnected');
  }

  /**
   * Retry strategy with exponential backoff
   */
  private retryStrategy(times: number): number | null {
    if (times > this.maxReconnectAttempts) {
      this.logger.error(`Max reconnection attempts (${this.maxReconnectAttempts}) reached`);
      return null;
    }

    const delay = Math.min(times * 1000, 3000); // Max 3 seconds
    this.logger.warn(`Reconnecting to Redis in ${delay}ms (attempt ${times})`);
    return delay;
  }

  /**
   * Setup event handlers for Redis client
   */
  private setupEventHandlers(client: Redis, name: string) {
    client.on('connect', () => {
      this.logger.log(`${name} Redis client connecting...`);
    });

    client.on('ready', () => {
      this.logger.log(`${name} Redis client ready`);
      this.reconnectAttempts = 0;
    });

    client.on('error', (error) => {
      this.logger.error(`${name} Redis error:`, error.message);
    });

    client.on('close', () => {
      this.logger.warn(`${name} Redis connection closed`);
      this.isConnected = false;
    });

    client.on('reconnecting', () => {
      this.reconnectAttempts++;
      this.logger.warn(`${name} Redis reconnecting (attempt ${this.reconnectAttempts})...`);
    });
  }

  /**
   * Get main Redis client
   */
  getClient(): Redis | null {
    if (!this.isConnected) {
      this.logger.warn('Redis is not connected. Returning null.');
      return null;
    }
    return this.client;
  }

  /**
   * Get cache-specific Redis client
   */
  getCacheClient(): Redis | null {
    if (!this.isConnected) {
      this.logger.warn('Redis is not connected. Returning null.');
      return null;
    }
    return this.cacheClient;
  }

  /**
   * Get lock-specific Redis client
   */
  getLockClient(): Redis | null {
    if (!this.isConnected) {
      this.logger.warn('Redis is not connected. Returning null.');
      return null;
    }
    return this.lockClient;
  }

  /**
   * Get queue-specific Redis client
   */
  getQueueClient(): Redis | null {
    if (!this.isConnected) {
      this.logger.warn('Redis is not connected. Returning null.');
      return null;
    }
    return this.queueClient;
  }

  /**
   * Check if Redis is connected
   */
  isRedisConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; message?: string }> {
    if (!this.isConnected) {
      return { status: 'unhealthy', message: 'Redis not connected' };
    }

    try {
      await this.client.ping();
      return { status: 'healthy' };
    } catch (error) {
      return { status: 'unhealthy', message: error.message };
    }
  }
}
