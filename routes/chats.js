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

api.get('/', function (req, res){
    firebase.auth().onAuthStateChanged(function (user){
        chats = []
        if (user){
            admin.firestore().collection('Chats').get().then(function (snapshot){
                snapshot.forEach( doc => {
                    chat = {
                        [doc.id]: doc.data()
                    }
                    chats.push(chat);
                })
                res.status(200).json({
                    status: 200,
                    message: 'All the chats have been Retrieved',
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
                message: 'You need to be logged in to access this content'
            })
        }
    })
})

api.post('/', function (req, res){
    firebase.auth().onAuthStateChanged( function (user){
        if (user){
            title = req.body.title
            last_message = req.body.last_message
            sent = Date.now()
            console.log(sent)
            var chat = admin.firestore().collection('Chats')
            var newChatData = {
                title: title,
                timestamp: sent
            }
           chat.add(newChatData).then( function (doc) {
                chat.doc(doc.id).collection('Participants').doc('Members').set({exists: true}).then( function (){
                    res.status(201).json({
                        status: 201,
                        message: 'chat created succesfully'
                    })
                }).catch(function (error){
                    res.status(400).json({
                        status: error.code,
                        message: error.message
                    })
                })
                console.log('Chat' + doc.id + 'created')
           }).catch(function (error){
               res.status(400).json({
                   status: error.code,
                   message: error.message
               })
           })
        } else{
            res.status(401).json({
                status: 401,
                message: 'You need to be logged in to acces content'
            })
        }    
    })    
})

api.delete('/:chatid', function (req, res){
    firebase.auth().onAuthStateChanged(function (user){
        if (user){
            id = req.params.chatid;
            var chat = admin.firestore().collection('Chats')
            chat.doc(id).collection('Messages').get().then( function (snapshot){
                snapshot.forEach( doc => {
                    chat.doc(id).collection('Messages').doc(doc.id).delete();
                    console.log('Deleted message ' + doc.id);
                })
                chat.doc(id).collection('Participants').doc('Members').delete();
                console.log('Deleted list of participants');
                chat.doc(id).delete()
                console.log('finally deleted chat')
                res.status(200).json({
                    status:200,
                    message: 'The chat was deleted'
                })    
            }).catch(function (error){
                res.status(400).json({
                    status: error.code,
                    message: error.message
                })
            })
        }else{       
            res.status(401).json({
                status: 401,
                message: 'You need to be logged in to acces content'
            })
        }
    })
})

api.post('/:chatid/participants', function (req,res){
    id = req.params.chatid;
    console.log(id);
    firebase.auth().onAuthStateChanged(function (user){
        console.log('aca')
        if (user){
            id_participants = req.body.participants
            newMembers = JSON.parse(id_participants)
            update = admin.firestore().collection('Chats').doc(id).collection('Participants').doc('Members').update(newMembers)
            update.then( function (){
                console.log('Se han insertado miembros en el chat');
                res.status(201).json({
                    status: 201,
                    message: 'Succesfully added members to chat'
                })
            }).catch( function (error){
                res.status(400).json({
                    status: error.code,
                    message: error.message
                })
            })
        }else{
            res.status(401).json({
                status: 402,
                message: 'You need to be logged in to access content'
            })
        }
    })
})

api.delete('/:chatid/participants/:participantsid', function (req,res){
    id_chat = req.params.chatid;
    participant = req.params.participantsid
    firebase.auth().onAuthStateChanged(function (user){
        if (user){
            var deletes = admin.firestore().collection('Chats').doc(id_chat).collection('Participants').doc('Members').update({
                [participant]: null
            })
            deletes.then(function (){
                res.status(200).json({
                    status: 200,
                    message: 'Participant deleted from chat'
                })
            }).catch( function (error){
                res.status(400).json({
                    status: error.code,
                    message: error.message
                })
            })
        }else {
            res.status(401).json({
                status: 402,
                message: 'You need to be logged in to access content'
            })
        }
    })
})

module.exports = api;