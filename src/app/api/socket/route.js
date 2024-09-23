import { Server } from 'socket.io';

const ioHandler = (req, res) => {
  if (!res.socket.server.io) {
    console.log('Setting up socket.io');

    const io = new Server(res.socket.server);
    res.socket.server.io = io;

    io.on('connection', (socket) => {
      console.log('A user connected');

      socket.on('join-room', ({ roomId, username }) => {
        socket.join(roomId);
        if (!rooms.has(roomId)) {
          rooms.set(roomId, { users: new Set(), code: '', messages: [] });
        }
        rooms.get(roomId).users.add(username);
        console.log(`${username} joined room ${roomId}`);

        // Send current code and chat history to the new user
        socket.emit('code-update', rooms.get(roomId).code);
        socket.emit('chat-history', rooms.get(roomId).messages);

        // Notify other users that a new user has joined
        socket.to(roomId).emit('user-joined', username);
      });

      socket.on('code-update', ({ roomId, code }) => {
        if (rooms.has(roomId)) {
          rooms.get(roomId).code = code;
          socket.to(roomId).emit('code-update', code);
        }
      });

      socket.on('chat-message', ({ roomId, username, message }) => {
        if (rooms.has(roomId)) {
          const newMessage = { username, message, timestamp: new Date() };
          rooms.get(roomId).messages.push(newMessage);
          io.to(roomId).emit('chat-message', newMessage);
        }
      });

      socket.on('disconnect', () => {
        console.log('A user disconnected');
        // Implement logic to remove user from room
        rooms.forEach((room, roomId) => {
          room.users.forEach((user) => {
            if (user === socket.id) {
              room.users.delete(user);
              socket.to(roomId).emit('user-left', user);
            }
          });
        });
      });
    });
  } else {
    console.log('socket.io already set up');
  }
  res.end();
};

export default ioHandler;
