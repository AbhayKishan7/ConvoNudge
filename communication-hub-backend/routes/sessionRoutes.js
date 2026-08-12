import express from 'express';
import ChatSession from '../models/ChatSession.js';
import { generatePostSessionFeedback } from '../aiService.js';

const router = express.Router();

router.post('/end-session', async (req, res) => {
  try {
    const { sessionId, userId } = req.body;

    const session = await ChatSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Mark session completed
    session.status = 'completed';
    session.endedAt = new Date();
    await session.save();

    // Generate AI analytics
    const feedback = await generatePostSessionFeedback(session.messages, userId);

    return res.json({
      success: true,
      feedback: {
        analytics: feedback || {
          questionQualityScore: 7,
          conversationBalanceScore: 8,
          strengths: ["Active participation", "Friendly tone"],
          areasForImprovement: ["Try asking more open-ended questions"]
        }
      }
    });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({ error: 'Failed to generate feedback' });
  }
});

export default router;