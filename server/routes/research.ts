import { Router } from 'express';
import { spawn } from 'child_process';
import path from 'path';

const router = Router();

router.post('/api/ai/research', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Create content object for research crew
    const content = {
      text: prompt
    };

    // Spawn Python process to run research crew
    const pythonProcess = spawn('python3', [
      path.join(__dirname, '../research_crew/main.py')
    ], {
      env: {
        ...process.env,
        RESEARCH_CONTENT: JSON.stringify(content)
      }
    });

    let result = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    await new Promise((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve(null);
        } else {
          reject(new Error(`Process exited with code ${code}`));
        }
      });
    });

    if (error) {
      console.error('Research error:', error);
      throw new Error('Failed to complete research');
    }

    // Parse and format the research results
    let researchResults;
    try {
      researchResults = JSON.parse(result);
    } catch (parseError) {
      console.error('Failed to parse research results:', parseError);
      return res.status(500).json({
        error: 'Failed to parse research results',
        details: 'Invalid response format from research service'
      });
    }
    
    return res.json({
      topics: researchResults?.topics || [],
      insights: researchResults?.insights || '',
      suggestedContent: researchResults?.enhanced_content || ''
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

export default router;
