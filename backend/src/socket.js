let io;

module.exports = {
  init: (server) => {
    io = require('socket.io')(server, {
      cors: {
        origin: '*',
      },
    });

    io.on('connection', (socket) => {
      console.log('User connected:', socket.id);
    });

    return io;
  },

  getIO: () => {
    if (!io) {
      throw new Error('Socket.io belum diinisialisasi');
    }
    return io;
  },
};
