var passport = require('passport');
var SpotifyStrategy = require('passport-spotify/lib/passport-spotify/index').Strategy;
const User = require('./user-model');

const keys = require('./keys');
//const User = require(''../models/user-model');

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session. Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing. However, since this example does not
//   have a database of user records, the complete spotify profile is serialized
//   and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
  });

// Use the SpotifyStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, expires_in
//   and spotify profile), and invoke a callback with a user object.
passport.use(
  new SpotifyStrategy(
    {
      clientID: keys.spotify.clientID,
      clientSecret: keys.spotify.clientSecret,
      callbackURL: 'http://localhost:8888/auth/callback',
      passReqToCallback: true
    },
    function(req, accessToken, refreshToken, expires_in, profile, done) {
      req.session.access_token=accessToken;
      req.session.refresh_token=refreshToken;
      //search for exitsting usersRouter
      User.findOne({spotifyID: profile.id}).then(
        function(currentUser){
          if(currentUser){
            done(null, currentUser);
          } else{
            new User({
              spotifyID: profile.id,
              username: profile.displayName
            }).save().then(function(newUser){
              console.log('New user created '+ newUser);
              done(null, newUser);
            });
          }
        });
      }
    )
);
