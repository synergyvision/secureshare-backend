var express = require("express");
var firebase= require("firebase");
var admin = require("firebase-admin");
const Multer = require('multer');

var bodyParser = require("body-parser");

var api = express.Router();
var {Storage} = require('@google-cloud/storage');

api.use(bodyParser.urlencoded({ extended: false }));

api.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

  var gcs = new Storage({
    projectId: 'vision-sharekey',
    keyFilename: './credentials.json'
  })

  const multer = Multer({
    storage: Multer.MemoryStorage,
    limits: {
      fileSize: 5 * 1024 * 1024 // no larger than 5mb
    }
  });

const bucket = gcs.bucket("gs://vision-sharekey.appspot.com");

api.post('/', function (req, res){
  firebase.auth().onAuthStateChanged( function (user){
    if (user){
      console.log(req)
      let files = req.body.file;
      console.log(files)
      bucket.upload('', function(err, file) {
        if (!err) {
          // "zebra.jpg" is now in your bucket.
        }
      });
    }else{
      res.status(401).json({
        status: 401,
        message: 'You need tp log in to access content'
      })
    }
  })
})

module.exports = api;  