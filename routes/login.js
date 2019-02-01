var express = require("express");
var admin = require("firebase-admin");
var bodyParser = require("body-parser");
var bcrypt = require("bcrypt");

var api = express.Router();

api.use(bodyParser.urlencoded({ extended: false }));

api.post("/", function (req, res){

    db = admin.database();

    db.ref().child("Users").orderByChild("email").equalTo(req.body.email).once("value").then(snapshot => {
        if(snapshot.exists()){
            db.ref().child("Users").orderByChild("email").equalTo(req.body.email).once("child_added").then(snapshot => {
                bcrypt.compare(req.body.password,snapshot.val().password, function (err, resp){
                    if (snapshot.exists()){
                        if( resp == true){
                            res.json({
                                status: 200,
                                message: "The user has logged in"
                            });
                        } else {
                            res.json({
                                status: 400,
                                message: "The password is incorrect"
                            });
                        }
                    }
                });
            });    
        } else{
            res.json({
                status: 404,
                message: "User with that email has not been found"
            })
        }

    });

});

module.exports = api;