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
  console.log("Serializing user:", user); // 로그 추가
  done(null, user.User_UID);
});


passport.deserializeUser(async (googleId, done) => {
  try {
    const user = await findUserById(googleId);
    if (!user) {
      return done(new Error("User not found"));
    }
    console.log("Deserialized user:", user); // 로그 추가
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});



module.exports = passport;