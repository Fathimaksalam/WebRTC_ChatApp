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

// Store room states
const roomParticipants = new Map();
// Store the host (creator) of each room
const roomHosts = new Map();
// Store pending join requests (socketId -> { roomId, userId, userName })
const pendingRequests = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // 1. Initial request to join a room
  socket.on('request-join', (roomId, userId, userName) => {
    // If room doesn't exist, this user becomes the host and joins immediately
    if (!roomParticipants.has(roomId) || roomParticipants.get(roomId).size === 0) {
      roomHosts.set(roomId, socket.id);
      socket.emit('join-approved', roomId, userId, userName, true); // true = isHost
    } else {
      // Room exists, someone else is host. Send request to host.
      const hostSocketId = roomHosts.get(roomId);
      if (hostSocketId) {
        pendingRequests.set(socket.id, { roomId, userId, userName });
        io.to(hostSocketId).emit('join-request-received', {
          socketId: socket.id,
          userId,
          userName
        });
        socket.emit('waiting-for-approval');
      } else {
        // Fallback if host is missing for some reason
        socket.emit('join-rejected', 'Room host is no longer available.');
      }
    }
  });

  // 2. Host responds to the request
  socket.on('resolve-join-request', (targetSocketId, approved) => {
    const request = pendingRequests.get(targetSocketId);
    if (!request) return;

    pendingRequests.delete(targetSocketId);

    if (approved) {
      io.to(targetSocketId).emit('join-approved', request.roomId, request.userId, request.userName, false); // false = not host
    } else {
      io.to(targetSocketId).emit('join-rejected', 'The host declined your request to join.');
    }
  });

  // 3. Actual join after approval (or if host)
  socket.on('join-room', (roomId, userId, userName) => {
    socket.join(roomId);

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

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      if (roomParticipants.has(roomId)) {
        roomParticipants.get(roomId).delete(socket.id);
        if (roomParticipants.get(roomId).size === 0) {
          roomParticipants.delete(roomId);
          roomHosts.delete(roomId);
        } else if (roomHosts.get(roomId) === socket.id) {
          // If the host leaves, for now we assign a random new host
          const remaining = Array.from(roomParticipants.get(roomId).keys());
          if (remaining.length > 0) {
            const newHostId = remaining[0];
            roomHosts.set(roomId, newHostId);
            io.to(newHostId).emit('you-are-host');
          }
        }
      }

      // Cleanup pending requests from this user if they were waiting
      pendingRequests.delete(socket.id);

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
