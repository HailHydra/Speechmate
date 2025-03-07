// controllers/configController.js
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const dotenv = require('dotenv');

// Function to update .env file with new values
const updateEnvFile = (key, value) => {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    let envContent = '';
    
    // Read existing .env file if it exists
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Check if the key already exists in the file
    const keyRegex = new RegExp(`^${key}=.*`, 'm');
    
    if (keyRegex.test(envContent)) {
      // Replace existing key
      envContent = envContent.replace(keyRegex, `${key}=${value}`);
    } else {
      // Add new key
      envContent += `\n${key}=${value}`;
    }
    
    // Write updated content back to .env file
    fs.writeFileSync(envPath, envContent.trim());
    
    // Reload environment variables
    dotenv.config();
    
    return true;
  } catch (error) {
    console.error('Error updating .env file:', error);
    return false;
  }
};

// Test the OpenAI API key
const testOpenAIKey = async (apiKey, model) => {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: model,
        messages: [{ role: 'user', content: 'Hello, this is a test message.' }],
        max_tokens: 10
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    return { success: true };
  } catch (error) {
    let errorMessage = 'Unknown error occurred';
    
    if (error.response) {
      errorMessage = error.response.data.error.message || 'API returned an error';
    } else if (error.request) {
      errorMessage = 'Could not connect to OpenAI API';
    } else {
      errorMessage = error.message;
    }
    
    return { success: false, message: errorMessage };
  }
};

// Controller for showing the configuration page
exports.showConfigPage = async (req, res) => {
  try {
    // Determine the current status
    let status = 'unknown';
    let errorMessage = '';
    
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'gpt-4-turbo';
    
    if (!apiKey) {
      status = 'missing';
    } else {
      // Test the current key
      const testResult = await testOpenAIKey(apiKey, model);
      status = testResult.success ? 'success' : 'error';
      errorMessage = testResult.message || '';
    }
    
    res.render('openai-config', {
      title: 'AI Configuration',
      status,
      errorMessage,
      currentKey: apiKey ? '************' : '',
      currentModel: model
    });
  } catch (error) {
    console.error('Error showing config page:', error);
    res.status(500).render('error', {
      title: 'Server Error',
      message: 'Failed to load the configuration page',
      errorDetails: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Controller for updating OpenAI configuration
exports.updateOpenAIConfig = async (req, res) => {
  try {
    const { apiKey, model } = req.body;
    
    if (!apiKey) {
      return res.render('openai-config', {
        title: 'AI Configuration',
        status: 'error',
        errorMessage: 'API key is required',
        currentKey: '',
        currentModel: model
      });
    }
    
    // Test the key before saving
    const testResult = await testOpenAIKey(apiKey, model);
    
    if (!testResult.success) {
      return res.render('openai-config', {
        title: 'AI Configuration',
        status: 'error',
        errorMessage: testResult.message,
        currentKey: apiKey,
        currentModel: model
      });
    }
    
    // Update environment variables
    updateEnvFile('OPENAI_API_KEY', apiKey);
    updateEnvFile('OPENAI_MODEL', model);
    
    // Show success page
    res.redirect('/config/openai?updated=true');
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).render('error', {
      title: 'Server Error',
      message: 'Failed to update the configuration',
      errorDetails: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};