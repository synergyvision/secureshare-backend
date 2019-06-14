var express = require("express");
var admin = require("firebase-admin");
var fire = require("firebase");
var bodyParser = require("body-parser");
var bcrypt = require("bcrypt");
var nodemailer = require("nodemailer");

var api = express.Router();

api.use(bodyParser.urlencoded({ extended: false }));

api.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });
 

api.post("/", function (req, res){
    var db = admin.database();
    var au = fire.auth();    
       au.signInWithEmailAndPassword(req.body.email, req.body.password).then ( (response) => {
            au.currentUser.getIdToken(true).then(function(idToken) {
                res.header('Authorization',idToken).status(200).json({
                    message: 'User has logged in',
                    uid: au.currentUser.uid
                })
              }).catch(function(error) {
                    console.log(error);
                    res.status(400).json({
                        status: error.code,
                        message: error.message 
                    })
              });
       }).
       catch(function(error) {
            var code = error.code;
            var message = error.message;
            return res.json({
                status: code,
                message: message
            })
      })

});

api.post("/sendEmail", function (req , res){
    var au = fire.auth();   
    au.sendPasswordResetEmail(req.body.email).then(function(){
        res.json({
            status: 200,
            message: 'An email has been sent check your inbox'

        })
    }).catch(function (error){
        var code = error.code;
        var message = error.message;
        return res.json({
            status: code,
            message: message
        })
    });

});

api.get("/activeUser", function (req,res) {
    var au = fire.auth();
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded)
        .then(function(decodedToken) {
            var uid = decodedToken.uid;
                res.json({
                    status: 200,
                    message: uid
                })
        }).catch(function(error) {
            res.json({
                message: 'no user is logged in'
            })
        });
})


module.exports = api;