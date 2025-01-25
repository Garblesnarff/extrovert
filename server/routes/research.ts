import { Router } from 'express';
import { spawn } from 'child_process';
import path from 'path';

const router = Router();

router.post('/api/ai/research', async (req, res) => {
  console.log("Entering /api/ai/research route handler");
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const content = { text: prompt };

    const pythonProcess = spawn('python3', [
      path.join(__dirname, '../research_crew/main.py'),
      JSON.stringify(content)
    ], {
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1'
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
      const timeout = setTimeout(() => {
        pythonProcess.kill();
        reject(new Error('Research process timed out after 600 seconds'));
      }, 600000);

      pythonProcess.on('close', (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          resolve(null);
        } else {
          reject(new Error(`Process exited with code ${code}`));
        }
      });
    });

    if (error) {
      throw new Error(`Research failed: ${error}`);
    }

    // Send the raw research results
    return res.json({
      insights: result,
      topics: [],
      suggestedContent: result
    });

  } catch (error) {
    console.error('Research error:', error);
    return res.status(500).json({
      error: 'Failed to complete research',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;