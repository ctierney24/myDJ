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
      res.render('index', {results: info, seeds: req.session.seeds});
    } else {
      console.log(error);
      res.redirect('/land');
    }
  }

  request(options, searchCallback);

});

//buildPlaylist
//construct request with song and artist seeds to return recommendations
//then create playlist from recommendations and display as playable
//add tunable target artributes, possibly from agregating playlist data
router.get('/buildPlaylist', authCheck, function(req, res){
  var seeds = req.session.seeds,
      artists = 'seed_artists=',
      tracks = 'seed_tracks=';


  for(var i=0; i<seeds.length; i++){
    if(seeds[i].cat=='artist'){
      artists += (seeds[i].id + ',');
    } else if (seeds[i].cat=='track'){
      tracks += (seeds[i].id + ',');
    }
  }

  //trim trailing commas
  artists = artists.slice(0, artists.length-1);
  tracks = tracks.slice(0, tracks.length-1);

  var options = {
    url: 'https://api.spotify.com/v1/recommendations?'+
          artists + '&' + tracks +
          '&limit=100',
    headers: {
      'Authorization': 'Bearer '+ req.session.access_token
    }
  };

  var recCallback = function (error, response, body){
    if (!error && response.statusCode == 200){
      var info = JSON.parse(body);
      //here make playlist then redirect to play
      console.log(info);
      res.redirect('/land');
    } else {
      console.log(error);
      res.redirect('/land');
    }
  };

  request(options, recCallback);
});


//add search results to playlist seed list
router.get('/addItem', authCheck, function(req, res, next){
  var seed = {id: req.query.id, name:req.query.name, cat:req.query.cat};

  if (req.session.seeds){
    req.session.seeds.push(seed);
    req.session.seeds=trimSeeds(req.session.seeds);
  }else{
    req.session.seeds=[];
    req.session.seeds.push(seed);}

  //if length exceeds 5, throw out first item added
  function trimSeeds(seeds){
    if (seeds.length>5){
      console.log(seeds.slice(1,5));
      return seeds.slice(1,5);
    } else{ return seeds;}
  }

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
  console.log(req.session.seeds);
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

module.exports = router;
