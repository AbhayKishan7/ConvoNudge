import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import dns from 'dns';
import { setupSocket } from './socket.js';
import sessionRoutes from './routes/sessionRoutes.js';

// Force Google DNS for reliable database host resolution on cloud platforms
dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json());

// API Routes
app.use('/api/sessions', sessionRoutes);

// Health Check Endpoint
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'online',
    message: 'Communication Hub Backend is Running!' 
  });
});

// Socket.io Setup
const io = new Server(server, {
  cors: {
    origin: "*", // Allows requests from your Netlify frontend URL
    methods: ["GET", "POST"]
  }
});

// Attach Socket.io event handlers
setupSocket(io);

// MongoDB Connection (Support both MONGODB_URI and MONGO_URI)
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!mongoUri) {
  console.warn('⚠️ WARNING: Neither MONGODB_URI nor MONGO_URI is defined in environment variables!');
} else {
  mongoose.connect(mongoUri)
    .then(() => console.log('✅ MongoDB Connected Successfully'))
    .catch((err) => console.error('❌ MongoDB Connection Error:', err.message));
}

// Start HTTP & Socket Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Handle graceful shutdown for cloud hosting platforms (Render)
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed.');
      process.exit(0);
    });
  });
});