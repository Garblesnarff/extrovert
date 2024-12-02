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

    // Create content object for research crew with search requirements
    const content = {
      text: prompt,
      timestamp: new Date().toISOString(),
      search_config: {
        require_recent: true,
        time_range: 'last_24h',
        include_news: true,
        sort_by: 'date'
      }
    };

    // Spawn Python process to run research crew
    console.log('Starting research process with content:', JSON.stringify(content));
    
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
      console.log('Python stdout:', chunk);
      result += chunk;
    });

    pythonProcess.stderr.on('data', (data) => {
      const chunk = data.toString();
      console.error('Python stderr:', chunk);
      error += chunk;
    });

    await new Promise((resolve, reject) => {
      pythonProcess.on('close', (code) => {
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

    // Parse and format the research results
    let researchResults;
    try {
      // First try to parse as JSON
      try {
        researchResults = JSON.parse(result);
      } catch {
        // If not JSON, use the raw result as insights
        researchResults = { insights: result.trim() };
      }

      // Clean and validate the response
      const cleanedInsights = researchResults?.insights?.trim();
      if (!cleanedInsights) {
        throw new Error('No valid research results found');
      }

      // Return the raw insights to preserve accuracy
      return res.json({
        insights: cleanedInsights,
        raw_response: result.trim() // Include raw response for debugging
      });
    } catch (parseError) {
      console.error('Failed to parse research results:', parseError);
      return res.status(500).json({
        error: 'Failed to parse research results',
        details: 'Invalid response format from research service'
      });
    }

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
