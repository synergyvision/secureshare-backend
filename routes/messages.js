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



api.get('/:userid/:chatId', function (req,res){
    uid = req.params.userid;
    chat = req.params.chatId;
    var unsubscribe = firebase.auth().onAuthStateChanged(function (user){
        messages = [];
        if (user){
            admin.firestore().collection('Users').doc(uid).collection('Chats').doc(chat).collection('Messages').get().then(function (snapshot){
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
    unsubscribe();
})

api.post('/:userid/:chatid/messages', function (req,res){
    j = 0
    uid = req.params.userid;
    chat = req.params.chatid;
    var unsubscribe = firebase.auth().onAuthStateChanged(function (user){
        if (user){
            sender= req.body.id_sender
            content= req.body.message
            date_sent= Date.now()
            recipients = JSON.parse(req.body.recipients);
                if (req.body.response_to){
                    var newMessage = {
                        id_sender: sender,
                        content: content,
                        date_sent: date_sent,
                        response_to: req.body.response_to
                    }

                }else{
                    var newMessage = {
                        id_sender: sender,
                        content: content,
                        date_sent: date_sent
                    }
                }
                for (i = 0; i < recipients.length;i++){
                    var post = admin.firestore().collection('Users').doc(recipients[i]).collection('Chats').doc(chat).collection('Messages');
                    post.add(newMessage).then(function (doc){
                        if (doc.exists){
                            post.doc(doc.id).update({message_id: doc.id})
                        }    
                        try {
                            j++;
                            if (j == recipients.length){
                                res.status(201).json({
                                    status:201,
                                    message: 'The message has been sent'
                                })
                            }      
                        }
                        catch(error){
                            console.log(error);
                        }
                         
                      
                    }).catch(function (error){
                        res.status(400).json({
                            status: error.code,
                            message: error.message
                        })
                    })
            }    
        }else{
            res.status(401).json({
                staus: 401,
                message: 'You need to be logged in to access content'
            })
        }
    })
    unsubscribe();
})

// the following functions are for singular messages, not chats

api.get('/:userid', function (req,res){
    uid = req.params.userid;
    var unsubscribe = firebase.auth().onAuthStateChanged(function (user){
        if (user){
            admin.firestore().collection('Users').doc('uid').collection('Messages').get().then(function (snapshot){
                if (snapshot.empty){
                    res.status(200).json({
                        status: 404,
                        message: 'No messages found'
                    })
                }else{
                    messages = [];
                    snapshot.forEach( doc => {
                        message = {
                            [doc.id]: doc.data()
                        }
                        messages.push(message);
                    })
                    res.status(200).json({
                        status: 200,
                        message: 'All messages have been retrieved',
                        data: messages
                    })
                }
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
    unsubscribe()
})

api.post('/:userid', function (res,res){
    uid = req.params.userid
    var unsubscribe = firebase.auth().onAuthStateChanged( function (){
        if (user){
            sender = req.body.username;
            timestamp = Date.now();
            content = req.body.content;
            recipient = req.body.recipient;
            var message = {
                sender: sender,
                timestamp: timestamp,
                content: content,
                recipient: recipient,
                status: 'unread'
            }
            admin.firestore().collection('Users').doc(uid).collection('Messages').add(message).then( function (){
                res.status(201).json({
                    status: 200,
                    message: 'Message has been sent'
                })
            }).catch( function (error){
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
    unsubscribe();
})

api.get('/:userid/:messageid', function (req,res){
    uid = req.params.userid
    var unsubscribe = firebase().onAuthStateChanged( function (user){
        if (user){
            admin.firestore().collection('Users').doc(uid).collection('Messages').doc(req.params.messageid).get().then(function (doc){
                res.status(200).json({
                    status: 200,
                    message: 'Message data retrieved',
                    data: doc.data()
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
    unsubscribe();
})

api.delete('/:userid/:messageid', function (req,res) {
    uid = req.params.userid
    var unsubscribe = firebase().onAuthStateChanged(function (user){
        if (user){
            admin.firestore().collection('Users').doc(uid).collection().doc(req.params.messageid).delete();
            res.status(200).json({
                status: 200,
                message: 'The message was deleted'
            })
        }else{
            res.status(401).json({
                staus: 401,
                message: 'You need to be logged in to access content'
            })
        }
    })
    unsubscribe();
})

module.exports = api;