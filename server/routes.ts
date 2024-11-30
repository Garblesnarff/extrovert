import type { Express } from "express";
import { db } from "../db";
import { posts } from "@db/schema";
import { eq, asc, desc, sql } from "drizzle-orm";

export function registerRoutes(app: Express) {
  // Posts Routes
  app.get('/api/posts', async (req, res) => {
    try {
      const allPosts = await db.query.posts.findMany({
        orderBy: desc(posts.createdAt),
      });
      res.json(allPosts);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch posts' });
    }
  });

  app.get('/api/posts/drafts', async (req, res) => {
    try {
      const drafts = await db.query.posts.findMany({
        where: eq(posts.isDraft, true),
        orderBy: desc(posts.createdAt),
      });
      res.json(drafts);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch drafts' });
    }
  });

  app.get('/api/posts/scheduled', async (req, res) => {
    try {
      const scheduled = await db.query.posts.findMany({
        where: eq(posts.isDraft, false),
        orderBy: [
          asc(posts.scheduledFor),
          desc(posts.createdAt)
        ],
      });
      // Filter out posts without scheduledFor and ensure proper date handling
      res.json(scheduled.filter(post => post.scheduledFor !== null));
    } catch (error) {
      console.error('Error fetching scheduled posts:', error);
      res.status(500).json({ error: 'Failed to fetch scheduled posts' });
    }
  });

  app.post('/api/posts', async (req, res) => {
    try {
      interface PostToCreate {
        content: string;
        scheduledFor: Date;
        isDraft: boolean;
        recurringPattern: string | null;
        recurringEndDate: Date | null;
        createdAt: Date;
        updatedAt: Date;
        tweetId?: string;
      }

      const twitterClient = (await import('./lib/twitter')).default;

      // If it's not a draft and not scheduled, post to Twitter immediately
      if (!req.body.isDraft && !req.body.scheduledFor) {
        try {
          const tweet = await twitterClient.postTweet(req.body.content);
          req.body.tweetId = tweet.id;
        } catch (error) {
          console.error('Failed to post to Twitter:', error);
          return res.status(500).json({ error: 'Failed to post to Twitter' });
        }
      }

      if (req.body.recurringPattern && req.body.scheduledFor && req.body.recurringEndDate) {
        // Create recurring posts
        const startDate = new Date(req.body.scheduledFor);
        const endDate = new Date(req.body.recurringEndDate);
        const postsToCreate: PostToCreate[] = [];
        let currentDate = new Date(startDate);

        while (currentDate <= endDate) {
          postsToCreate.push({
            content: req.body.content,
            scheduledFor: new Date(currentDate),
            isDraft: !!req.body.isDraft,
            recurringPattern: req.body.recurringPattern,
            recurringEndDate: new Date(endDate),
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          // Calculate next date based on pattern
          const nextDate = new Date(currentDate);
          switch (req.body.recurringPattern) {
            case 'daily':
              nextDate.setDate(nextDate.getDate() + 1);
              break;
            case 'weekly':
              nextDate.setDate(nextDate.getDate() + 7);
              break;
            case 'monthly':
              nextDate.setMonth(nextDate.getMonth() + 1);
              break;
          }
          currentDate = nextDate;
        }

        // Insert first post and get the result
        const result = await db.insert(posts).values(postsToCreate[0]).returning();

        // Insert remaining posts if any
        if (postsToCreate.length > 1) {
          await Promise.all(postsToCreate.slice(1).map(post => 
            db.insert(posts).values(post)
          ));
        }

        res.json(result[0]); // Return the first post
      } else {
        // Create single post
        const post = await db.insert(posts).values({
          content: req.body.content,
          scheduledFor: req.body.scheduledFor,
          isDraft: req.body.isDraft,
          createdAt: new Date(),
          updatedAt: new Date(),
        }).returning();
        res.json(post[0]);
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to create post' });
    }
  });

  app.put('/api/posts/:id', async (req, res) => {
    try {
      const post = await db.update(posts)
        .set({
          content: req.body.content,
          scheduledFor: req.body.scheduledFor,
          isDraft: req.body.isDraft,
          updatedAt: new Date(),
        })
        .where(eq(posts.id, parseInt(req.params.id)))
        .returning();
      res.json(post[0]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update post' });
    }
  });

  app.delete('/api/posts/:id', async (req, res) => {
    try {
      await db.delete(posts)
        .where(eq(posts.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete post' });
    }
  });

  // AI Routes
  app.get('/api/ai/providers', async (req, res) => {
    try {
      const { providers } = await import('./providers');
      const providerInfo = providers.map(provider => ({
        name: provider.name,
        models: provider.availableModels,
        isAvailable: provider.isAvailable()
      }));
      res.json(providerInfo);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch AI providers' });
    }
  });

  app.post('/api/ai/assist', async (req, res) => {
    try {
      const { prompt, provider, model } = req.body;
      const { getAIResponse } = await import('./providers');
      
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      const response = await getAIResponse(prompt, provider, model);
      res.json(response);
    } catch (error) {
      console.error('AI assist error:', error);
      res.status(500).json({ 
        error: 'Failed to get AI assistance',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // CrewAI Enhanced Draft Routes
  app.post('/api/drafts/enhance', async (req, res) => {
    try {
      const { content, enhancementType } = req.body;
      const { getAIResponse } = await import('./providers');

      let prompt = '';
      switch (enhancementType) {
        case 'engagement':
          prompt = `Enhance this tweet for better engagement while maintaining its core message: "${content}"
                   Focus on making it more engaging, adding relevant hashtags, and improving clarity.`;
          break;
        case 'research':
          prompt = `Add factual context and depth to this tweet while keeping it concise: "${content}"
                   Include relevant data points and ensure accuracy.`;
          break;
        case 'strategy':
          prompt = `Optimize this tweet for better reach and strategic impact: "${content}"
                   Consider timing, audience targeting, and current trends.`;
          break;
        default:
          prompt = `Improve this tweet while maintaining its core message: "${content}"`;
      }

      const response = await getAIResponse(prompt, 'gemini', 'gemini-pro');
      
      res.json({
        enhanced: {
          suggestedContent: response.suggestedContent,
          analysis: `Enhanced ${enhancementType} version of your tweet`
        },
        originalContent: content
      });
    } catch (error) {
      console.error('Draft enhancement error:', error);
      res.status(500).json({ 
        error: 'Failed to enhance draft',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  // Optimal Time Suggestion Route
  app.post('/api/posts/suggest-time', async (req, res) => {
    try {
      const { content } = req.body;
      const { getAIResponse } = await import('./providers');

      // Get historical engagement data from database
      // Use raw SQL to handle column name mismatch
      const historicalPosts = await db.execute(sql`
        SELECT * FROM posts 
        WHERE "scheduled_for" IS NOT NULL 
        ORDER BY "created_at" DESC 
        LIMIT 50
      `);

      // Analyze patterns in successful posts
      const prompt = `Based on this tweet content: "${content}", and considering that historically successful posts were published at these times: ${
        historicalPosts.rows.map(post => new Date(post.scheduled_for as Date).toLocaleTimeString()).join(', ')
      }, suggest the optimal posting time. Consider the content type, target audience, and engagement patterns. Return only the suggested time in 24-hour format (HH:mm).`;

      const response = await getAIResponse(prompt, 'gemini', 'gemini-1.5-pro');
      
      // Extract time from AI response and validate format
      const timeMatch = response.suggestedContent.match(/(\d{2}:\d{2})/);
      const suggestedTime = timeMatch ? timeMatch[0] : '09:00';

      res.json({ 
        suggestedTime,
        analysis: response.suggestedContent 
      });
    } catch (error) {
      console.error('Time suggestion error:', error);
      res.status(500).json({ 
        error: 'Failed to suggest optimal posting time',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  app.post('/api/ai/research', async (req, res) => {
    try {
      const { prompt, provider } = req.body;
      const { getAIResponse } = await import('./providers');
      
      if (!prompt) {
        return res.status(400).json({ error: 'Research topic is required' });
      }

      const enhancedPrompt = `Research the following topic and provide insights: ${prompt}`;
      const response = await getAIResponse(enhancedPrompt, provider);
      
      res.json({
        topics: response.hashtags,
        insights: response.suggestedContent,
        provider: response.provider
      });
    } catch (error) {
      console.error('AI research error:', error);
      res.status(500).json({ 
        error: 'Failed to research content',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Analytics Routes
  app.get('/api/analytics', async (req, res) => {
    try {
      const [postsCount, draftsCount, scheduledCount] = await Promise.all([
        db.select({ count: sql`count(*)` }).from(posts),
        db.select({ count: sql`count(*)` }).from(posts).where(eq(posts.isDraft, true)),
        db.select({ count: sql`count(*)` }).from(posts).where(eq(posts.isDraft, false))
      ]);

      const recentPosts = await db.query.posts.findMany({
        orderBy: desc(posts.createdAt),
        limit: 30,
      });

      // Calculate post frequency by day
      const postsByDay = recentPosts.reduce((acc: Record<string, number>, post) => {
        const date = new Date(post.createdAt).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      // Calculate average content length
      const averageLength = recentPosts.reduce((sum, post) => sum + post.content.length, 0) / (recentPosts.length || 1);

      // Get scheduled post distribution by hour
      const scheduledPosts = await db.query.posts.findMany({
        where: eq(posts.isDraft, false),
      });

      const scheduleByHour = scheduledPosts.reduce((acc: Record<number, number>, post) => {
        if (post.scheduledFor) {
          const hour = new Date(post.scheduledFor).getHours();
          acc[hour] = (acc[hour] || 0) + 1;
        }
        return acc;
      }, {});

      res.json({
        total: postsCount,
        drafts: draftsCount,
        scheduled: scheduledCount,
        postsByDay,
        averageContentLength: Math.round(averageLength),
        scheduleByHour,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  });
}
