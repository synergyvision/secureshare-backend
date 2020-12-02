var express = require("express");
var admin = require("firebase-admin");
var firebase = require("firebase");
var bodyParser = require("body-parser");
var bcrypt = require("bcrypt");

var api = express.Router();

var saltRounds = 10;

api.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

api.use(bodyParser.urlencoded({ extended: false }));
api.post("/", function (req, res){

    db = admin.firestore();
    auth = firebase.auth();
    // first we check if the username is available
    db.collection('Users').where('username','==', req.body.usuario).get().then(snapshot => {
        if (snapshot.empty){ 
            // if the username doesnt exist we connect to firebase auth to create the new user
            auth.createUserWithEmailAndPassword(req.body.email,req.body.password).then ((response) => {                           
                // if the user if succesfully added in auth we store it in the database 
                console.log("Usuario registrado en auth")
                auth.signInWithEmailAndPassword(req.body.email, req.body.password).then ( (response) => {
                    var user_id = auth.currentUser.uid;
                    console.log("Inicio sesion y tomo valor de uid auth");
                    var postRef = db.collection('Users').doc(user_id);    
                    var data = {
                        name: req.body.nombre,
                        lastName: req.body.apellido,
                        email: req.body.email,
                        phone: req.body.telefono,
                        username: req.body.usuario,
                    }
                    var newPostRef = postRef.set(data).then( function (){
                        res.status(201).json({
                            status: 201,
                            message: 'The user has signed up succesfully'
                        })
                    }).catch (function (error){
                        res.status(400).json({
                            status: error.code,
                            message: error.message
                        })
                    })
                }).catch(function (error){
                    rest.status(400).json({
                        status: error.code,
                        message: error.message
                    })
                })    
              console.log('cerrando sesion');
              auth.signOut().then(function() {
              }).catch(function(error) {
                 res.json({
                     status: error.code,
                     message: error.essage
                    
                 })
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