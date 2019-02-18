var express = require("express");
var firebase= require("firebase");
var admin = require("firebase-admin");
var bodyParser = require("body-parser");

var api = express.Router();

api.use(bodyParser.urlencoded({ extended: false }));

api.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });


api.get('/', function (req,res){
    firebase.auth().onAuthStateChanged(function (user){
        if (user){
            admin.database().ref().child('Messages').once('value').then(function (snapshot){
                var chats = snapshot.val();
                res.status(200).json({
                    status: 200,
                    message: 'All the Messages have been Retrieved',
                    data: chats
                })
            }).catch(function (error){
                res.status(400).json({
                    status: error.code,
                    message: error.message
                })
            }) 

        }else{
            res.status(401).json({
                staus: 401,
                message: 'You need to be logged in to access content'
            })
        }
    })
})

api.post('/', function (req,res){
    firebase.auth().onAuthStateChanged(function (user){
        if (user){
            sender= req.body.id_sender
            chat= req.body.id_chat
            content= req.body.message
            date_sent= Date.now()
            var newMessage = {
                id_sender: sender,
                content: content,
                date_sent: date_sent
            }
            var post = admin.database().ref().child('Messages/' + chat).push();
            post.set(newMessage, function (error){
                if (error){
                    res.status(400).status({
                        status: 400,
                        message: 'There has been an error writing in the databse'
                    })
                }else{
                    console.log('aca')
                    newChatData ={
                        last_message: content
                    }
                    admin.database().ref().child('Chats/' + chat).update(newChatData).then( function(){
                        res.status(201).json({
                            status: 201,
                            message: 'The message has been sent and the chat metadata updated'
                        })
                    }).catch(function (error){
                        res.status(400).json({
                            status: error.code,
                            message: error.message
                        })
                    })             
                }
            })
        }else{
            res.status(401).json({
                staus: 401,
                message: 'You need to be logged in to access content'
            })
        }
    })
})

module.exports = api;