var express = require("express");
var format = require('util').format;
var firebase= require("firebase");
var admin = require("firebase-admin");
const Multer = require('multer');
var stream = require('stream');

var bodyParser = require("body-parser");

var api = express.Router();
var {Storage} = require('@google-cloud/storage');

api.use(bodyParser.urlencoded({ extended: false }));

api.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Authorization, Content-Type, Accept");
    next();
  });

  const multer = Multer({
    storage: Multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024 // no larger than 5mb, you can change as needed.
    }
  });
  

api.post('/files', multer.single('file'), (req, res) => {
  var encoded = req.headers.authorization.split(' ')[1]
  admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
    if (decodedToken){
      uid = req.body.uid;
      var bucket = admin.storage().bucket();
      var blob = bucket.file(req.file.originalname)
      var blobStream = blob.createWriteStream();

      blobStream.on('error', (error) => {
        console.log(error);
      })

      blobStream.on('finish', () => {
        myFile = admin.storage().bucket().file(blob.name);
        myFile.getSignedUrl({action: 'read', expires: '03-09-2491'}).then(urls => {
          const signedUrl = urls[0]
          admin.firestore().collection('Users').doc(uid).collection('Files').add({
            link: signedUrl,
            name: req.file.originalname
          }).then(function (){
              res.status(200).json({
                status: 200,
                message: 'File received and uploaded',
                link: signedUrl
              })
              console.log('File uploaded')
          }).catch(function (error){
              res.status(400).json({
                status: error.code,
                message: error.message
              })
              console.log('Error code: ' + error.code + ', message' + error.message)
          })
        }).catch(function (error){
          console.log(error);
        })
      });
    
      blobStream.end(req.file.buffer);

    }else{
      res.status(401).json({
        status: 401,
        message: 'You need to log in to access content'
      })
    }
  }).catch(function (error){
     res.status(401).json({
       status: error.code,
       message: error.message
     })
  })
})

api.post('/images', multer.single('file'), (req, res) => {
  var encoded = req.headers.authorization.split(' ')[1]
  admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
    if (decodedToken){
      uid = req.body.uid;
      var bucket = admin.storage().bucket();
      var blob = bucket.file(req.file.originalname)
      var blobStream = blob.createWriteStream();

      blobStream.on('error', (error) => {
        console.log(error);
      })

      blobStream.on('finish', () => {
        myFile = admin.storage().bucket().file(blob.name);
        myFile.getSignedUrl({action: 'read', expires: '03-09-2491'}).then(urls => {
          const signedUrl = urls[0]
          admin.firestore().collection('Users').doc(uid).update({profileUrl: signedUrl});
              res.status(200).json({
                status: 200,
                message: 'Image already uploaded retrieved link',
                link: signedUrl
              })       
        }).catch(function (error){
          console.log(error);
        })
      });
    
      blobStream.end(req.file.buffer);

    }else{
      res.status(401).json({
        status: 401,
        message: 'You need to log in to access content'
      })
    }
  }).catch(function (error){
      res.status(401).json({
        status: error.code,
        message: error.message
      })
   })
})

api.post('/images64', function (req, res){
  var encoded = req.headers.authorization.split(' ')[1]
  admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
    if (decodedToken){
      uid = req.body.uid;
      admin.firestore().collection('Users').doc(uid).update({profileUrl: signedUrl});
          res.status(200).json({
            status: 200,
            message: 'Image already uploaded retrieved link',
            link: signedUrl
          })     
    }else{
      res.status(401).json({
        status: 401,
        message: 'You need to log in to access content'
      })
    }
  }).catch(function (error){
      res.status(401).json({
        status: error.code,
        message: error.message
      })
   })
})

module.exports = api;  