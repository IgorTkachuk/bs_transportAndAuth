const path = require("path");
const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);

const jwt = require("jsonwebtoken");
const passport = require("passport");
const bodyParser = require("body-parser");

const users = require("./users.json");
const sockets = {};
let beforeRaceTimerStarted = false;
let raceInProgress = false;
let beforeRaceTimeAmmount = 15000;
let raceInProgressAmmount = 20000;

const tracks = [
  "The first track",
  "The second track",
  "The third track",
  "The fourth track"
];

let currentTrack = 0;

require("./passport.config.js");

app.use(express.static(path.join(__dirname, "public")));
app.use(passport.initialize());
app.use(bodyParser.json());

server.listen(3000);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/race", (req, res) => {
  res.sendFile(path.join(__dirname, "race.html"));
});

app.get(
  "/track",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    res.set("Content-Type", "application/json");
    res.send({ track: tracks[currentTrack] });
    res.end();
  }
);

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

app.post("/login", (req, res) => {
  const userFromReq = req.body;
  const userInDB = users.find(user => user.login === userFromReq.login);
  if (userInDB && userInDB.password === userFromReq.password) {
    const token = jwt.sign(userFromReq, "someSecret", { expiresIn: "24h" });
    res.status(200).json({ auth: true, token });
  } else {
    res.status(401).json({ auth: false });
  }
});

io.use((socket, next) => {
  let token = socket.handshake.query.token;

  // verify token
  jwt.verify(token, "someSecret", (err, decoded) => {
    if (err) return next(err);

    socket._id = decoded.login;
    next();
  });
});

io.on("connection", socket => {
  console.log(`${socket._id} just connected`);

  sockets[socket._id] = 0;

  if (Object.keys(sockets).length > 0 && !raceInProgress) {
    startRaceTimer();
  }

  socket.on("updRaceProgress", payload => {
    const { token, message } = payload;
    const userLogin = jwt.decode(token).login;

    sockets[socket._id] = message;
    const isAllFinished = Object.keys(sockets).every(_id => {
      return sockets[_id] === 15;
    });

    if (isAllFinished) {
      raceInProgress = false;
    }

    socket.broadcast.emit("updRaceProgress", { user: userLogin, message });
    socket.emit("updRaceProgress", { user: userLogin, message });
  });

  socket.on("disconnect", reason => {
    delete socket[socket._id];
    console.log(`${socket._id} socket disconnected by reason '${reason}'`);
    io.sockets.emit("userCarCrash", { user: socket._id });
  });
});

const startRaceTimer = _ => {
  let timeBeforeRaceLeft = beforeRaceTimeAmmount;
  if (!beforeRaceTimerStarted) {
    beforeRaceTimerStarted = true;
    const beforeRaceTimer = setInterval(_ => {
      io.sockets.emit("timeBeforeRace", { time: timeBeforeRaceLeft });

      if (!timeBeforeRaceLeft) {
        clearInterval(beforeRaceTimer);
        beforeRaceTimerStarted = false;
        raceInProgress = true;
        startRaceInProgressTimer();
      }
      timeBeforeRaceLeft -= 1000;
    }, 1000);
  }
};

const startRaceInProgressTimer = _ => {
  let timeRaceInProgressLeft = raceInProgressAmmount;
  const raceInProgressTimer = setInterval(_ => {
    io.sockets.emit("timeRaceInProgress", { time: timeRaceInProgressLeft });

    if (!timeRaceInProgressLeft || !raceInProgress) {
      clearInterval(raceInProgressTimer);
      if (raceInProgress === false) {
        io.sockets.emit("raceFinishedByUser", {});
      }
      raceInProgress = false;
      currentTrack += 1;
      if (currentTrack === tracks.length) {
        currentTrack = 0;
      }
    }

    timeRaceInProgressLeft -= 1000;
  }, 1000);
};
