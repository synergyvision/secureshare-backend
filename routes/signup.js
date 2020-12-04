var express = require("express");
var admin = require("firebase-admin");
var firebase = require("firebase");
var bodyParser = require("body-parser");
var bcrypt = require("bcrypt");

var api = express.Router();
api.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });
  
api.use(bodyParser.urlencoded({ extended: true }));
api.use(bodyParser.json());

var saltRounds = 10;
api.post("/", function (req, res){
    db = admin.firestore();
    auth = firebase.auth();
    db.collection('Users').where('username','==', req.body.username).get().then(snapshot => {
        if (snapshot.empty){ 
            var postRef = db.collection('Users').doc(req.body.uid);    
            var data = {
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                email: req.body.email,
                phone: req.body.phone,
                username: req.body.username,
            }
            postRef.set(data).then( function ( result){
                res.status(201).json({
                    status: 201,
                    message: 'The user has signed up successfully'
                })
            }).catch (function (error){
                res.status(400).json({
                    status: error.code,
                    message: error.message
                })
            })
        } else{
            res.json({status: 400, message: "The username is not available"});
        }
    })    
});

module.exports = api;