//var credentials = require('../keys.json');
var express = require("express");
var admin = require("firebase-admin");
var bodyParser = require("body-parser");
var api = express.Router();


api.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.header("Access-Control-Allow-Headers", "Origin, Authorization, X-Requested-With, Content-Type, Accept");
    next();
  });

  api.use(bodyParser.urlencoded({ extended: false }));

  var publicKey = process.env.server_public_key.replace(/\\n/g,'\n');
  var facebookId = process.env.facebook_id_app;

api.get('/serverKeys', function (req,res){
    //publickey = credentials.server_public_key;

    
    res.status(200).json({
        status:200,
        message: 'got server public key',
        publickey: publicKey
    })
    
})

api.post('/facebookId', function (req,res){
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        uid = req.body.uid
        if (decodedToken.uid == uid){
            
            res.status(200).json({
                status:200,
                message: 'got app fb id',
                id: facebookId
            })
        }else{
            res.status(401).json({
                message: 'token missmatch'
            })
        }
    }).catch(function (error){
        res.status(401).json({
            status: error.code,
            message: error.message
        })
    })        
    
})

api.get('/:userId/addedSocials', function (req,res){
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        uid = req.params.userId
        if (decodedToken.uid == uid){
            admin.firestore().collection('Users').doc(uid).get().then(function (snapshot){
                if (snapshot.get('facebookValidation')){
                    var facebookValid = true
                }else{
                    var facebookValid = false
                }
                if (snapshot.get('twitterValidation')){
                    var twitterValid = true
                }else{
                    var twitterValid = false
                }
                if (snapshot.get('githubUsername')){
                    var gitHubValid = true
                }else{
                    var gitHubValid = false
                }
                res.status(200).json({
                    status: 200,
                    message: 'Users socials retrieved',
                    facebook: facebookValid,
                    twitter: twitterValid,
                    github: gitHubValid
                })
            }).catch(function (error){
                res.status(401).json({
                    status: error.code,
                    message: error.message
                })
            })
        }else{
            res.status(401).json({
                message: 'token missmatch'
            })
        }
    }).catch(function (error){
        res.status(401).json({
            status: error.code,
            message: error.message
        })
    }) 
})

api.post('/:userId/validateFacebook', function (req,res){
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        uid = req.params.userId
        if (decodedToken.uid == uid){
            admin.firestore().collection('Users').doc(uid).update({
                facebookValidation: true 
            })
            res.status(201).json({
                status: 200,
                message: 'Added facebook validation to user'
            })
        }else{
            res.status(401).json({
                message: 'token missmatch'
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