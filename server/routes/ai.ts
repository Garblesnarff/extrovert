import { Router } from 'express';
import { PythonShell } from 'python-shell';
import path from 'path';

const router = Router();

router.post('/research', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      return res.status(400).json({ error: 'Research topic is required' });
    }

    const options = {
      mode: 'text' as const,
      scriptPath: path.join(__dirname, '../services'),
      args: [JSON.stringify({ content: content.trim() })],
    };

    let results;
    try {
      results = await PythonShell.run('research_crew.py', options);
      const research = JSON.parse(results[0]);

      if (!research || typeof research !== 'object') {
        throw new Error('Invalid research results format');
      }

      return res.json({
        facts: research.facts || [],
        sources: research.sources || [],
        confidence: research.confidence_score || 0,
        context: research.context || '',
        suggestions: research.enhancement_suggestions || []
      });
    } catch (pythonError) {
      console.error('Python execution error:', pythonError);
      if (pythonError instanceof SyntaxError) {
        throw new Error('Invalid response format from research service');
      }
      throw new Error('Failed to execute research script');
    }
  } catch (error: unknown) {
    console.error('Research error:', error);
    res.status(500).json({ 
      error: 'Research service error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
