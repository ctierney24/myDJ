var express = require('express');
var querystring = require('querystring');
var request = require('request');
var passport = require('passport');
var SpotifyWebApi = require('spotify-web-api-node');
var router = express.Router();

const authCheck = function(req, res, next){
  if(!req.user){
    res.redirect('/auth/spotify');
  } else {
    next();
  }
};

/* GET home page. */
router.get('/', authCheck, function(req, res) {
  res.render('index', { user: req.user });
});





//landing page after login
router.get('/land', authCheck, function(req, res, next){
  console.log(req.session);
  //init api and set access token from req
  var spotifyApi = new SpotifyWebApi();
  spotifyApi.setAccessToken(req.session.access_token);
  spotifyApi.setRefreshToken(req.session.refresh_token);
  //get username to run other calls before rest of scripts execute
  spotifyApi.getMe()
  .then(function(data){
    getPlaylists(data.body.id);
    },function(err){
      console.log('Error fetching userId', err);
      res.end();
    })

  //get fitst 20 plalists and render index
  var getPlaylists = function(userId){
    spotifyApi.getUserPlaylists(userId)
    .then(function(data){
      console.log(data.body);
      res.render('index', {playlists:data.body});
    },function(err){
      console.log('Error retriving playlists', err);
      res.end();
    })
  }


});

//play a playlist clicked by user
router.get('/play', function(req, res, next){
  var spotifyApi = new SpotifyWebApi();
  spotifyApi.setAccessToken(req.session.access_token);
  spotifyApi.setRefreshToken(req.session.refresh_token);
  var playlistId=req.query.id;

  //get username, then call player
  spotifyApi.getMe()
  .then(function(data){
    playSelected(data.body.id);
    },function(err){
      console.log('Error fetching userId', err);
      res.end();
    })

  var playSelected = function(userId){
    var uri = 'https://open.spotify.com/embed/user/'
    + userId + '/playlist/'+ playlistId;
    res.render('player', {uri: uri});
  }
});

module.exports = router;
