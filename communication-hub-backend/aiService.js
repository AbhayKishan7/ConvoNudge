import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Ensure an API key is passed so the SDK doesn't throw an initialization error
const apiKey = process.env.GROQ_API_KEY || 'dummy_key_until_env_loaded';

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
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

    // Secondary Check: Llama Model for Toxicity / Abuse
    const response = await groq.chat.completions.create({
      model: 'qwen/qwen3.8-27b',
      messages: [
        {
          role: 'system',
          content: 'You are a content safety classifier. If the message contains explicit hate speech, severe abuse, or harassment, respond ONLY with "unsafe". Otherwise respond ONLY with "safe".'
        },
        { role: 'user', content: messageText }
      ],
      temperature: 0.1,
    });

    const result = response.choices[0]?.message?.content?.toLowerCase() || 'safe';

    if (result.includes('unsafe')) {
      return { isSafe: false, reason: 'Inappropriate or Toxic Content Detected' };
    }

    return { isSafe: true, reason: null };
  } catch (error) {
    console.error('Groq Guardrail Error:', error.message);
    
    // Fallback: Local Regex still protects user privacy if API errors out
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
    .map(m => `User: "${m.content || m.text || ''}"`)
    .join('\n');

  const systemPrompt = `You are an AI conversation co-pilot helping introverts practice talking to strangers.
Analyze the conversation snippet (even if it is just 1 or 2 messages) and suggest 1 natural, open-ended question to keep the conversation flowing smoothly.

Respond ONLY in valid JSON format matching this structure:
{
  "suggestedQuestion": "Your suggested follow-up question here",
  "topic": "Current topic name"
}`;

  console.log('[AI Co-Pilot Input]:', transcript);

  try {
    const response = await groq.chat.completions.create({
      model: 'qwen/qwen3.8-27b',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Chat snippet:\n${transcript}` }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const jsonOutput = JSON.parse(response.choices[0].message.content);
    console.log('[AI Co-Pilot Output]:', jsonOutput);
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
  const messages = Array.isArray(sessionMessages) ? sessionMessages : [];
  
  const transcript = messages.length > 0 
    ? messages
        .map(m => {
          const senderLabel = (m.senderId && userId && m.senderId.toString() === userId.toString()) 
            ? 'Target User' 
            : 'Partner';
          return `${senderLabel}: "${m.content || m.text || ''}"`;
        })
        .join('\n') 
    : 'No messages were exchanged.';

  const systemPrompt = `You are an expert interpersonal communication coach for "ConvoNudge".
Evaluate the 'Target User' based on their chat transcript with 'Partner'.

Guidelines:
- Evaluate short transcripts (even 1 or 2 messages, e.g., "Hi", "Hello"). Acknowledge limited evidence while providing encouragement and startup communication tips.
- For empty transcripts, give neutral scores (e.g., 50 talk ratio, 5 scores) and explain that there was not enough message data to assess detailed performance.
- Do not invent non-existent messages or fake rewrites; return an empty array for suggestedPhrasings if there are no clear candidate phrases.

Return ONLY valid JSON matching this schema:
{
  "talkRatio": 50,
  "questionQualityScore": 8,
  "conversationBalanceScore": 7,
  "strengths": ["Friendly tone", "Good initiative"],
  "areasForImprovement": ["Try asking open-ended follow-up questions"],
  "suggestedPhrasings": [
    {
      "original": "User's exact message",
      "betterAlternative": "A more engaging way to say it"
    }
  ]
}`;

  console.log('[AI Feedback Input]:', messages);

  try {
    const response = await groq.chat.completions.create({
      model: 'qwen/qwen3.8-27b',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Chat Transcript:\n${transcript}` }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
    });

    const feedback = JSON.parse(response.choices[0].message.content);
    console.log('[AI Feedback Output]:', feedback);
    return feedback;
  } catch (error) {
    console.error('Groq Feedback Error:', error.message);
    console.log('[AI Feedback Input]:', messages);
    console.log('[AI Feedback Output]:', null);
    return null;
  }
}