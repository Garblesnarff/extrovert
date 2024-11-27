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
      if (req.body.recurringPattern && req.body.scheduledFor && req.body.recurringEndDate) {
        // Create recurring posts
        const startDate = new Date(req.body.scheduledFor);
        const endDate = new Date(req.body.recurringEndDate);
        const postsToCreate = [];
        let currentDate = new Date(startDate);

        while (currentDate <= endDate) {
          postsToCreate.push({
            content: req.body.content,
            scheduledFor: currentDate.toISOString(),
            isDraft: req.body.isDraft || false,
            recurringPattern: req.body.recurringPattern,
            recurringEndDate: endDate.toISOString(),
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

        // Insert all posts
        const result = await db.insert(posts).values(postsToCreate).returning();

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
      const { availableProviders } = await import('./providers');
      res.json(availableProviders);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch AI providers' });
    }
  });

  app.post('/api/ai/assist', async (req, res) => {
    try {
      const { prompt, provider } = req.body;
      const { getAIResponse } = await import('./providers');
      
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      const response = await getAIResponse(prompt, provider);
      res.json(response);
    } catch (error) {
      console.error('AI assist error:', error);
      res.status(500).json({ 
        error: 'Failed to get AI assistance',
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
