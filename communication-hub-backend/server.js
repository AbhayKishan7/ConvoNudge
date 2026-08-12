import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import dns from 'dns';
import { setupSocket } from './socket.js';
import sessionRoutes from './routes/sessionRoutes.js'; // 1. Import sessionRoutes here

dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// 2. REGISTER YOUR API ROUTE HERE:
app.use('/api/sessions', sessionRoutes);

// Socket.io Setup
const io = new Server(server, {
  cors: {
    origin: "*", // Allows requests from your Netlify frontend URL
    methods: ["GET", "POST"]
  }
});

setupSocket(io);

app.get('/', (req, res) => {
  res.send('Communication Hub Backend is Running!');
});

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.log('⚠️ WARNING: MONGO_URI is missing in your .env file!');
} else {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected Successfully'))
    .catch((err) => console.error('❌ MongoDB Connection Error:', err.message));
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});