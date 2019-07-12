const jwt = require("jsonwebtoken");
const ServerConfig = require('../config/server.config');
const RaceConfig = require('../config/race.config');
const Timer = require('./timer');

class Race {
  constructor (io) {
    this.io = io;
    this.state = {
      stat: RaceConfig.RACE_STAT_WAITING_FOR_START,
    }
    this.state.allSockets = new Set();

    this.init();
  }

  init() {
    this.io.use(this.updSocketWithLogin);
    this.io.on('connection', this.newCompetitor.bind(this));
    this.currentTimer = this.newTimer(RaceConfig.TIMER_TYPE_SEQ[this.state.stat])
    this.currentTimer.start();

    setInterval(() => {
      console.log( 'Current stat of race', this.state.stat);
    }, ServerConfig.TIMER_TICK);
  }

  updSocketWithLogin(socket, next) {
    let token = socket.handshake.query.token;
  
    // verify token
    jwt.verify(token, ServerConfig.jwtSecret, (err, decoded) => {
      if (err) return next(err);
  
      socket._id = decoded.login;
      next();
    });
  }

  newCompetitor(socket) {
    console.log(`${socket._id} just connected`);

    socket._room = RaceConfig.ROOM_WAITING;
    this.state.allSockets.add(socket);
    socket.join(RaceConfig.ROOM_WAITING);

    socket.on("disconnect", this.leaveCompetitor.bind(this, socket));
    socket.on('SCORE', this.processScore(socket));
  }

  leaveCompetitor(socket, reason) {
    this.state.allSockets.delete(socket);
    console.log(`${socket._id} socket disconnected by reason '${reason}'`);
    this.io.to(socket._room).emit(RaceConfig.MSG_COMPETITOR_LEAVE, { user: socket._id });
  }

  processScore(socket) {

  }

  //Фабрика
  newTimer(timerType) {
    const timerConf = {
      io: this.io,
      competitorsList: this.state.allSockets,
      changeStatFn: this.nextRaceState.bind(this)
    }

    switch (timerType) {
      case RaceConfig.TIMER_TYPE_WAITING_FOR_START:
        return new Timer.TimerRaceWaiting(timerConf);
      case RaceConfig.TIMER_TYPE_IN_PROGRESS:
        return new Timer.TimerInProcess(timerConf);
      case RaceConfig.TIMER_TYPE_REWARDING:
        return new Timer.TimerRewarding(timerConf);
    }
  }

  nextRaceState(){
    console.log('nextRaceState invoked');
    if(this.state.stat === RaceConfig.RACE_STAT_SEQ.length - 1) {
      this.state.stat = RaceConfig.RACE_STAT_WAITING_FOR_START;
    } else {
      this.state.stat = RaceConfig.RACE_STAT_SEQ[this.state.stat + 1];
    }

    if(this.state.stat == RaceConfig.RACE_STAT_IN_PROGRESS) {
      //Перевести все сокеты (this.state.allSockets) в комнату ROOM_RACING
      this.state.allSockets.forEach(socket => {
        socket.leave(RaceConfig.ROOM_WAITING);
        socket.join(RaceConfig.ROOM_RACING);
      });
    }

    if(this.state.stat == RaceConfig.RACE_STAT_WAITING_FOR_START) {
      //Перевести все сокеты (this.state.allSockets) в комнату ROOM_WAITING
      this.state.allSockets.forEach(socket => {
        socket.leave(RaceConfig.ROOM_RACING);
        socket.join(RaceConfig.ROOM_WAITING);
      });
    }

    this.currentTimer = this.newTimer(RaceConfig.TIMER_TYPE_SEQ[this.state.stat]);
    this.currentTimer.start();
  }
}

module.exports = Race;