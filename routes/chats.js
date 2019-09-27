var express = require("express");
var firebase= require("firebase");
var admin = require("firebase-admin");
var bodyParser = require("body-parser");

var api = express.Router();

api.use(bodyParser.urlencoded({ extended: false }));

api.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.header("Access-Control-Allow-Headers", "Origin, Authorization, X-Requested-With, Content-Type, Accept");
    next();
  });

api.get('/:userid', function (req, res){
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        chats = []
        uid = req.params.userid
        if (decodedToken.uid == uid){
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
            res.json({
                status: 401,
                messgae: 'token mismatch'
            })
        }
    }).catch(function (error){
        res.status(401).json({
            status: error.code,
            message: error.message
        })
    }) 
})

api.post('/:userid/checkChat', function (req,res){
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        if (decodedToken.uid == uid){
            uid = req.params.userid;
            title = req.body.title
            admin.firestore().collection('Chats').where('title','==',title).get().then(function (query){
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
            res.json({
                status: 401,
                messgae: 'token mismatch'
            })
        }
    }).catch(function (error){
        res.status(401).json({
            status: error.code,
            message: error.message
        })
    }) 
})

api.post('/:userid', function (req, res){
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        if (decodedToken.uid == uid){
            uid = req.params.userid;
            title = req.body.title
            sent = Date.now()
            members = JSON.parse(req.body.participants);
            ref = admin.firestore().collection('Chats');
            data = {
                title: title,
                created: sent,
                members: members,
                last_modified: sent
            }
            ref.add(data).then(function (doc){
                ref.doc(doc.id).update({chatID: doc.id});
                res.status(201).json({
                    status: 201,
                    message: 'chat created',
                    Id: doc.id
                })
            }).catch(function (error){
                res.status(400).json({
                    status: error.code,
                    message: error.message
                })
            })
        } else{
            res.json({
                status: 401,
                messgae: 'token mismatch'
            })
        }
    }).catch(function (error){
        res.status(401).json({
            status: error.code,
            message: error.message
        })
    }) 
})
api.delete('/:userid/:chatid', function (req, res){
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        if (decodedToken.uid == uid){
            uid = req.params.userid;
            id = req.params.chatid;
            var chat = admin.firestore().collection('Chats');
            chat.doc(id).get().then( function (snapshot){
                chat.doc(id).delete()
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
            res.json({
                status: 401,
                messgae: 'token mismatch'
            })
        }
    }).catch(function (error){
        res.status(401).json({
            status: error.code,
            message: error.message
        })
    }) 
})

api.post('/:userid/:chatid/participants', function (req,res){
    uid = req.params.userid;
    id = req.params.chatid;
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        if (decodedToken.uid == uid){
            id_member = req.body.id_member;
            key = req.body.key;
            update = admin.firestore().collection('Chats').doc(id).update(
                {['members.'+id_member]: key })
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
            res.json({
                status: 401,
                messgae: 'token mismatch'
            })
        }
    }).catch(function (error){
        res.status(401).json({
            status: error.code,
            message: error.message
        })
    }) 
})

api.delete('/:userid/:chatid/participants/:participantsid', function (req,res){
    uid = req.params.userid
    id_chat = req.params.chatid;
    participant = req.params.participantsid
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        if (decodedToken.uid == uid){
            var deletes = admin.firestore().collection('Chats').doc(id_chat).update({
                ['members.'+participant]: null 
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
        }else{
            res.json({
                status: 401,
                messgae: 'token mismatch'
            })
        }
    }).catch(function (error){
        res.status(401).json({
            status: error.code,
            message: error.message
        })
    }) 
})

api.post('/:userid/:chatid/changeKey', function (req,res){
    uid = req.params.userid;
    chatId = req.params.chatid;
    key = req.body.key;
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        if (decodedToken.uid == uid){
            update = admin.firestore().collection('Chats').doc(chatId).update({['members.'+uid]: key});
            update.then(function (){
                res.status(200).json({
                    status: 200,
                    message: 'the user has updated its chat key'
                })
            }).catch( function (error){
                res.status(400).json({
                    status: error.code,
                    message: error.message
                })
            })
        }else{
            res.json({
                status: 401,
                messgae: 'token mismatch'
            })
        }
    }).catch(function (error){
        res.status(401).json({
            status: error.code,
            message: error.message
        })
    }) 


});

module.exports = api;