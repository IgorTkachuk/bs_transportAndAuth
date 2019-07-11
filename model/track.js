const tracks = require('../data/tracks.json');

let currentTrack = 0;

function getCurrentTrack () {
  return tracks[currentTrack];
}

function changeTrack () {
  currentTrack += 1;
  if (currentTrack === tracks.length) {
    currentTrack = 0;
  }
}

module.exports = {
  getCurrentTrack,
  changeTrack
};