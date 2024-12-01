import { Router } from 'express';
import { PythonShell } from 'python-shell';
import path from 'path';

const router = Router();

router.post('/research', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ error: 'Valid research query is required' });
    }

    const options = {
      mode: 'text' as const,
      scriptPath: path.join(__dirname, '../services'),
      pythonPath: 'python3',
      args: [JSON.stringify({ query: query.trim() })]
    };

    try {
      const results = await PythonShell.run('research_crew.py', options);
      console.log('Research results:', results); // Debug log
      
      if (!results || results.length === 0) {
        throw new Error('No results from research service');
      }

      const research = JSON.parse(results[0]);
      return res.json(research);
      
    } catch (pythonError) {
      console.error('Python execution error:', pythonError);
      throw new Error('Failed to execute research');
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
