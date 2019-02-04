var express = require("express");
var admin = require("firebase-admin");
var firebase = require("firebase");
var bodyParser = require("body-parser");
var bcrypt = require("bcrypt");

var api = express.Router();

var saltRounds = 10;

api.use(bodyParser.urlencoded({ extended: false }));
api.post("/", function (req, res){

    db = admin.database();
    auth = firebase.auth();
    // first we check if the username is available
    db.ref().child("Users").orderByChild("username").equalTo(req.body.usuario).once("value", snapshot => {
        if (snapshot.exists()){
            var username = snapshot.val();
        }
        if (username == null){ 
            // if the username doesnt exist we connect to firebase auth to create the new user
            auth.createUserWithEmailAndPassword(req.body.email,req.body.password).then ((response) => {                           
                // if the user if succesfully added in auth we store it in the database  
                var postRef = db.ref().child("Users");        
                var newPostRef = postRef.push().set({
                    name: req.body.nombre,
                    lastname: req.body.apellido,
                    email: req.body.email,
                    phone: req.body.telefono,
                    username: req.body.usuario
                }, function (error){
                    if (error){
                        res.send(error);
                    } else {
                        res.json({status: 201, message: "User created succesfully"});
                    }
                });                               
            }).catch(function(error){       
                    var errorCode = error.code;
                    var errorMessage = error.message;
                    res.json({status: errorCode, message: errorMessage});
                });
        } else{
            res.json({status: 400, message: "The username is not available"});
        }
    })    
});

module.exports = api;