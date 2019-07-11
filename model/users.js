const users = require('../data/users.json');

function getUserByLogin(login) {
  return users.find(user => user.login === login);
}

module.exports = {
  getUserByLogin
}