var express = require("express");
var firebase= require("firebase");

var api = express.Router();

api.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Authorization, Content-Type, Accept");
    next();
  });

api.get('/', function (req, res){

    var auth = firebase.auth();

    auth.signOut().then(function() {
        res.json({
            status:200,
            message: 'User has logged out succesfully'
        })
      }).catch(function(error) {
         res.json({
             status: error.code,
             message: error.essage
            
         })
      });
})


module.exports = api;