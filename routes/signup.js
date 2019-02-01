var express = require("express");
var admin = require("firebase-admin");
var db = require("../app");
var bodyParser = require("body-parser");

var api = express.Router();

api.use(bodyParser.urlencoded({ extended: false }));

api.post("/", function (req, res){

    db = admin.database();

    db.ref().child("Users").orderByChild("email").equalTo(req.body.email).once("value", snapshot => {
        if (snapshot.exists()){
            console.log("existe!");
            res.json({ status:400 , message: "There is already an account associated with this email"});
            return
        }
    });

    db.ref().child("Users").orderByChild("username").equalTo(req.body.usuario).once("value", snapshot => {
        if (snapshot.exists()){
            console.log("existe!");
            res.json({ status:400 , message: "This username is not available"});
            return
        }
    });

    var postRef = db.ref().child("Users");
    
    var newPostRef = postRef.push().set({
        name: req.body.nombre,
        lastname: req.body.apellido,
        email: req.body.email,
        phone: req.body.telefono,
        username: req.body.usuario,
        password: req.body.password
    }, function (error){
        if (error){
            res.send(error);
        } else {
            res.json({
                status: "201",
                message: "Saved succesfully"
            });
        }
    });



});

module.exports = api;