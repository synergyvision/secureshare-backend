//var credentials = require('../keys.json');
var express = require("express");
var admin = require("firebase-admin");
var api = express.Router();

api.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.header("Access-Control-Allow-Headers", "Origin, Authorization, X-Requested-With, Content-Type, Accept");
    next();
  });

var publicKey = process.env.server_public_key;
console.log(publicKey)
api.get('/', function (req,res){
    //publickey = credentials.server_public_key;
    res.status(200).json({
        status:200,
        message: 'got server public key',
        publickey: publickey
    })
    
})

module.exports = api;