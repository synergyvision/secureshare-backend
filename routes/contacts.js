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

api.get('/:userid/requests', function (req, res){
    uid = req.params.userid,
    firebase.auth().onAuthStateChanged(function (user){
        if (user) {
            admin.database().ref().child('Requests').orderByChild('id_to').equalTo(uid).on('child_added' , function (snapshot){
                requests = snapshot.val();
                    res.status(200).json({
                        status: 200,
                        message: 'This are the users friends requests',
                        data: requests
                    })
            }).catch(function (error){
                res.status(400).json({
                    status: error.code,
                    message: error.message
                })
            })
        }else {
            res.status(401).json({
                status: 'unauthorized',
                message: 'you need to log in to access content'
            })

        }
    })

})

api.post('/:userid/requests', function (req, res){
    uid = req.params.userid,
    firebase.auth().onAuthStateChanged(function (user){
        if (user){
            var requestData = {
                id_to: req.body.id_to,
                id_from: uid,
                status: false
            }
            request = admin.database().ref().child('Requests').push();
            request.set(requestData, function (error){
                if (error){
                    res.json({
                        status: error.code,
                        message: error.message
                    })
                }else{
                    res.status(201).json({
                        status: 201,
                        message: 'The friend request has been sent'
                    })
                }
            })
        }else{
            res.status(401).json({
                status: 'unauthorized',
                message: 'you need to log in to access content'
            })

        }

    })
})

api.put('/:userid/requests/:requestid', function (req,res){
    uid = req.params.userid,
    request_id = req.params.requestid
    firebase.auth().onAuthStateChanged(function (user){
        if (user){
            if (req.body.status == 'true'){
                newRequestData = {
                    status: true
                }
                var request = admin.database().ref().child('Requests/' + request_id).update(newRequestData);
                request.then(function (){
                    console.log('actualice el request' + request_id)
                    admin.database().ref().child('Requests/' + request_id).once('value').then(function (snapshot){
                        sender = snapshot.val().id_from;
                        dataUpdate = {}
                        dataUpdate['Users/' + sender + '/contacts'] = {[uid]: true}
                        dataUpdate['Users/' + uid + '/contacts'] = {[sender]: true}
                        update = admin.database().ref().update(dataUpdate)
                        console.log('Actualizadas listas de contactos de' + sender+ 'y' + uid)
                        update.then(function (){
                            res.status(200).json({
                                status: 200,
                                message: 'Request accepted succesfully'
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
                admin.database().ref().child('Requests/' + request_id).remove();
                res.json({
                    status: 200,
                    message: 'The request has been rejected'
                })
            }
        }else{
            res.status(401).json({
                status: 'unauthorized',
                message: 'you need to log in to access content'
            })
        }
    })

})

api.delete('/:userid', function (req,res){
    uid = req.params.userid
    id_user = req.body.user_id // the user to unfriend
    console.log(uid)
    console.log(id_user)
    firebase.auth().onAuthStateChanged(function (user){
        if (user){
            console.log('aca');
           var user = admin.database().ref().child('Users/' + uid + '/contacts').update({[id_user]: null})
            user.then(function (){
                console.log('first');
                var contact = admin.database().ref().child('Users/' + id_user + '/contacts').update({[uid]: null})
                contact.then(function (){
                    console.log('second')
                    res.status(200).json({
                        status: 200,
                        message: 'Contact unfriended'
                    })
                }).catch(function(error){
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

        }else{
            res.json({
                status: 401,
                message: 'you need to log in to access this content'
            }) 
        }
    })     
})    

module.exports = api;