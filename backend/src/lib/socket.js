import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"], // Update for production if needed
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Store multiple socket IDs per user
const userSocketMap = {}; // { userId: [socketId1, socketId2, ...] }

// Helper function to register user socket
function registerUserSocket(userId, socket) {
  socket.userId = userId;

  if (!userSocketMap[userId]) {
    userSocketMap[userId] = [];
  }

  if (!userSocketMap[userId].includes(socket.id)) {
    userSocketMap[userId].push(socket.id);
  }

  // Emit updated online users to all clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));
  console.log("📡 Online users:", Object.keys(userSocketMap));
}

// Optional helper to get a user's first socket ID
export function getReceiverSocketId(userId) {
  return userSocketMap[userId]?.[0];
}

// Main socket connection handler
io.on("connection", (socket) => {
  console.log("✅ A user connected:", socket.id);

  // Initial userId from handshake query
  const userIdFromQuery = socket.handshake.query.userId;
  if (userIdFromQuery) {
    registerUserSocket(userIdFromQuery, socket);
  }

  // Listen for explicit user-connected event from client
  socket.on("user-connected", (userId) => {
    registerUserSocket(userId, socket);
  });

  // Handle user disconnect
  socket.on("disconnect", () => {
    console.log("❌ A user disconnected:", socket.id);

    const userId = socket.userId;
    if (userId && userSocketMap[userId]) {
      // Remove this socket ID from the user's list
      userSocketMap[userId] = userSocketMap[userId].filter(id => id !== socket.id);

      // If no sockets left, remove user from map
      if (userSocketMap[userId].length === 0) {
        delete userSocketMap[userId];
      }

      // Emit updated online users
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
      console.log("📡 Updated online users:", Object.keys(userSocketMap));
    }
  });
});

export { io, app, server };