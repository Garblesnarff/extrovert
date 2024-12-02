import { Router } from 'express';
import { PythonShell } from 'python-shell';
import path from 'path';

const router = Router();

router.post('/research', async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Research topic is required' });
    }

    const options = {
      mode: 'text' as const,
      scriptPath: path.join(__dirname, '../services'),
      pythonPath: 'python3',
      args: [JSON.stringify({ query: content.trim() })]
    };

    try {
      const results = await PythonShell.run('research_crew.py', options);
      
      if (!results || results.length === 0) {
        throw new Error('No results from research service');
      }

      const research = JSON.parse(results[0]);
      
      if (research.error) {
        throw new Error(research.error);
      }

      return res.json(research);
      
    } catch (pythonError) {
      console.error('Python execution error:', pythonError);
      throw new Error('Failed to execute research');
    }
  } catch (error: unknown) {
    console.error('Research error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Research service error'
    });
  }
});

export default router;
