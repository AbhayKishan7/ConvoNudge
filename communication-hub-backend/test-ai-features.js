// Run with: node test-ai-features.js
import assert from 'node:assert/strict';
import {
  checkSafetyAndPII,
  generateConversationPrompt,
  generatePostSessionFeedback
} from './aiService.js';

async function runTests() {
  console.log('1. Safety Check Test');
  const safetyResult = await checkSafetyAndPII(
    'You are a worthless idiot. Call me at 9876543210.'
  );
  console.log('Safety result:', safetyResult);
  assert.equal(safetyResult.isSafe, false, 'The phone number/toxic message should be blocked');

  console.log('\n2. AI Copilot Test');
  const promptResult = await generateConversationPrompt([
    { senderId: 'user-1', content: 'I love hiking on weekends.' },
    { senderId: 'user-2', content: 'That sounds fun. Do you have a favorite trail?' }
  ]);
  console.log('Suggested question:', promptResult?.suggestedQuestion);
  assert.ok(
    promptResult?.suggestedQuestion,
    'Groq should return a suggested question'
  );

  console.log('\n3. Post-Session Feedback Test');
  const feedback = await generatePostSessionFeedback([
    { senderId: 'user-1', content: 'I started learning to cook Italian food last month.' },
    { senderId: 'user-2', content: 'What dish have you enjoyed making the most so far?' },
    { senderId: 'user-1', content: 'I made fresh pasta with my sister, and we tried three different sauces.' }
  ], 'user-1');
  console.log('Dynamic feedback metrics:', feedback);
  assert.ok(feedback && typeof feedback === 'object', 'Groq should return feedback JSON');
  assert.ok(
    'talkRatio' in feedback &&
      'questionQualityScore' in feedback &&
      'conversationBalanceScore' in feedback,
    'Feedback should include the expected communication metrics'
  );
}

runTests().catch((error) => {
  console.error('AI feature tests failed:', error);
  process.exitCode = 1;
});
