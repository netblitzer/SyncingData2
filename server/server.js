const http = require('http');
const fs = require('fs');
const socketio = require('socket.io');

const utils = require('./utils.js');
const Room = require('./Room.js');

const time = new Date();

const port = process.env.PORT || process.env.NODE_PORT || 3000;

const handler = (req, res) => {
  fs.readFile(`${__dirname}/../client/index.html`, (err, data) => {
    // if err, throw it for now
    if (err) {
      throw err;
    }
    res.writeHead(200);
    res.end(data);
  });
};

/* const onRequest = (request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html' });
  response.write(index);
  response.end();
};*/

const app = http.createServer(handler).listen(port);

console.log(`Listening on localhost:${port}`);


// * ISSUES *//
//    Server doesn't care if two users have the same name
//    Failure states are built in but not used


// pass in the http server into socketio and grab the websocket server
const io = socketio(app);

// object to hold all of our connected users
// const users = { };

// array of all the rooms on the server
  // rooms are created randomly OR when a player joins a specific room
    // rooms are limited to 4 players
    // private rooms are set by players inputting a specific name in
    // random rooms are set by players joining any room
const rooms = { private: {}, public: {} };

// function that returns a random room name if it can find one that's not filled
  // if it can't find one, it will generate a new room
const findRandomRoom = () => {
  const keys = Object.keys(rooms.public);

  if (keys.length === 0) {
    // no rooms on the server to publicly join
    const name = utils.randRoomName();
    rooms.public[name] = new Room(name);
    return name;
  }
    // return the first empty room
  for (let i = 0; i < keys.length; i++) {
    if (!rooms.public[keys[i]].isFull()) {
      return keys[i];
    }
  }

    // if no rooms were found to be empty, make a new one
  const name = utils.randRoomName();
  rooms.public[name] = new Room(name);
  return name;
};

// * Socket data structure * //
//    socket
//    \_userData
//      |_info          stores user information (transferred once)
//      | |_id
//      | |_name
//      | |_color
//      | \_room
//      |_gameData      stores user's synched game information (transferred constantly)
//      | |_lastUpdate
//      | |_a_x
//      | |_a_y
//      | |_b_x
//      | |_b_y
//      | |_c_x
//      | \_c_y
//      \_clientData    stores user's client game information (transferred once)
//        |_alpha
//        |_x
//        \_y


// * Joined Handler * //
  // This handler triggers when a player joins a room, or tries to
    // The player doesn't really "connect" to the server until this happens
    // This handler will create new rooms if needed
const onJoined = (sock) => {
  const socket = sock;

  // data object should come with
    // name: string of the chosen name (optional)
    // room: string of the chosen room (optional)
  // socket.on('join', (data) => {
    // new user to set up and join
  const newUser = { };

    // information about the user that stays the same throughout their time in the room
      // this is info like their name and color
      // this info only gets transferred once to each member of the room
  newUser.info = { };

    // information about the user that changes throughout the game
      // this info gets transferred all the time once the game starts
  newUser.gameData = { };

    // information about the user that affects game data
      // this info only gets transferred once, but affects the game data
      // things in this object change clientside, but aren't corrected by the server
  newUser.clientData = { };

    // set the id of the user (should always be unique)
  newUser.info.id = socket.id;

    // set "unique" name if they don't have one
//    if (!data.name) {
  newUser.info.name = utils.randName(socket.id);
//    } else {
//      newUser.info.name = data.name;
//    }

    // assign them a random color for now
  newUser.info.color = utils.randCol();

    // set some stuff that will change clientside but never be transferred again
  newUser.clientData.alpha = 0.05;
  newUser.clientData.x = 0;
  newUser.clientData.y = 0;

    // set the game data
  newUser.gameData.lastUpdate = time.getTime();
      // using three frame lerping
  newUser.gameData.a_x = 0;
  newUser.gameData.a_y = 0;
  newUser.gameData.b_x = 0;
  newUser.gameData.b_y = 0;
  newUser.gameData.c_x = 0;
  newUser.gameData.c_y = 0;

    // assign the user a random room
      // later we'll assign them a room based on where they wanted to go
      // this will send the 'joined' message to the user
  const roomToJoin = findRandomRoom();
  newUser.info.room = roomToJoin;
  socket.userData = newUser;
  rooms.public[roomToJoin].addUser(socket);

    // final steps
  console.log(`${newUser.info.name} joined ${newUser.info.room}`);
  // });
};

// * Emote Handler * //
  // This handler triggers when a player emotes in the game
const onEmote = (sock) => {
  const socket = sock;

  socket.on('emote', () => {

  });
};

const onMove = (sock) => {
  const socket = sock;

  socket.on('moveSend', (data) => {
    const t = new Date();

    socket.userData.gameData = data.gameData;
    socket.userData.gameData.lastUpdate = t.getTime();

    socket.broadcast.to(socket.userData.info.room).emit('moveUpdate', {
      info: { id: socket.id },
      gameData: socket.userData.gameData,
    });
  });
};

const onDisconnect = (sock) => {
  const socket = sock;

  socket.on('disconnect', () => {
    if (socket.userData === null) {
      console.log(`${socket.id} disconnected with no data`);
      return;
    }

    const status = rooms.public[socket.userData.info.room].removeUser(socket);

    console.log(`${socket.userData.info.name} disconnected and left the room`);
    console.log(`Users left in room: ${rooms.public[socket.userData.info.room].getUserCount()}`);

    if (status === 0) {
      delete rooms.public[socket.userData.info.room];
      console.log(`Deleting room ${socket.userData.info.room}`);
    }
  });
};


io.sockets.on('connection', (socket) => {
  console.log('Connection started');

  onJoined(socket);
  onEmote(socket);
  onMove(socket);
  onDisconnect(socket);
});


console.log('Websocket server started.');
