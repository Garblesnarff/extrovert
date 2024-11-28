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

  async postTweet(content: string): Promise<{ id: string; text: string }> {
    try {
      const tweet = await this.client.v2.tweet(content);
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
      
      const mediaIdsTuple = mediaIds.length === 1 
        ? [mediaIds[0]] as [string]
        : mediaIds.slice(0, 4) as [string, string?, string?, string?];

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
