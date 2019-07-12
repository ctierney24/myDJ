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



//buildPlaylist
//construct request with song and genre seeds to return recommendations
//currently only set up for artist seeds
router.get('/buildPlaylist', authCheck, function(req, res){

  var seedArr = req.session.seeds;
  var seedStr = '&seed_artists=';

  seedArr.forEach(function(seed){
    seedStr += (seed.id+',');
  });
  //remove trailing comma
  seedStr=seedStr.slice(0, -1);

  var options = {
    url: 'https://api.spotify.com/v1/recommendations'+
          '?limit=10' + seedStr,
    headers: {
      'Authorization': 'Bearer '+ req.session.access_token
    }
  };

  var reccCallback= function(error, response, body){

    if (!error && response.statusCode == 200){

      req.session.reccs = (JSON.parse(body));
      console.log(body);
      res.render('reccs');
    } else {
      console.log(error);
      res.redirect('/land');
    }
  }


  request(options, reccCallback);
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
      res.render('index', {results: info, seeds: req.session.seeds});
    } else {
      console.log(error);
      res.redirect('/land');
    }
  }

  request(options, searchCallback);

});

//add search results to playlist seed list
router.get('/addItem', authCheck, function(req, res, next){
  var seed = {id: req.query.id, name:req.query.name};

  if (req.session.seeds){
    req.session.seeds.push(seed);
  }else{
    req.session.seeds=[];
    req.session.seeds.push(seed);}
  res.redirect('/land');
});

//remove item from playlist Seeds
router.post('/removeItem', authCheck, function(req, res){
  var seeds= req.session.seeds;
  var deleteID= req.query.id;
  for(var i=0; i<seeds.length; i++){
    if(seeds[i].id == deleteID){
      seeds.splice(i, 1);
    }
  }
  req.session.seeds=seeds;
  res.redirect('/land');
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
      res.render('index', {playlists:data.body, seeds:req.session.seeds});
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

//play track of associated play button from reccomendations
router.get('/playOne', function(req, res, next){
  var trackURI= req.query.uri;
  var options = {
    url: 'https://api.spotify.com/v1/me/player/play',
    method: 'PUT',
    json: true,
    body: {
      'uris': [trackURI]
    },
    headers: {
      'Authorization': 'Bearer '+ req.session.access_token
    }
  };

  console.log('playOptions:     '+JSON.stringify(options));

  const playOneCallback = function (error, response){
    if (!error && response.statusCode == 200){
      res.end();
    } else {
      console.log('ERROR');
      console.log(response.statusCode);
      res.render('reccs');
    }
  }
  request(options, playOneCallback);

})

//play current track on active device
router.get('/playAll', function(req, res, next){
  var options = {
    url: 'https://api.spotify.com/v1/me/player/play',
    method: 'PUT',
    headers: {
      'Authorization': 'Bearer '+ req.session.access_token
    }
  };

  const playAllCallback = function (error, response){
    if (!error && response.statusCode == 200){
      res.end();
    } else {
      console.log(error);
      res.end();
    }
  }
  request(options, playAllCallback);

})
module.exports = router;
