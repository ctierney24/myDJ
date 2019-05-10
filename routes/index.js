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

//search spotify and display results
router.get('/search', function(req, res, next){
  //Dont use spotifyApi wrapper to search all types of objects
  var options = {
    url: 'https://api.spotify.com/v1/search'+
          '?' + require('url').parse(req.url).query +
          '&type=album,track,playlist,artist' +
          '&market=from_token' +
          '&limit=5',
    headers: {
      'Authorization': 'Bearer '+ req.session.access_token
    }
  };

  var searchCallback = function (error, response, body){
    if (!error && response.statusCode == 200){
      var info = JSON.parse(body);
      res.render('index', {results: info});
    } else {
      console.log(response);
      console.log(error);
      res.redirect('/land');
    }
  }

  request(options, searchCallback);

});



//landing page after login
router.get('/land', authCheck, function(req, res, next){
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

  //get first 50 plalists and render index
  var getPlaylists = function(userId){
    spotifyApi.getUserPlaylists(userId, { limit: 50, offset: 0 })
    .then(function(data){
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
