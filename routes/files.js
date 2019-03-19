var express = require("express");
var format = require('util').format;
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

  const multer = Multer({
    storage: Multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024 // no larger than 5mb, you can change as needed.
    }
  });
  

api.post('/files', multer.single('file'), (req, res) => {
  firebase.auth().onAuthStateChanged( function (user){
    if (user){
      uid = req.body.uid;
      var bucket = admin.storage().bucket();
      var blob = bucket.file(req.file.originalname)
      var blobStream = blob.createWriteStream();

      blobStream.on('error', (error) => {
        console.log(error);
      })

      blobStream.on('finish', () => {
        // The public URL can be used to directly access the file via HTTP.
        const publicUrl = format(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);
        admin.firestore().collection('Users').doc(uid).collection('Files').add({
          link: publicUrl,
          name: req.file.originalname
        }).then(function (){
            res.status(200).json({
              status: 200,
              message: 'File received and uploaded'
            })
            console.log('File uploaded')
        }).catch(function (error){
            res.status(400).json({
              status: error.code,
              message: error.message
            })
            console.log('Error code: ' + error.code + ', message' + error.message)
        })
      });
    
      blobStream.end(req.file.buffer);

    }else{
      res.status(401).json({
        status: 401,
        message: 'You need to log in to access content'
      })
    }
  })
})

api.post('/images', multer.single('file'), (req, res) => {
  firebase.auth().onAuthStateChanged( function (user){
    if (user){
      uid = req.body.uid;
      var bucket = admin.storage().bucket();
      var blob = bucket.file(req.file.originalname)
      var blobStream = blob.createWriteStream();

      blobStream.on('error', (error) => {
        console.log(error);
      })

      blobStream.on('finish', () => {
        // The public URL can be used to directly access the file via HTTP.
        const publicUrl = format(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);
        admin.firestore().collection('Users').doc(uid).collection('Images').add({
          link: publicUrl,
          name: req.file.originalname
        }).then(function (){
            res.status(200).json({
              status: 200,
              message: 'Image received and uploaded'
            })
            console.log('Image uploaded')
        }).catch(function (error){
            res.status(400).json({
              status: error.code,
              message: error.message
            })
            console.log('Error code: ' + error.code + ', message' + error.message)
        })
      });
    
      blobStream.end(req.file.buffer);

    }else{
      res.status(401).json({
        status: 401,
        message: 'You need to log in to access content'
      })
    }
  })
})

module.exports = api;  