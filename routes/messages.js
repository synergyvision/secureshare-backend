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



api.get('/:userid/chat/:chatid', function (req,res){
    uid = req.params.userid;
    chat = req.params.chatid;
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        messages = [];
        if (decodedToken.uid == uid){
            admin.firestore().collection('Users').doc(uid).collection('Chats').doc(chat).collection('Messages').get().then(function (snapshot){
                snapshot.forEach( doc =>{
                    message = {
                        data: doc.data(),
                        id: doc.id
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

api.post('/:userid/:chatid/messages', function (req,res){
    j = 0
    uid = req.params.userid;
    chat = req.params.chatid;
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        if (decodedToken.uid == uid){
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
                    admin.firestore().collection('Users').doc(recipients[i]).collection('Chats').doc(chat).set({status: true})
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

// the following functions are for singular messages, not chats

api.get('/:userid', function (req,res){
    uid = req.params.userid;
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        if (decodedToken.uid == uid){
            admin.firestore().collection('Users').doc(uid).collection('Messages').get().then(function (snapshot){
                if (snapshot.empty){
                    res.status(200).json({
                        status: 404,
                        message: 'No messages found'
                    })
                }else{
                    messages = [];
                    snapshot.forEach( doc => {
                        message = {
                            data: doc.data(),
                            id: doc.id
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

var getUsername = function (id){
    console.log('also here')
    return admin.firestore().collection('Users').doc(id).get().then(function (doc){
        return doc.get('username')
    })

}

api.post('/:userid', function (req,res){
    uid = req.params.userid
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        if (decodedToken.uid == uid){
            sender = req.body.username;
            id_sender = req.body.id_sender;
            timestamp = Date.now();
            content = req.body.content;
            recipient = req.body.recipient;
            publish = req.body.publish;
            var message = {
                sender: sender,
                id_sender: id_sender,
                timestamp: timestamp,
                content: content,
                status: 'unread',
                tray: 'inbox',
                publish: publish
            }
            admin.firestore().collection('Users').doc(recipient).collection('Messages').add(message).then( async () =>{
                recipient_user = await getUsername(recipient);
                admin.firestore().collection('Users').doc(uid).collection('Messages').add({
                    timestamp: timestamp,
                    content: content,
                    tray: 'outbox',
                    publish: publish,
                    recipient: recipient,
                    r_username: recipient_user
                }).then(function (){
                    res.status(201).json({
                        status: 200,
                        message: 'Message has been sent'
                    })
                }).catch(function (error){
                    res.status(400).json({
                        status: error.code,
                        message: error.message
                    })
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

api.get('/:userid/:messageid', function (req,res){
    uid = req.params.userid
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function (decodedToken) {
        if (decodedToken.uid == uid){
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

api.put('/:userid/:messageid', function (req,res){
    uid = req.params.userid;
    message = req.params.messageid;
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        if (decodedToken.uid == uid){
            update = admin.firestore().collection('Users').doc(uid).collection('Messages').doc(message).update({
                status: 'read'
            })
            update.then( function(){
                res.status(200).json({
                    status: 200,
                    message: 'Messages status changed to read'
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

api.delete('/:userid/:messageid', function (req,res) {
    uid = req.params.userid
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        if (decodedToken.uid == uid){
            admin.firestore().collection('Users').doc(uid).collection('Messages').doc(req.params.messageid).delete();
            res.status(200).json({
                status: 200,
                message: 'The message was deleted'
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

api.get('/:userid/mail/:tray',function (req,res){
    uid = req.params.userid
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        if (decodedToken.uid == uid){
            tray = req.params.tray;
            console.log(tray);
            admin.firestore().collection('Users').doc(uid).collection('Messages').where('tray', '==', tray).get().then(function (snapshot){
                messages = []
                if (snapshot.empty){
                    res.status(404).json({
                        message: 'no messages found'
                    })
                }
                snapshot.forEach(function (doc){
                    message = {
                        id: doc.id,
                        data: doc.data()
                    }
                    messages.push(message);
                })  
                res.status(200).json({
                    status: 200,
                    message: 'All messages have been retrieved',
                    data: messages
                })  
                }).catch(function (error){
                    res.status(401).json({
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

api.post('/:userid/:messageid/publish', function (req,res){
    uid = req.params.userid
    messageId = req.params.messageid
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        if (decodedToken.uid == uid){
            sender = req.body.sender;
            id_sender = req.body.id_sender;
            timestamp = Date.now();
            content = req.body.content;
            var message = {
                sender: sender,
                id_sender: id_sender,
                timestamp: timestamp,
                content: content,
                tray: 'published',
                likes: 0
            }
            admin.firestore().collection('Users').doc(uid).collection('Messages').doc(messageId).set(message).then( function (){
                res.status(201).json({
                    status: 200,
                    message: 'Message has been published'
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

api.put('/:userid/:messageid/react', function (req,res){
    uid = req.params.userid
    messageId = req.params.messageid
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        if (decodedToken.uid == uid){
            admin.firestore().collection('Users').doc(uid).collection('Messages').doc(messageId).get().then(function (doc){
                tray = doc.get('tray');
                if (tray == 'published' ){
                    if (doc.get('reactions.'+uid)){
                        likes = doc.get('likes');
                        likes = parseInt(likes) - 1;
                        admin.firestore().collection('Users').doc(uid).collection('Messages').doc(messageId).update(
                            {
                                likes: likes,
                                ['reactions.'+uid]: admin.firestore.FieldValue.delete()
                            })
                    }else{
                        likes = doc.get('likes');
                        likes = parseInt(likes) + 1;
                        admin.firestore().collection('Users').doc(uid).collection('Messages').doc(messageId).update(
                            {
                                likes: likes,
                                ['reactions.'+uid]: true
                            });
                    }
                    res.status(200).json({
                        status: 200,
                        message: 'message liked/removed like'
                    })
                }else{
                    res.status(401).json({
                        message: 'this message has not been published'
                    })
                }
            }).catch(function (error){
                res.status(401).json({
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



module.exports = api;