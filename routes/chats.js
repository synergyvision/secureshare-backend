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

api.get('/:userid', function (req, res){
    var unsubscribe = firebase.auth().onAuthStateChanged(function (user){
        chats = []
        uid = req.params.userid
        if (user){
            admin.firestore().collection('Users').doc(uid).collection('Chats').get().then(function (snapshot){
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
            unsubscribe();
            res.status(401).json({
                staus: 401,
                message: 'You need to be logged in to access this content'
            })
        }
    })
    unsubscribe();
})

api.post('/:userid/checkChat', function (req,res){
    var unsubscribe = firebase.auth().onAuthStateChanged( function (user){
        if (user){
            uid = req.params.userid;
            title = req.body.title
            admin.firestore().collection('Users').doc(uid).collection('Chats').where('title','==',title).get().then(function (query){
                if (query.empty){
                    res.status(200).json({
                        status: 'ok',
                        message: 'safe to create chat',
                    })
                }else{
                    query.forEach(function (doc){
                        res.status(200).json({
                            status: 'chat already exists',
                            id: doc.id
                        })
                    })
                }
            }).catch(function (error){
                res.status(400).json({
                    status: error.code,
                    message: error.message
                })
            })
        } else{
            unsubscribe();
            res.status(401).json({
                status: 401,
                message: 'You need to be logged in to acces content'
            })
        }    
    })
    unsubscribe();    
})

api.post('/:userid', function (req, res){
    var unsubscribe = firebase.auth().onAuthStateChanged( function (user){
        if (user){
            uid = req.params.userid;
            title = req.body.title
            sent = Date.now()
            participants = JSON.parse(req.body.participants);
            admin.firestore().collection('Users').doc(uid).collection('Chats').where('title','==',title).get().then(function (query){
                if (query.empty){
                    var chat = admin.firestore().collection('Users').doc(uid).collection('Chats');
                    var newChatData = {
                        title: title,
                        timestamp: sent
                    }
                    chat.add(newChatData).then( function (doc) {
                            chat.doc(doc.id).collection('Participants').doc('Members').set(participants).then( function (){
                                console.log('here');
                                res.status(201).json({
                                    status: 201,
                                    message: 'chat created succesfully',
                                    idChat: doc.id
                                })
                            }).catch(function (error){
                                res.status(400).json({
                                    status: error.code,
                                    message: error.message
                                })
                            })
                            console.log('Chat ' + doc.id + ' created')
                    }).catch(function (error){
                        res.status(400).json({
                            status: error.code,
                            message: error.message
                        })
                    })
                }else{
                    console.log('chat exist');
                }
            })
                
        } else{
            unsubscribe();
            res.status(401).json({
                status: 401,
                message: 'You need to be logged in to acces content'
            })
        }    
    })
    unsubscribe();    
})

api.delete('/:userid/:chatid', function (req, res){
    var unsubscribe = firebase.auth().onAuthStateChanged(function (user){
        if (user){
            uid = req.params.userid;
            id = req.params.chatid;
            var chat = admin.firestore().collection('Users').doc(uid).collection('Chats');
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
            unsubscribe();       
            res.status(401).json({
                status: 401,
                message: 'You need to be logged in to acces content'
            })
        }
    })
    unsubscribe();
})

api.post('/:userid/:chatid/participants', function (req,res){
    uid = req.params.userid;
    id = req.params.chatid;
    console.log(id);
    var unsubscribe = firebase.auth().onAuthStateChanged(function (user){
        console.log('aca')
        if (user){
            id_participants = req.body.participants
            newMembers = JSON.parse(id_participants)
            update = admin.firestore().collection('Users').doc(uid).collection('Chats').doc(id).collection('Participants').doc('Members').update(newMembers)
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
            unsubscribe();
            res.status(401).json({
                status: 402,
                message: 'You need to be logged in to access content'
            })
        }
    })
    unsubscribe();
})

api.delete('/:userid/:chatid/participants/:participantsid', function (req,res){
    uid = req.params.userid
    id_chat = req.params.chatid;
    participant = req.params.participantsid
    var unsubscribe = firebase.auth().onAuthStateChanged(function (user){
        if (user){
            var deletes = admin.firestore().collection('Users').doc(uid).collection('Chats').doc(id_chat).collection('Participants').doc('Members').update({
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
    unsubscribe();
})

module.exports = api;