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

    // Verify required environment variables
    const requiredEnvVars = ['BRAVE_API_KEY', 'SERPER_API_KEY'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      return res.status(500).json({
        error: 'Missing required API keys',
        details: `Missing: ${missingVars.join(', ')}`
      });
    }

    // Create content object for research crew
    const content = {
      text: prompt.trim()
    };

    console.log('Starting real-time research process for:', content.text.substring(0, 100));
    
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
      const chunk = data.toString();
      console.log('Research progress:', chunk);
      result += chunk;
    });

    pythonProcess.stderr.on('data', (data) => {
      const chunk = data.toString();
      console.error('Research error:', chunk);
      error += chunk;
    });

    // Set a timeout of 30 seconds
    const timeout = 30000;
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Research timeout')), timeout);
    });

    try {
      await Promise.race([
        new Promise((resolve, reject) => {
          pythonProcess.on('close', (code) => {
            console.log('Research process completed with code:', code);
            if (code === 0) {
              resolve(null);
            } else {
              reject(new Error(`Process failed with code ${code}`));
            }
          });
        }),
        timeoutPromise
      ]);
    } catch (execError) {
      pythonProcess.kill();
      throw execError;
    }

    if (error) {
      console.error('Research process error:', error);
      throw new Error('Research process failed');
    }

    // Parse and validate research results
    let researchResults;
    try {
      researchResults = JSON.parse(result);
      
      // Validate response structure
      if (!researchResults || typeof researchResults !== 'object') {
        throw new Error('Invalid response format');
      }
    
    // Format and send response
      return res.json({
        query: content.text,
        timestamp: new Date().toISOString(),
        topics: researchResults?.topics || [],
        insights: researchResults?.insights || '',
        suggestedContent: researchResults?.enhanced_content || '',
        sources: researchResults?.sources || [],
        metadata: {
          total_results: researchResults?.total_results || 0,
          execution_time: researchResults?.metadata?.execution_time || 0,
          providers: researchResults?.sources || ['Brave Search', 'Serper']
        }
      });

    } catch (parseError) {
      console.error('Failed to parse research results:', parseError);
      return res.status(500).json({
        error: 'Invalid research results',
        details: parseError instanceof Error ? parseError.message : 'Failed to parse response'
      });
    }

  } catch (error) {
    console.error('Research process failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    const statusCode = errorMessage.includes('timeout') ? 504 : 500;
    
    return res.status(statusCode).json({ 
      error: 'Research process failed',
      details: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
