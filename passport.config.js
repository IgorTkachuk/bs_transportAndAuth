const passport = require("passport");
const JWTStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;

const serverConfig = require('./config/server.config');
const User = require('./model/users');

const opts = {
  secretOrKey: serverConfig.jwtSecret,
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()
};

passport.use(
  new JWTStrategy(opts, async (payload, done) => {
    //  try {
      const user = User.getUserByLogin(payload.login);
      return user
      ? done(null, user)
      : done({ status: 401, message: "Token is invalid" }, null);
    //  } catch {
    //    return done(err);
    //  }
  })
);
