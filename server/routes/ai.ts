import { Router } from 'express';
import { PythonShell } from 'python-shell';
import path from 'path';

const router = Router();

router.post('/research', async (req, res) => {
  try {
    console.log('Received research request body:', req.body); // Debug log
    
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const { content } = req.body;
    console.log('Extracted content:', content); // Additional debug log
    
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content is required and must be a string' });
    }

    const trimmedContent = content.trim();
    console.log('Trimmed content:', trimmedContent); // Additional debug log
    
    if (trimmedContent.length === 0) {
      return res.status(400).json({ error: 'Research topic cannot be empty' });
    }

    const options = {
      mode: 'text' as const,
      scriptPath: path.join(__dirname, '../services'),
      args: [JSON.stringify({ content: trimmedContent })],
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
