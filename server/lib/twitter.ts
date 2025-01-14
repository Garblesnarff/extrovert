import { TwitterApi } from 'twitter-api-v2';

class TwitterClient {
  private client: TwitterApi;

  constructor() {
    const apiKey = process.env.TWITTER_API_KEY;
    const apiSecret = process.env.TWITTER_API_SECRET;
    const accessToken = process.env.TWITTER_ACCESS_TOKEN;
    const accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;

    if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
      throw new Error('Missing Twitter API credentials');
    }

    this.client = new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
      accessToken: accessToken,
      accessSecret: accessTokenSecret,
    });
  }

  async postTweet(content: string, mediaFiles?: Buffer[]): Promise<{ id: string; text: string }> {
    try {
      if (!mediaFiles?.length) {
        const tweet = await this.client.v2.tweet(content);
        return {
          id: tweet.data.id,
          text: tweet.data.text,
        };
      }

      const mediaIds = await Promise.all(
        mediaFiles.map(file => this.uploadMedia(file, 'image/jpeg'))
      );

      const tweet = await this.client.v2.tweet(content, {
        media: { media_ids: mediaIds as [string] | [string, string] | [string, string, string] | [string, string, string, string] }
      });

      return {
        id: tweet.data.id,
        text: tweet.data.text,
      };
    } catch (error) {
      console.error('Error posting tweet:', error);
      throw new Error('Failed to post tweet');
    }
  }

  async postTweetWithMedia(content: string, mediaIds: string[]): Promise<{ id: string; text: string }> {
    try {
      // Ensure we have at least one media ID and convert to required tuple type
      if (mediaIds.length === 0) {
        throw new Error('At least one media ID is required');
      }
      
      let mediaIdsTuple: [string] | [string, string] | [string, string, string] | [string, string, string, string];
      
      switch (mediaIds.length) {
        case 1:
          mediaIdsTuple = [mediaIds[0]];
          break;
        case 2:
          mediaIdsTuple = [mediaIds[0], mediaIds[1]];
          break;
        case 3:
          mediaIdsTuple = [mediaIds[0], mediaIds[1], mediaIds[2]];
          break;
        default:
          mediaIdsTuple = [mediaIds[0], mediaIds[1], mediaIds[2], mediaIds[3]];
      }

      const tweet = await this.client.v2.tweet(content, {
        media: { media_ids: mediaIdsTuple }
      });
      
      return {
        id: tweet.data.id,
        text: tweet.data.text,
      };
    } catch (error) {
      console.error('Error posting tweet with media:', error);
      throw new Error('Failed to post tweet with media');
    }
  }

  async uploadMedia(mediaBuffer: Buffer, mimeType: string): Promise<string> {
    try {
      const mediaId = await this.client.v1.uploadMedia(mediaBuffer, { mimeType });
      return mediaId;
    } catch (error) {
      console.error('Error uploading media:', error);
      throw new Error('Failed to upload media');
    }
  }
}

// Create a singleton instance
const twitterClient = new TwitterClient();

export default twitterClient;
