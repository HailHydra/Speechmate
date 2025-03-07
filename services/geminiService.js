// services/geminiService.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');

dotenv.config();

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Function to generate content using Gemini
async function generateContent(prompt) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const chat = await model.startChat();
    const result = await chat.sendMessage(prompt);
    return result.response.text();  // Ensure this is the correct way to access response data
  } catch (error) {
    console.error("Error generating content:", error.response?.data || error.message);
    throw error;
  }
}


module.exports = {
  generateContent
};