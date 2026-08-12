import mongoose from 'mongoose';

const FeedbackSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatSession', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  analytics: {
    talkRatio: { type: Number },
    questionQualityScore: { type: Number, min: 1, max: 10 },
    conversationBalanceScore: { type: Number, min: 1, max: 10 },
    strengths: [{ type: String }],
    areasForImprovement: [{ type: String }],
    suggestedPhrasings: [{ type: Object }]
  },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Feedback', FeedbackSchema);