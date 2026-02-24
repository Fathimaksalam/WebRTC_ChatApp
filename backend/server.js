const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  methods: ['GET', 'POST']
}));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST']
  }
});

// Store room states if necessary. For now, we just pass messages.
const roomParticipants = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId, userId, userName) => {
    socket.join(roomId);

    // Keep track of participants (optional for UI)
    if (!roomParticipants.has(roomId)) {
      roomParticipants.set(roomId, new Map());
    }
    roomParticipants.get(roomId).set(socket.id, { userId, userName });

    // Notify others in the room
    socket.to(roomId).emit('user-connected', userId, socket.id, userName);

    // Send existing participants to the new user
    const participants = Array.from(roomParticipants.get(roomId).entries())
      .map(([sid, data]) => ({ socketId: sid, ...data }))
      .filter(p => p.socketId !== socket.id);

    socket.emit('room-participants', participants);

    // Provide clean up on disconnect
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      if (roomParticipants.has(roomId)) {
        roomParticipants.get(roomId).delete(socket.id);
        if (roomParticipants.get(roomId).size === 0) {
          roomParticipants.delete(roomId);
        }
      }
      socket.to(roomId).emit('user-disconnected', userId, socket.id);
    });
  });

  // WebRTC Signaling
  socket.on('offer', (payload) => {
    // payload: { target: socketId, caller: socketId, sdp: RTCSessionDescription }
    io.to(payload.target).emit('offer', payload);
  });

  socket.on('answer', (payload) => {
    // payload: { target: socketId, caller: socketId, sdp: RTCSessionDescription }
    io.to(payload.target).emit('answer', payload);
  });

  socket.on('ice-candidate', (payload) => {
    // payload: { target: socketId, caller: socketId, candidate: RTCIceCandidate }
    io.to(payload.target).emit('ice-candidate', payload);
  });

  // Chat and Screen Share events
  socket.on('chat-message', (payload) => {
    // payload: { roomId, message, senderName, timestamp }
    io.to(payload.roomId).emit('chat-message', payload);
  });

  socket.on('toggle-media', (payload) => {
    // payload: { roomId, socketId, type: 'video' | 'audio' | 'screen', isEnabled }
    socket.to(payload.roomId).emit('peer-toggled-media', payload);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Socket.io WebRTC signaling server running on port ${PORT}`);
});
