var express = require("express");
var admin = require("firebase-admin");
var bodyParser = require("body-parser");
var bcrypt = require("bcrypt");

var api = express.Router();

var saltRounds = 10;

api.use(bodyParser.urlencoded({ extended: false }));

api.post("/", function (req, res){

    db = admin.database();

    db.ref().child("Users").orderByChild("email").equalTo(req.body.email).once("value", snapshot => {
        if (snapshot.exists()){
            console.log("Este email ya se encuentra asociado");
            var email = snapshot.val();
        }
        if (email == null){
            
            bcrypt.hash(req.body.password, saltRounds, function (err , hash){

                db.ref().child("Users").orderByChild("username").equalTo(req.body.usuario).once("value", snapshot => {
                    if (snapshot.exists()){
                        var username = snapshot.val();
                    }
                    if (username == null){
                        var postRef = db.ref().child("Users");
        
                        var newPostRef = postRef.push().set({
                            name: req.body.nombre,
                            lastname: req.body.apellido,
                            email: req.body.email,
                            phone: req.body.telefono,
                            username: req.body.usuario, 
                            password: hash
                        }, function (error){
                            if (error){
                                res.send(error);
                            } else {
                                res.json({status: 201, message: "User created succesfully"});
                            }
                        });                
                    } else {
                        res.json({status: 400, message: "The username is not available"});
                    }
                }, function (error){
                    console.log("Could not retrieve data from database", + error.code);
                    res.status(500).send("Could not retrieve data " + error);
                });
            });
         } else {
             res.json({status: 400, message: "This email is already associated with an account"});
         }
    
    }, function (error){
        console.log("Could not retrieve data from database", + error.code);
        res.status(500).send("Could not retrieve data " + error);
    });

});

module.exports = api;