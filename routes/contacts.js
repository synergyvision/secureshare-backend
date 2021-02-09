var express = require("express");
var firebase= require("firebase");
var admin = require("firebase-admin");
var bodyParser = require("body-parser");
const { user } = require("firebase-functions/lib/providers/auth");
const { info } = require("firebase-functions/lib/logger");
const { request } = require("express");

var api = express.Router();

api.use(bodyParser.urlencoded({ extended: false }));

api.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Authorization, Content-Type, Accept");
    next();
  });

var requestInfo =  function (user_id,request_id){
    return admin.firestore().collection('Users').doc(user_id).get().then( function (snapshot){
        var info = {
            id: user_id,
            firstName: snapshot.get('firstName'),
            lastName: snapshot.get('lastName'),
            userPicture: snapshot.get('profileUrl'),
            email: snapshot.get('email'),
            requestId: request_id,
            bio: snapshot.get('bio')
        }
        return info;
    }).catch(function (error){
        console.log(error.code);
        console.log(error.message);
    })  
}

api.get('/:userid/requests', function (req, res){
    uid = req.params.userid
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        requests = []
        var i = 0;
        var quantity = 0;
        if (decodedToken.uid) {
            admin.firestore().collection('Requests').where('id_to', '==', uid).get().then(function (snapshot){
                if (!snapshot.empty){
                    snapshot.forEach(doc => {
                        requestInfo(doc.get('id_from'),doc.id).then(function (info){
                            i++;
                            if (doc.get('status') == false){
                                requests.push(info);
                            }
                            if (i == snapshot.size){
                                res.status(200).json({
                                    status: 200,
                                    message: 'This are the users friends requests',
                                    data: requests
                                })   
                            }
                        })
                        
                    })       
                }
                else {
                    res.status(201).json({
                        status: 2001,
                        message: 'User has no request',
                        data: []
                    })
                }   
            }).catch(function (error){
                console.log(error)
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

api.post('/:userid/requests', function (req, res){
    uid = req.params.userid
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        if (decodedToken.uid){
            var requestData = {
                id_to: req.body.id_to,
                id_from: uid,
                status: false
            }
            admin.firestore().collection('Requests').add(requestData).then (function (){
                res.status(201).json({
                    status: 201,
                    message: 'The friend request has been sent'
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
        console.log(error);
        res.status(401).json({
            status: error.code,
            message: error.message
        })
    }) 
})

api.put('/:userid/requests/:requestid', function (req,res){
    uid = req.params.userid,
    request_id = req.params.requestid
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        if (decodedToken.uid){
            if (req.body.status){
                newRequestData = {
                    status: true
                }
                var request = admin.firestore().collection('Requests').doc(request_id).update(newRequestData);
                request.then(function (){
                    console.log('actualice el request' + request_id)
                    admin.firestore().collection('Requests').doc(request_id).get().then(function (snapshot){
                        sender = snapshot.get('id_from');
                        to = snapshot.get('id_to');
                        console.log('sender: ' +sender );
                        console.log('to: ' + to);
                        var update = admin.firestore().collection('Users').doc(to).collection('contacts').add({Iduser: sender, status: true})
                        update.then(function (){
                            var act = admin.firestore().collection('Users').doc(sender).collection('contacts').add({Iduser: uid,status: true})
                            act.then(function (){
                                console.log('User contacts updated');
                                admin.firestore().collection('Requests').doc(request_id).delete();
                                res.status(200).json({
                                    status: 200,
                                    message: 'Contact request accepted',
                                    accepted: true
                                })
                            }).catch(function(error){
                                res.json({
                                    status: error.code,
                                    message: error.message
                                })
                            })
                        }).catch (function (error){
                            res.json({
                                status: error.code,
                                message: error.message  
                              })
                        })
                    }).catch(function (error){
                        res.json({
                            status: error.code,
                            message: error.message  
                          })
                    })
                }).catch(function (error){
                    res.json({
                      status: error.code,
                      message: error.message  
                    })
                })
            }else {
                admin.firestore().collection('Requests').doc(request_id).delete();
                res.json({
                    status: 200,
                    message: 'The request has been rejected',
                    accepted: false
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

api.delete('/:userid', function (req,res){
    uid = req.params.userid
    id_user = req.body.user_id // the user to unfriend
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        if (decodedToken.uid){
            admin.firestore().collection('Users').doc(uid).collection('contacts').where('userId', '==', id_user).get().then(function (snapshot){
            snapshot.forEach(doc => {
                docId = doc.id;
                admin.firestore().collection('Users').doc(uid).collection('contacts').doc(docId).delete();
                console.log('borreo el primero')
                admin.firestore().collection('Users').doc(id_user).collection('contacts').where('userId', '==', uid).get().then(function (snap){
                    snap.forEach( docs => {
                        id = docs.id;
                        admin.firestore().collection('Users').doc(id_user).collection('contacts').doc(id).delete();
                        res.status(200).json({
                            status: 200,
                            message: 'The user has been unfriended'
                        })
                    })
                }).catch (function (error){
                    res.status(400).json({
                        status: error.code,
                        message: error.message
                    })
                })
            })
           }).catch( function(error){
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

var contact = function (user_id,id){
    query = admin.firestore().collection('Users').doc(user_id).collection('contacts').where('Iduser', '==', id)
    return query.get().then(function (snapshot){
        if (snapshot.empty){
            return false;
        }else{
            return true;
        }
    }).catch(function (error){
        console.log(error)
    })
}


api.get('/:userid/users', function (req,res){
    uid = req.params.userid
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        if (decodedToken.uid){
            users = []
            var i = 0;
            admin.firestore().collection('Users').get().then(function(querySnapshot) {
                querySnapshot.forEach(function(doc) {
                    user_contact = contact(uid,doc.id);
                    user_contact.then(function (contact){
                        i++;
                        info = {
                            id: doc.id,
                            firstName: doc.get('firstName'),
                            lastName: doc.get('lastName'),
                            photo: doc.get('profileUrl'),
                            email: doc.get('email'),
                            contact: contact
                        }
                        users.push(info)
                        if (i == querySnapshot.size){
                            res.status(200).json({
                                status: 200,
                                message: 'User list',
                                data: users
                            })   
                        }
                    })
                });
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

function newFunction (user_id, id) {
    return new Promise((resolve) => {
        const contacts = admin.firestore().collection('Users').doc(user_id).collection('contacts').get();
        const friendRequest = admin.firestore().collection('Requests').where('id_from', '==', user_id).get();
        Promise.all([contacts,friendRequest]).then(( values ) => {
            values[0].forEach(contact => {
                if(values[1].empty){
                    resolve(false);
                } else {
                    values[1].forEach(request => {
                        if(contact.data().Iduser !== id) {
                            resolve(request.data().id_to === id ? 'pending' : false )
                        } else {
                            resolve(true)
                        }
                    })
                }
            });
        })
    })
}

api.get('/:userid/users/:query', function (req,res){
    uid = req.params.userid
    var query = req.params.query
    var encoded = req.headers.authorization.split(' ')[1]
    users = []
    var i = 0;
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        if (decodedToken.uid){
            admin.firestore().collection('Users').get().then(function(querySnapshot) {
                querySnapshot.forEach(function(doc) {
                    newFunction(uid, doc.id).then(contact => {
                        i++;
                        let info = {
                            id: doc.id,
                            firstName: doc.get('firstName'),
                            lastName: doc.get('lastName'),
                            photo: doc.get('profileUrl'),
                            email: doc.get('email'),
                            contact: contact
                        }
                        if(info.firstName.toLowerCase().indexOf(query.toLowerCase()) > -1 
                            || info.lastName.toLowerCase().indexOf(query.toLowerCase()) > -1
                            || info.email.toLowerCase().indexOf(query.toLowerCase()) > -1){ 
                            users.push(info)
                        }
                        // user.push (info)    
                        if (i == querySnapshot.size){
                            res.status(200).json({
                                status: 200,
                                message: 'User list',
                                data: users
                            })   
                        }
                    })
                });
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