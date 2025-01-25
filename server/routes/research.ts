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

    // Create content object for research crew
    const content = {
      text: prompt
    };

    // Spawn Python process to run research crew
    console.log('Before spawning python process'); 
    const pythonProcess = spawn('python3', [
      path.join(__dirname, '../research_crew/main.py'),
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
        reject(new Error('Research process timed out after 30 seconds'));
      }, 30000);

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

    // Parse and format the research results
    let researchResults;
    try {
      // Clean the output and find JSON content
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }
      researchResults = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse research results:', parseError);
      console.error('Raw result:', result);
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