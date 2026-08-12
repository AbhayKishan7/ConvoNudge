import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Ensure an API key is passed so the SDK doesn't throw an initialization error
const apiKey = process.env.GROQ_API_KEY || 'dummy_key_until_env_loaded';

const groq = new OpenAI({
  apiKey: apiKey,
  baseURL: 'https://api.groq.com/openai/v1',
});

/**
 * 1. Safety Guardrail: Check message for harassment or PII leaks
 */
export async function checkSafetyAndPII(messageText) {
  try {
    // Catch 9 to 12 contiguous digits OR spaced/hyphenated numbers OR email addresses
    const phoneRegex = /(\+?\d{1,4}[\s.-]?)?\(?\d{3,4}\)?[\s.-]?\d{3}[\s.-]?\d{3,4}|\b\d{9,12}\b/;
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

    const containsPII = phoneRegex.test(messageText) || emailRegex.test(messageText);

    if (containsPII) {
      console.warn(`⚠️ PII Detected in message: "${messageText}"`);
      return { isSafe: false, reason: 'Sharing Phone Number or Contact Info is not allowed!' };
    }

    // Secondary Check: Llama Guard AI for Toxicity / Abuse
    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: messageText }],
    });

    const result = response.choices[0].message.content;

    if (result.includes('unsafe')) {
      return { isSafe: false, reason: 'Inappropriate or Toxic Content Detected' };
    }

    return { isSafe: true, reason: null };
  } catch (error) {
    console.error('Groq Guardrail Error:', error.message);
    
    // Fallback: If API fails, local Regex still protects user privacy
    const phoneRegex = /\b\d{9,12}\b/;
    if (phoneRegex.test(messageText)) {
      return { isSafe: false, reason: 'Sharing Phone Number is not allowed!' };
    }
    
    return { isSafe: true, reason: null }; 
  }
}

/**
 * 2. AI Co-Pilot: Analyze transcript and generate helpful conversation prompts
 */
export async function generateConversationPrompt(messages) {
  if (!messages || messages.length === 0) return null;

  const transcript = messages
    .slice(-5) 
    .map(m => `User: "${m.content}"`)
    .join('\n');

  const systemPrompt = `You are an AI conversation co-pilot helping introverts practice talking to strangers.
Analyze the conversation snippet and suggest 1 natural, open-ended question to keep the conversation flowing smoothly.

Respond ONLY in valid JSON format matching this structure:
{
  "suggestedQuestion": "Your suggested follow-up question here",
  "topic": "Current topic name"
}`;

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Chat snippet:\n${transcript}` }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const jsonOutput = JSON.parse(response.choices[0].message.content);
    return jsonOutput;
  } catch (error) {
    console.error('Groq Co-Pilot Error:', error.message);
    return null;
  }
}

/**
 * 3. Post-Session Feedback: Generates comprehensive communication metrics
 */
export async function generatePostSessionFeedback(sessionMessages, userId) {
  if (!sessionMessages || sessionMessages.length === 0) return null;

  const transcript = sessionMessages
    .map(m => `${m.senderId.toString() === userId.toString() ? 'Target User' : 'Partner'}: "${m.content}"`)
    .join('\n');

  const systemPrompt = `You are an expert interpersonal communication coach.
Evaluate the 'Target User' based on their chat transcript with 'Partner'.

Generate constructive, highly specific feedback. Return ONLY valid JSON format matching this schema:
{
  "talkRatio": 50,
  "questionQualityScore": 8,
  "conversationBalanceScore": 7,
  "strengths": ["Clear phrasing", "Good empathy"],
  "areasForImprovement": ["Ask more open-ended questions"],
  "suggestedPhrasings": [
    {
      "original": "User's exact message",
      "betterAlternative": "A more engaging way to say it"
    }
  ]
}`;

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Chat Transcript:\n${transcript}` }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('Groq Feedback Error:', error.message);
    return null;
  }
}