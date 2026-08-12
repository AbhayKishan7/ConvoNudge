import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  pseudonym: { type: String, required: true, unique: true },
  avatarUrl: { type: String, default: '' },
  communicationLevel: { 
    type: String, 
    enum: ['beginner', 'intermediate', 'advanced'], 
    default: 'beginner' 
  },
  preferredLanguage: { type: String, default: 'English' },
  interests: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('User', UserSchema);