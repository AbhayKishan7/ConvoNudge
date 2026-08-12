import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  senderId: { type: String, required: true },
  content: { type: String, required: true },
  isFlagged: { type: Boolean, default: false },
  flagReason: { type: String, default: null },
  timestamp: { type: Date, default: Date.now }
});

const ChatSessionSchema = new mongoose.Schema({
  userA: { type: String, required: true },
  userB: { type: String, required: true },
  status: { type: String, enum: ['active', 'completed', 'terminated'], default: 'active' },
  messages: [MessageSchema],
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date }
});

export default mongoose.model('ChatSession', ChatSessionSchema);