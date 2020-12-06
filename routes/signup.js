var express = require("express");
var admin = require("firebase-admin");
var firebase = require("firebase");
var api = express.Router();

api.get('/:username', function (req, res) {
    const db = admin.firestore();
    const username = req.params.username;
    db.collection('Users').where('username','==', username).get().then(snapshot => {
        if (snapshot.empty){ 
            res.status(201).json({
                status: 201,
                message: 'The username is available'
            })
        } else {
            res.status(400).send({message: "The username is not available"});
        }
    })
});

api.post("/", function (req, res){
    const db = admin.firestore();
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
});

module.exports = api;