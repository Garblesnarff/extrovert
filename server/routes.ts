import type { Express } from "express";
import { db } from "../db";
import { posts } from "@db/schema";
import { eq, asc, desc } from "drizzle-orm";

export function registerRoutes(app: Express) {
  // Posts
  app.post('/api/posts', async (req, res) => {
    try {
      const post = await db.insert(posts).values({
        content: req.body.content,
        scheduledFor: req.body.scheduledFor,
        isDraft: false,
      }).returning();
      res.json(post[0]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create post' });
    }
  });

  app.get('/api/posts/drafts', async (req, res) => {
    try {
      const drafts = await db.query.posts.findMany({
        where: eq(posts.isDraft, true),
        orderBy: desc(posts.updatedAt),
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
        orderBy: asc(posts.scheduledFor),
      });
      res.json(scheduled);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch scheduled posts' });
    }
  });

  // AI Routes
  app.post('/api/ai/assist', async (req, res) => {
    try {
      // CrewAI integration would go here
      const suggestion = {
        suggestedContent: "AI-enhanced version of your post",
        hashtags: ["#AI", "#Content"],
        analysis: "This post looks good!"
      };
      res.json(suggestion);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get AI assistance' });
    }
  });

  app.post('/api/ai/research', async (req, res) => {
    try {
      // CrewAI research agent would go here
      const research = {
        topics: ["Topic 1", "Topic 2"],
        insights: "Research insights here",
      };
      res.json(research);
    } catch (error) {
      res.status(500).json({ error: 'Failed to research content' });
    }
  });
}
