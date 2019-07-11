const path = require("path");
const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);

const jwt = require("jsonwebtoken");
const passport = require("passport");
const bodyParser = require("body-parser");

const User = require('./model/users');
const Track = require('./model/track');
const RaceConfig = require('./config/race.config');
const ServerConfig = require('./config/server.config')

const Race = require('./controller/race');

require("./passport.config.js");

const sockets = {};
let beforeRaceTimerStarted = false;
let raceInProgress = false;

app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json());
app.use(passport.initialize());

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

app.post("/login", (req, res) => {
  const userFromReq = req.body;
  const userInDB = User.getUserByLogin(userFromReq.login);
  if (userInDB && userInDB.password === userFromReq.password) {
    const token = jwt.sign(userFromReq, ServerConfig.jwtSecret, { expiresIn: "24h" });
    res.status(200).json({ auth: true, token });
  } else {
    res.status(401).json({ auth: false });
  }
});

app.get("/race", (req, res) => {
  res.sendFile(path.join(__dirname, "race.html"));
});

app.get(
  "/track",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    res.set("Content-Type", "application/json");
    res.send({ track: Track.getCurrentTrack() });
    res.end();
  }
);

server.listen(3000, 'localhost', () => console.log('Server started on port 3000'));

const race = new Race(io);
// const timer = race.newTimer(RaceConfig.TIMER_TYPE_WAITING_FOR_START);
// timer.start();

// io.use((socket, next) => {
//   let token = socket.handshake.query.token;

//   // verify token
//   jwt.verify(token, ServerConfig.jwtSecret, (err, decoded) => {
//     if (err) return next(err);

//     socket._id = decoded.login;
//     next();
//   });
// });

// io.on("connection", socket => {
//   console.log(`${socket._id} just connected`);

//   sockets[socket._id] = 0;

//   if (Object.keys(sockets).length > 0 && !raceInProgress) {
//     startRaceTimer();
//   }

//   socket.on("updRaceProgress", payload => {
//     const { token, message } = payload;
//     const userLogin = jwt.decode(token).login;

//     sockets[socket._id] = message;
//     const isAllFinished = Object.keys(sockets).every(_id => {
//       return sockets[_id] === 15;
//     });

//     if (isAllFinished) {
//       raceInProgress = false;
//     }

//     socket.broadcast.emit("updRaceProgress", { user: userLogin, message });
//     socket.emit("updRaceProgress", { user: userLogin, message });
//   });

//   socket.on("disconnect", reason => {
//     delete socket[socket._id];
//     console.log(`${socket._id} socket disconnected by reason '${reason}'`);
//     io.sockets.emit("userCarCrash", { user: socket._id });
//   });
// });




// const startRaceTimer = _ => {
//   let timeBeforeRaceLeft = RaceConfig.BEFORE_RACE_TIME_AMMOUNT;
//   if (!beforeRaceTimerStarted) {
//     beforeRaceTimerStarted = true;
//     const beforeRaceTimer = setInterval(_ => {
//       io.sockets.emit("timeBeforeRace", { time: timeBeforeRaceLeft });

//       if (!timeBeforeRaceLeft) {
//         clearInterval(beforeRaceTimer);
//         beforeRaceTimerStarted = false;
//         raceInProgress = true;
//         startRaceInProgressTimer();
//       }
//       timeBeforeRaceLeft -= 1000;
//     }, 1000);
//   }
// };

// const startRaceInProgressTimer = _ => {
//   let timeRaceInProgressLeft = RaceConfig.RACE_TIME_LIMIT;
//   const raceInProgressTimer = setInterval(_ => {
//     io.sockets.emit("timeRaceInProgress", { time: timeRaceInProgressLeft });

//     if (!timeRaceInProgressLeft || !raceInProgress) {
//       clearInterval(raceInProgressTimer);
//       if (raceInProgress === false) {
//         io.sockets.emit("raceFinishedByUser", {});
//       }
//       raceInProgress = false;
//       Track.changeTrack
//     }

//     timeRaceInProgressLeft -= 1000;
//   }, 1000);
// };
