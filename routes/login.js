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
            return res.json({
                status: 200,
                message: 'User has logged in',
                uid: au.currentUser.uid
            })
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
    var unsubscribe = au.onAuthStateChanged(function(user) {
        if (user) {
          res.json({
              user: user.email,
              uid: user.uid
          })
        } else {
          res.json({
              message: 'no user is logged in'
          })
        }
      });
      unsubscribe();  

})


module.exports = api;