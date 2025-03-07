const Patient = require('../models/patient');
const Therapist = require('../models/therapist');
const axios = require('axios');
require('dotenv').config(); // Make sure to install dotenv if not already installed

// Config validation at startup
function validateConfig() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes('your_api') || apiKey === '') {
    console.warn('⚠️ WARNING: Gemini API key is not properly configured. LLM-based allocation will not work.');
    return false;
  }
  return true;
}

// Global flag to avoid repeated API calls if we know the config is invalid
const isConfigValid = validateConfig();

// Function to clean up the LLM response
function cleanJsonResponse(response) {
  // Check if response is wrapped in code blocks
  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch && jsonMatch[1]) {
    return jsonMatch[1].trim();
  }
  
  // If not wrapped in code blocks, try to extract just the JSON portion
  // Look for what appears to be a JSON object starting with { and ending with }
  const jsonObjectMatch = response.match(/{[\s\S]*?}/);
  if (jsonObjectMatch) {
    return jsonObjectMatch[0].trim();
  }
  
  return response;
}

async function allocateTherapistWithLLM(patientId) {
  try {
    // Skip LLM allocation immediately if config is invalid
    if (!isConfigValid) {
      return { 
        success: false, 
        message: 'LLM allocation skipped due to missing Gemini API key configuration'
      };
    }

    const patient = await Patient.findById(patientId);
    if (!patient) throw new Error('Patient not found');
    
    // Find therapists who have capacity
    const availableTherapists = await Therapist.find({
      $expr: { $lt: ["$currentCaseload", "$maxCaseload"] }
    });
    
    if (availableTherapists.length === 0) {
      return { success: false, message: 'No therapists with available capacity' };
    }
    
    // Prepare data for LLM
    const patientData = {
      name: patient.name,
      age: patient.age,
      condition: patient.condition,
      additionalNeeds: patient.additionalNeeds || [],
      preferredDays: patient.preferredDays || [],
      preferredTimes: patient.preferredTimes || [],
      location: patient.location || 'Unknown',
      preferredLanguage: patient.preferredLanguage || 'English'
    };
    
    const therapistsData = availableTherapists.map(therapist => ({
      id: therapist._id.toString(),
      name: therapist.name,
      specialties: therapist.specialties || [],
      availableDays: therapist.availableDays || [],
      availableTimes: therapist.availableTimes || [],
      currentCaseload: therapist.currentCaseload,
      maxCaseload: therapist.maxCaseload,
      location: therapist.location || 'Unknown',
      languages: therapist.languages || []
    }));
    
    // Creating a prompt for the LLM
    const prompt = `
You are an intelligent patient-therapist matching system for speech therapy.
Based on the patient and therapist information provided, determine the best therapist match.
Your response must be in valid JSON format.

PATIENT INFORMATION:
- Name: ${patientData.name}
- Age: ${patientData.age}
- Primary condition: ${patientData.condition}
- Additional needs: ${patientData.additionalNeeds.join(', ')}
- Preferred days: ${patientData.preferredDays.join(', ')}
- Preferred language: ${patientData.preferredLanguage}
- Location: ${patientData.location}

AVAILABLE THERAPISTS:
${therapistsData.map((t, i) => `
THERAPIST ${i+1}:
- ID: ${t.id}
- Name: ${t.name}
- Specialties: ${t.specialties.join(', ')}
- Available days: ${t.availableDays.join(', ')}
- Languages: ${t.languages.join(', ')}
- Location: ${t.location}
- Current caseload: ${t.currentCaseload}/${t.maxCaseload}
`).join('')}

Consider the following factors when making your decision:
1. Specialty match with patient's condition and additional needs
2. Language compatibility
3. Geographical proximity
4. Availability on patient's preferred days
5. Current caseload (preferring therapists with lower caseloads)

IMPORTANT: You must select a therapist even if there isn't a perfect match. Choose the best available option.
If a patient has strong location preferences, it's still better to assign a therapist with a specialty match in a different location than no therapist at all.
Do not return null for selectedTherapistId or matchingDay - always make the best match possible.

Your response must be a valid JSON object with exactly this structure:
{
  "selectedTherapistId": "the ID of the best matching therapist",
  "matchingDay": "the best matching day for appointments",
  "matchingTime": "the best matching time slot",
  "reasonForMatch": "explanation of why this therapist is the best match",
  "matchScore": a number between 1-100 representing the strength of the match
}

Important: Your ENTIRE response must be ONLY this JSON object, with no additional explanation or text.
Do not include any markdown formatting, text, or commentary outside the JSON.
Do not include any explanatory text or markdown formatting like \`\`\`json or \`\`\`.
`;

    // Make API call to LLM service
    const llmResponse = await callLLMService(prompt);
    
    // Enhanced debugging for LLM response
    console.log('Raw LLM response:', llmResponse);
    
    // Parse the LLM response
    let matchResult;
    try {
      const cleanedResponse = cleanJsonResponse(llmResponse);
      console.log('Cleaned response:', cleanedResponse);
      
      matchResult = JSON.parse(cleanedResponse);
      console.log('Parsed match result:', matchResult);
    } catch (e) {
      console.error('Failed to parse LLM response as JSON:', e);
      throw new Error('LLM returned invalid JSON format');
    }
    
    // Handle case where LLM refuses to make a match despite instruction
    if (!matchResult.selectedTherapistId || !matchResult.matchingDay) {
      console.log('LLM declined to make a match. Reason:', matchResult.reasonForMatch);
      
      // Instead of throwing an error, we'll make a fallback match
      const fallbackTherapist = availableTherapists[0]; // Choose first available
      const fallbackDay = patient.preferredDays && patient.preferredDays.length > 0 ? 
        patient.preferredDays[0] : (fallbackTherapist.availableDays && fallbackTherapist.availableDays.length > 0 ? 
          fallbackTherapist.availableDays[0] : 'Monday');
      const fallbackTime = '09:00';
      
      return {
        success: false,
        message: `LLM declined to make a match: ${matchResult.reasonForMatch}`,
        suggestedFallback: {
          therapistId: fallbackTherapist._id,
          therapistName: fallbackTherapist.name,
          day: fallbackDay,
          time: fallbackTime
        }
      };
    }
    
    // Find the selected therapist from the ID
    const selectedTherapist = availableTherapists.find(t => 
      t._id.toString() === matchResult.selectedTherapistId);
    
    if (!selectedTherapist) {
      console.error('Invalid therapist ID returned by LLM:', matchResult.selectedTherapistId);
      console.log('Available therapist IDs:', availableTherapists.map(t => t._id.toString()));
      throw new Error('LLM returned an invalid therapist ID');
    }
    
    // Handle null matchingTime by providing a default
    const appointmentTime = matchResult.matchingTime || 
      (selectedTherapist.availableTimes && selectedTherapist.availableTimes.length > 0 ? 
        selectedTherapist.availableTimes[0].start : '09:00');
    
    // Update patient with assignment
    patient.assignedTherapist = selectedTherapist._id;
    patient.appointmentDay = matchResult.matchingDay;
    patient.appointmentTime = appointmentTime;
    await patient.save();
    
    // Update therapist's caseload
    selectedTherapist.currentCaseload += 1;
    await selectedTherapist.save();
    
    return { 
      success: true, 
      therapist: selectedTherapist,
      appointmentDay: matchResult.matchingDay,
      appointmentTime: appointmentTime,
      matchReason: matchResult.reasonForMatch,
      matchScore: matchResult.matchScore
    };
  } catch (error) {
    console.error('LLM Allocation error:', error);
    return { success: false, message: error.message };
  }
}

// Function to call an LLM API with better error handling and timeout
async function callLLMService(prompt) {
  try {
    // Validate API key at function call
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.includes('your_api') || apiKey === '') {
      throw new Error('Gemini API key not properly configured');
    }
    
    // Add timeout to avoid hanging requests
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent',
      {
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.1, // Reduced temperature for more consistent formatting
          maxOutputTokens: 1024
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        timeout: 15000 // 15-second timeout
      }
    );
    
    if (!response.data || !response.data.candidates || !response.data.candidates[0]) {
      throw new Error('Unexpected response format from Gemini API');
    }
    
    return response.data.candidates[0].content.parts[0].text;
  } catch (error) {
    // Detailed error handling with helpful error messages
    if (error.response) {
      // Gemini API returned an error
      const errorData = error.response.data;
      console.error('Gemini API error:', {
        status: error.response.status,
        data: errorData,
        headers: error.response.headers
      });
      
      // Provide more specific error messages based on error type
      if (error.response.status === 401) {
        throw new Error('Authentication error: Invalid API key');
      } else if (error.response.status === 429) {
        throw new Error('Rate limit exceeded or quota reached for Gemini API');
      } else if (errorData && errorData.error) {
        throw new Error(`Gemini API error: ${errorData.error.message || 'Unknown error'}`);
      }
    } else if (error.request) {
      // Network error or timeout
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timed out while calling Gemini API');
      } else {
        throw new Error(`Network error: ${error.message}`);
      }
    }
    
    // Generic fallback error
    throw new Error(`Failed to get response from LLM service: ${error.message}`);
  }
}

// Add retry mechanism for LLM allocation
async function retryLLMAllocation(patientId, maxRetries = 2) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`LLM allocation attempt ${attempt} for patient ${patientId}`);
      const result = await allocateTherapistWithLLM(patientId);
      if (result.success) {
        console.log(`LLM allocation successful on attempt ${attempt}`);
        return result;
      }
      
      // If we have a suggested fallback, return that even though success is false
      if (result.suggestedFallback) {
        console.log(`LLM suggested fallback on attempt ${attempt}`);
        return result;
      }
      
      lastError = new Error(result.message);
      console.log(`LLM allocation attempt ${attempt} failed: ${result.message}`);
    } catch (error) {
      lastError = error;
      console.error(`LLM allocation attempt ${attempt} error:`, error);
    }
    
    // Only wait between retries, not after the last one
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay between retries
    }
  }
  
  // If we get here, all retries failed
  throw lastError || new Error('All LLM allocation attempts failed');
}

// Single implementation of allocateTherapist function (removed duplicate)
async function allocateTherapist(patientId) {
  try {
    console.log(`Starting allocation process for patient ${patientId}`);
    
    // Try using the LLM-based allocation first with retries
    try {
      const llmAllocation = await retryLLMAllocation(patientId);
      if (llmAllocation.success) {
        console.log(`LLM allocation successful for patient ${patientId}`);
        return llmAllocation;
      }
      
      // If LLM declined to make a match but suggested a fallback
      if (llmAllocation.suggestedFallback) {
        console.log(`Using LLM's suggested fallback for patient ${patientId}`);
        const { therapistId, day, time } = llmAllocation.suggestedFallback;
        
        // Update patient with the fallback assignment
        const patient = await Patient.findById(patientId);
        if (!patient) throw new Error('Patient not found');
        
        const therapist = await Therapist.findById(therapistId);
        if (!therapist) throw new Error('Therapist not found');
        
        patient.assignedTherapist = therapistId;
        patient.appointmentDay = day;
        patient.appointmentTime = time;
        await patient.save();
        
        // Update therapist's caseload
        therapist.currentCaseload += 1;
        await therapist.save();
        
        return { 
          success: true, 
          therapist: therapist,
          appointmentDay: day,
          appointmentTime: time,
          matchQuality: 'low',
          note: `LLM-suggested fallback: ${llmAllocation.message}`
        };
      }
    } catch (error) {
      console.log(`All LLM allocation attempts failed (${error.message}), falling back to rule-based allocation`);
    }
    
    // Original rule-based algorithm follows...
    const patient = await Patient.findById(patientId);
    if (!patient) throw new Error('Patient not found');
    
    // Find therapists specialized in patient's condition
    const matchingTherapists = await Therapist.find({
      specialties: patient.condition,
      $expr: { $lt: ["$currentCaseload", "$maxCaseload"] }
    });
    
    if (matchingTherapists.length === 0) {
      // If no exact specialty match, find any therapist with capacity
      const anyTherapists = await Therapist.find({
        $expr: { $lt: ["$currentCaseload", "$maxCaseload"] }
      });
      
      if (anyTherapists.length === 0) {
        return { success: false, message: 'No therapists with available capacity' };
      }
      
      console.log(`No specialty match found, falling back to general capacity match (${anyTherapists.length} therapists)`);
      
      // Use available therapists even without specialty match
      const fallbackTherapist = anyTherapists[0];
      const fallbackDay = patient.preferredDays && patient.preferredDays.length > 0 ? 
        patient.preferredDays[0] : fallbackTherapist.availableDays[0];
      const fallbackTime = fallbackTherapist.availableTimes && 
        fallbackTherapist.availableTimes.length > 0 ? 
        fallbackTherapist.availableTimes[0].start : '09:00';
      
      // Update patient with assignment
      patient.assignedTherapist = fallbackTherapist._id;
      patient.appointmentDay = fallbackDay;
      patient.appointmentTime = fallbackTime;
      await patient.save();
      
      // Update therapist's caseload
      fallbackTherapist.currentCaseload += 1;
      await fallbackTherapist.save();
      
      return { 
        success: true, 
        therapist: fallbackTherapist, 
        appointmentDay: fallbackDay,
        appointmentTime: fallbackTime,
        matchQuality: 'low',
        note: 'No specialty match available, assigned based on capacity only'
      };
    }
    
    // Scoring system to find best match
    const scoredTherapists = matchingTherapists.map(therapist => {
      let score = 0;
      
      // Score based on specialties matching additional needs
      if (patient.additionalNeeds && Array.isArray(patient.additionalNeeds)) {
        patient.additionalNeeds.forEach(need => {
          if (therapist.specialties && therapist.specialties.includes(need)) score += 3;
        });
      }
      
      // Score based on language match
      if (therapist.languages && therapist.languages.includes(patient.preferredLanguage)) score += 5;
      
      // Score based on location proximity (simplified)
      if (therapist.location === patient.location) score += 4;
      
      // Score based on availability match
      if (patient.preferredDays && Array.isArray(patient.preferredDays) && 
          therapist.availableDays && Array.isArray(therapist.availableDays)) {
        const daysMatch = patient.preferredDays.filter(day => 
          therapist.availableDays.includes(day)).length;
        score += daysMatch * 2;
      }
      
      // Adjust score by current caseload (prefer less loaded therapists)
      score += (therapist.maxCaseload - therapist.currentCaseload);
      
      return { therapist, score };
    });
    
    // Sort therapists by score in descending order
    scoredTherapists.sort((a, b) => b.score - a.score);
    
    // Select the best matching therapist
    const bestMatch = scoredTherapists[0].therapist;
    console.log(`Best rule-based match is ${bestMatch.name} with score ${scoredTherapists[0].score}`);
    
    // Find suitable appointment time
    let matchingDay;
    if (patient.preferredDays && Array.isArray(patient.preferredDays) && 
        bestMatch.availableDays && Array.isArray(bestMatch.availableDays)) {
      matchingDay = patient.preferredDays.find(day => 
        bestMatch.availableDays.includes(day)) || bestMatch.availableDays[0];
    } else {
      matchingDay = bestMatch.availableDays && bestMatch.availableDays.length > 0 ? 
        bestMatch.availableDays[0] : 'Monday';
    }
      
    // For simplicity, just assign the first available time slot
    const appointmentTime = bestMatch.availableTimes && bestMatch.availableTimes.length > 0 ? 
      bestMatch.availableTimes[0].start : '09:00';
    
    // Update patient with assignment
    patient.assignedTherapist = bestMatch._id;
    patient.appointmentDay = matchingDay;
    patient.appointmentTime = appointmentTime;
    await patient.save();
    
    // Update therapist's caseload
    bestMatch.currentCaseload += 1;
    await bestMatch.save();
    
    return { 
      success: true, 
      therapist: bestMatch, 
      appointmentDay: matchingDay,
      appointmentTime: appointmentTime,
      matchScore: scoredTherapists[0].score,
      matchQuality: scoredTherapists[0].score > 10 ? 'high' : 'medium',
    };
  } catch (error) {
    console.error('Allocation error:', error);
    return { 
      success: false, 
      message: error.message,
      errorDetails: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }
}

module.exports = { allocateTherapist, allocateTherapistWithLLM };