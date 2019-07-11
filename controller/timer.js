const ServerConfig = require('../config/server.config');
const RaceConfig = require('../config/race.config');

// HOF
function wrapper(fn, changeStatFn) {
  const {tick} = this;
  let limit = this.limit;

  return () => {
    limit -= tick;
    
    if(limit >= 0) {
      fn(limit);
    } else {
      clearInterval(this.interval);
      changeStatFn();
    }
  }
}

class Timer {
  constructor(conf) {
    this.tick = ServerConfig.TIMER_TICK;
    const {io, competitorsList, changeStatFn} = conf;

    this.io = io;
    this.changeStatFn = changeStatFn;
    this.competitorsList = competitorsList;
  }

  // start() {
  //   const fn = wrapper.call(this, this.payload.bind(this), this.changeStatFn);
  //   this.interval = setInterval(fn, this.tick);
  // }
}

class TimerRaceWaiting extends Timer{
  constructor(conf) {
    super(conf);

    this.limit = RaceConfig.BEFORE_RACE_TIME_AMMOUNT;
    this.room = RaceConfig.ROOM_WAITING;
  }

  payload(time){
    this.io.to(this.room).emit(RaceConfig.MSG_STAT_WAITING_FOR_START, {
      time,
      competitors: Array.from(this.competitorsList).map(socket => { return socket._id})
    });
  }

  start() {
    const fn = wrapper.call(this, this.payload.bind(this), this.changeStatFn);
    this.interval = setInterval(fn, this.tick);
  }
}

class TimerInProcess extends Timer{
  constructor(conf) {
    super(conf);

    this.limit = RaceConfig.RACE_TIME_LIMIT;
    this.room = RaceConfig.ROOM_RACING;
  }

  payload(time){
    this.io.to(this.room).emit(RaceConfig.MSG_STAT_IN_PROGRESS, {
      time,
      competitors: Array.from(this.competitorsList).map(socket => { return socket._id})
    });
  }
}

class TimerRewarding extends Timer{
  constructor(conf) {
    super(conf);

    this.limit = RaceConfig.TIME_FOR_REWARDING;
    this.room = RaceConfig.ROOM_RACING;
  }

  payload(time){
    this.io.to(this.room).emit(RaceConfig.MSG_STAT_REWARDING, {
      time,
      competitors: Array.from(this.competitorsList).map(socket => { return socket._id})
    });
  }
}

module.exports = {
  TimerRaceWaiting,
  TimerInProcess,
  TimerRewarding
};