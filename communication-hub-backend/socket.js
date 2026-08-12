import ChatSession from './models/ChatSession.js';
import { checkSafetyAndPII, generateConversationPrompt } from './aiService.js';

let waitingQueue = [];

export function setupSocket(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 New client connected: ${socket.id}`);

    // 1. JOIN MATCHMAKING QUEUE
    socket.on('join_queue', (userData) => {
      const userObj = {
        socketId: socket.id,
        userId: userData.userId,
        pseudonym: userData.pseudonym,
        level: userData.communicationLevel || 'beginner'
      };

      const exists = waitingQueue.find(u => u.socketId === socket.id);
      if (!exists) {
        waitingQueue.push(userObj);
        console.log(`👤 ${userData.pseudonym} joined queue.`);
      }

      matchUsers(io);
    });

    // 2. REAL-TIME SEND MESSAGE
    socket.on('send_message', async ({ sessionId, senderId, content }) => {
      try {
        const safetyResult = await checkSafetyAndPII(content);
        if (!safetyResult.isSafe) {
          socket.emit('message_blocked', {
            reason: `Message blocked: ${safetyResult.reason}`
          });
          return;
        }

        const session = await ChatSession.findById(sessionId);
        if (!session || session.status !== 'active') return;

        const newMessage = { senderId, content, timestamp: new Date() };
        session.messages.push(newMessage);
        await session.save();

        io.to(sessionId).emit('receive_message', {
          _id: session.messages[session.messages.length - 1]._id,
          senderId,
          content,
          timestamp: newMessage.timestamp
        });

        if (session.messages.length % 4 === 0) {
          const aiSuggestion = await generateConversationPrompt(session.messages);
          if (aiSuggestion) {
            io.to(sessionId).emit('ai_copilot_hint', aiSuggestion);
          }
        }
      } catch (error) {
        console.error('Error handling send_message:', error);
      }
    });

    // 3. END CHAT MANUALLY
    socket.on('end_chat_session', ({ sessionId }) => {
      socket.to(sessionId).emit('partner_disconnected');
      socket.leave(sessionId);
    });

    // 4. DISCONNECT / TAB CLOSED
    socket.on('disconnecting', () => {
      for (const room of socket.rooms) {
        if (room !== socket.id) {
          socket.to(room).emit('partner_disconnected');
        }
      }
    });

    socket.on('disconnect', () => {
      waitingQueue = waitingQueue.filter(u => u.socketId !== socket.id);
    });
  });
}

async function matchUsers(io) {
  if (waitingQueue.length < 2) return;

  const userA = waitingQueue.shift();
  const userB = waitingQueue.shift();

  try {
    const newSession = await ChatSession.create({
      userA: userA.userId,
      userB: userB.userId,
      status: 'active',
      messages: []
    });

    const roomId = newSession._id.toString();
    const socketA = io.sockets.sockets.get(userA.socketId);
    const socketB = io.sockets.sockets.get(userB.socketId);

    if (socketA && socketB) {
      socketA.join(roomId);
      socketB.join(roomId);

      socketA.emit('match_found', {
        sessionId: roomId,
        partnerPseudonym: userB.pseudonym,
        partnerId: userB.userId,
        myUserId: userA.userId
      });

      socketB.emit('match_found', {
        sessionId: roomId,
        partnerPseudonym: userA.pseudonym,
        partnerId: userA.userId,
        myUserId: userB.userId
      });
    }
  } catch (error) {
    console.error('Error creating match session:', error);
  }
}