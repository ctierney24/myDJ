//Authentication route for spotify
var router = require('express').Router();
var passport = require('passport');

//var querystring = require('querystring');
//var request = require('request'); // "Request" library


//login page
router.get('/', function(req, res) {
  res.render('login', { user: req.user });
});

// GET /auth/spotify
//redirects to spotify to agree to access
router.get(
  '/spotify',
  passport.authenticate('spotify', {
    scope: ['user-modify-playback-state', 'user-read-email', 'user-read-private', 'playlist-read-private', 'playlist-read-collaborative'],
    showDialog: true
  }),
  function(req, res) {
    // The request will be redirected to spotify for authentication, so this
    // function will not be called.
  }
);

// GET /auth/spotify/callback
//handle spotify callback after agreeing to use app
router.get(
  '/callback',
  passport.authenticate('spotify', { failureRedirect: '/login' }),
  function(req, res) {
    console.log(req.user);
    res.redirect('/land');
  }
);

router.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});


module.exports = router;
