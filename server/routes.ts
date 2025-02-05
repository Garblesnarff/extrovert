import type { Express } from "express";
import { db } from "../db";
import { posts } from "@db/schema";
import { eq, asc, desc, sql } from "drizzle-orm";
import { spawn } from 'child_process';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
      // Only return posts that have a valid scheduledFor date
      res.json(scheduled.filter(post => post.scheduledFor !== null && post.scheduledFor !== undefined));
    } catch (error) {
      console.error('Error fetching scheduled posts:', error);
      res.status(500).json({ error: 'Failed to fetch scheduled posts' });
    }
  });

  app.post('/api/media/upload', async (req, res) => {
    try {
      const twitterClient = (await import('./lib/twitter')).default;
      const mediaId = await twitterClient.uploadMedia(req.body, req.headers['content-type'] || 'image/jpeg');
      res.json({ mediaId });
    } catch (error) {
      console.error('Media upload error:', error);
      res.status(500).json({ error: 'Failed to upload media' });
    }
  });

  app.post('/api/posts', async (req, res) => {
    try {
      interface PostToCreate {
        content: string;
        scheduledFor: Date | null;
        isDraft: boolean;
        status: string;
        recurringPattern: string | null;
        recurringEndDate: Date | null;
        createdAt: Date;
        updatedAt: Date;
        tweetId?: string;
      }

      if (!req.body.content) {
        return res.status(400).json({ error: 'Content is required' });
      }

      const twitterClient = (await import('./lib/twitter')).default;

      // If it's not a draft and postToTwitter is true, post immediately
      if (!req.body.isDraft && req.body.postToTwitter && !req.body.scheduledFor) {
        // Post to Twitter immediately
        try {
          const tweetResult = await twitterClient.tweet(req.body.content);
          const postData = {
            content: req.body.content,
            scheduledFor: null, // Explicitly set to null for immediate posts
            isDraft: false,
            status: 'posted',
            recurringPattern: null,
            recurringEndDate: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            tweetId: tweetResult.id
          };

          const post = await db.insert(posts).values(postData).returning();
          return res.json(post[0]);
        } catch (twitterError) {
          console.error('Twitter posting error:', twitterError);
          return res.status(500).json({ error: 'Failed to post to Twitter' });
        }
      }

      // Handle scheduled or draft posts as before...
      const postData = {
        content: req.body.content,
        scheduledFor: req.body.scheduledFor ? new Date(req.body.scheduledFor) : null,
        isDraft: !!req.body.isDraft,
        status: req.body.isDraft ? 'draft' : 'scheduled',
        recurringPattern: null,
        recurringEndDate: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const post = await db.insert(posts).values(postData).returning();
      res.json(post[0]);
    } catch (error) {
      console.error('Post creation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: 'Failed to create post', details: errorMessage });
    }
  });

  app.put('/api/posts/:id', async (req, res) => {
    try {
      const postData = {
        content: req.body.content,
        scheduledFor: req.body.scheduledFor ? new Date(req.body.scheduledFor) : null,
        isDraft: !!req.body.isDraft,
        recurringPattern: req.body.recurringPattern || null,
        recurringEndDate: req.body.recurringEndDate ? new Date(req.body.recurringEndDate) : null,
        updatedAt: new Date(),
      };

      const post = await db.update(posts)
        .set(postData)
        .where(eq(posts.id, parseInt(req.params.id)))
        .returning();

      if (!post.length) {
        return res.status(404).json({ error: 'Post not found' });
      }

      res.json(post[0]);
    } catch (error) {
      console.error('Failed to update post:', error);
      res.status(500).json({
        error: 'Failed to update post',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
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

      const response = await getAIResponse(prompt, 'gemini', 'gemini-flash');

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
  app.get('/api/trends', async (req, res) => {
    try {
      const { exec } = await import('child_process');
      const command = 'python3 server/lib/trends.py';

      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error('Error executing Python script:', error);
          return res.status(500).json({
            error: 'Failed to fetch trending topics',
            message: error.message
          });
        }

        if (stderr) {
          console.error('Python script stderr:', stderr);
        }

        try {
          // Clean the output before parsing
          const cleanedOutput = stdout.trim().replace(/\n/g, '');
          const trendsData = JSON.parse(cleanedOutput);
          console.log('Trends data:', trendsData);
          res.json(trendsData);
        } catch (parseError) {
          console.error('Error parsing trends data:', parseError, '\nRaw output:', stdout);
          res.status(500).json({
            error: 'Failed to parse trending topics',
            message: 'Invalid data format returned from trends service'
          });
        }
      });
    } catch (error) {
      console.error('Failed to fetch trends:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({
        error: 'Failed to fetch trending topics',
        message: errorMessage
      });
    }
  });

  app.post('/api/ai/research', async (req, res) => {
    console.log("Entering /api/ai/research route handler");
    console.log("req.body:", req.body);
    try {
      const { prompt, provider } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      // Create content object for research crew
      const content = {
        text: prompt
      };

      // Spawn Python process to run research crew
      console.log('Before spawning python process');
      const pythonProcess = spawn('python3', [
        path.join(__dirname, './research_crew/main.py'),
        JSON.stringify(content)
      ], {
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1'
        }
      });
      console.log('After spawning python process');

      let result = '';
      let error = '';

      pythonProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        console.log('Python stdout:', chunk);
        result += chunk;
      });

      pythonProcess.stderr.on('data', (data) => {
        const chunk = data.toString();
        console.error('Python stderr:', chunk);
        error += chunk;
      });

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          pythonProcess.kill();
          reject(new Error('Research process timed out after 600 seconds'));
        }, 600000);

        pythonProcess.on('close', (code) => {
          clearTimeout(timeout);
          console.log('Python process exited with code:', code);
          if (code === 0) {
            resolve(null);
          } else {
            reject(new Error(`Process exited with code ${code}. Error: ${error}`));
          }
        });
      });

      if (error) {
        console.error('Research error:', error);
        throw new Error(`Failed to complete research: ${error}`);
      }

      // Send the raw research results
      return res.json({
        insights: result,
        topics: [],
        suggestedContent: result
      });

    } catch (error) {
      console.error('Research error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({
        error: 'Failed to complete research',
        details: errorMessage
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

  // Engagement Opportunities Routes
  app.get('/api/engagement/opportunities', async (req, res) => {
    try {
      // Mock data for now - will be replaced with actual Twitter API integration
      const opportunities = [
        {
          id: '1',
          type: 'mention',
          content: '@youraccount Great thread about AI! Would love to hear more about your experience.',
          timestamp: new Date().toISOString(),
          priority: 'high',
          status: 'pending'
        },
        {
          id: '2',
          type: 'reply',
          content: 'Interesting perspective! Have you considered the impact of...',
          timestamp: new Date().toISOString(),
          priority: 'medium',
          status: 'pending'
        },
        {
          id: '3',
          type: 'trend',
          content: '#AITrends is gaining traction - opportunity to share your insights!',
          timestamp: new Date().toISOString(),
          priority: 'low',
          status: 'pending'
        }
      ];

      res.json(opportunities);
    } catch (error) {
      console.error('Failed to fetch engagement opportunities:', error);
      res.status(500).json({ error: 'Failed to fetch engagement opportunities' });
    }
  });

  app.put('/api/engagement/opportunities/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['engaged', 'ignored'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      // Mock success response - will be replaced with actual database/Twitter integration
      res.json({ id, status });
    } catch (error) {
      console.error('Failed to update engagement opportunity:', error);
      res.status(500).json({ error: 'Failed to update engagement opportunity' });
    }
  });
}