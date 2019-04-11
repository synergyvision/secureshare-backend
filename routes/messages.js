var express = require("express");
var firebase= require("firebase");
var admin = require("firebase-admin");
var bodyParser = require("body-parser");

var api = express.Router();

api.use(bodyParser.urlencoded({ extended: false }));

api.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });



api.get('/:chatId', function (req,res){
    chat = req.params.chatId;
    firebase.auth().onAuthStateChanged(function (user){
        messages = [];
        if (user){
            admin.firestore().collection('Chats').doc(chat).collection('Messages').get().then(function (snapshot){
                snapshot.forEach( doc =>{
                    message = {
                        [doc.id]: doc.data()
                    }
                    messages.push(message)
                })
                res.status(200).json({
                    status:200,
                    message: 'Chat Messages Retrieved',
                    data: messages
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
            var post = admin.firestore().collection('Chats').doc(chat).collection('Messages');
            post.add(newMessage).then(function (){
                res.status(201).json({
                    status:201,
                    message: 'The message has been sent'
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

module.exports = api;