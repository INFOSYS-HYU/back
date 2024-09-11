const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { findUserById, findOrCreateUser } = require('../userDBC');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log(profile)
      const user = await findOrCreateUser({
        googleId: profile.id,
        email: profile.emails[0].value,
        name: profile._json.name,
      });
      return done(null, user);
    } catch (error) {
      console.log(error)
      return done(error, null);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.googleId);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await findUserById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;