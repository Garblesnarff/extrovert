import { default as twitterClient } from './twitter';
import { db } from '../../db';
import { posts } from '../../db/schema';
import { eq, and, lte, isNull } from 'drizzle-orm';
import { logger } from './logger';

interface SchedulerConfig {
  checkInterval?: number; // milliseconds
  batchSize?: number;
}

export class PostScheduler {
  private checkInterval: number;
  private batchSize: number;
  private isRunning: boolean = false;

  constructor(config?: SchedulerConfig) {
    this.checkInterval = config?.checkInterval || 60000; // Default 1 minute
    this.batchSize = config?.batchSize || 10;
  }

  async processScheduledPosts() {
    try {
      const now = new Date();

      // Find posts that are scheduled and due
      const scheduledPosts = await db
        .select()
        .from(posts)
        .where(
          and(
            lte(posts.scheduledFor, now),
            isNull(posts.postedAt),
            eq(posts.status, 'scheduled')
          )
        )
        .limit(this.batchSize);

      for (const post of scheduledPosts) {
        try {
          // Post to Twitter
          const tweetResult = await twitterClient.postTweet(post.content);

          // Update database record
          await db
            .update(posts)
            .set({
              status: 'posted',
              postedAt: new Date(),
              tweetId: tweetResult.id
            })
            .where(eq(posts.id, post.id));

          logger.info(`Successfully posted scheduled tweet: ${post.id}`);
        } catch (error: any) {
          logger.error(`Failed to post scheduled tweet ${post.id}: ${error?.message || 'Unknown error'}`);

          // Update post status to failed
          await db
            .update(posts)
            .set({
              status: 'failed',
              error: error?.message || 'Unknown error'
            })
            .where(eq(posts.id, post.id));
        }
      }
    } catch (error: any) {
      logger.error(`Scheduler error: ${error?.message || 'Unknown error'}`);
    }
  }

  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.processScheduledPosts(); // Initial run

    setInterval(() => {
      this.processScheduledPosts();
    }, this.checkInterval);

    logger.info('Post scheduler started');
  }

  stop() {
    this.isRunning = false;
    logger.info('Post scheduler stopped');
  }
}