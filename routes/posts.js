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
    firebase.auth().onAuthStateChanged( function (user){
        if (user){
            admin.database().ref().child('Posts').once('value').then(function (snapshot){
                var posts = snapshot.val();
                res.status(200).json({
                    status: 200,
                    message: 'Post Retrieved',
                    data: posts
                })
            })    
        }else{
            res.json({
                status: 401,
                messgae: 'You need to be logged in to access this content'
            })
        }
    })    
})

api.post('/', function (req,res){
   
    firebase.auth().onAuthStateChanged(function (user){
        if (user){
            var postData = admin.database().ref().child('Posts').push()
            var newPostData = postData.set({
                 content: req.body.content,
                 user_id: req.body.uid,
                 image_id: req.body.image_id
            }, function (error){
                if (error){
                    res.json({
                        status: error.code,
                        message: error.message
                    })
                } else {
                    res.json({
                        status: 201,
                        message: 'Post uploaded succesfully'
                    })
                }    
            });

        }else{
            res.json({
                status: 401,
                messgae: 'You need to be logged in to access this content'
            })
        }
    })

})

api.put('/:postId', function (req,res){
    firebase.auth().onAuthStateChanged(function (user){
        if (user){
            post_id = req.params.postId;
            var postData = {
                content: req.body.content,
                image_id: req.body.image_id
            }
            var oldData = admin.database().ref().child('Posts/' + post_id).update(postData);
            oldData.then(function (){
                res.json({
                    status: 200,
                    message: 'the post has been updated'
                })
            }).catch (function (error){
                res.json({
                    status: error.code,
                    message: error.message
                })
            })
        } else{
            res.json({
                status: 401,
                message: 'you need to log in to acces this content'
            })
        } 
    })   

})

api.delete('/:postId', function (req,res){
    post_id = req.params.postId
    firebase.auth().onAuthStateChanged( function (user){
        if (user){
            admin.database().ref().child('Posts/' + post_id).remove();
            res.json({
                status: 200,
                message: 'The post has been deleted'
            })
        } else{
            res.json({
                status: 401,
                message: 'you need to log in to acces this content'
            }) 
        }
    })
})

module.exports = api;  

