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
            admin.database().ref().child('Comments').once('value').then(function (snapshot){
                var comments = snapshot.val();
                res.status(200).json({
                    status: 200,
                    message: 'Comments Retrieved',
                    data: comments
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

api.post('/', function (req, res) {
    firebase.auth().onAuthStateChanged(function (user){
        if (user){
            var comment = admin.database().ref().child('Comments').push();
            var commentData = {
                content: req.body.content,
                user_id: req.body.user_id,
                post_id: req.body.post_id,
                image_id: req.body.image_id
            }
            comment.set(commentData , function(error) {
                if (error){
                    res.json({
                        status: error.code,
                        message: error.message
                    })
                } else{
                    res.json({
                        status: 200,
                        message: 'Succesfully published comment'
                    })
                }
            })
        }else{
            res.json({
                status: 401,
                messgae: 'You need to be logged in to access this content'
            })
        }
    })    
})

api.put('/:commentId', function (req,res){
    comment_id = req.params.commentId
    firebase.auth().onAuthStateChanged(function (user){
        if (user){
            var newCommentData = {
                content: req.body.content,
                image_id: req.body.image_id
            }
            var oldData = admin.database().ref().child('Comments/' + comment_id).update(newCommentData);
            oldData.then(function (){
                res.json({
                    status: 200,
                    message: 'the comment has been updated'
                })
            }).catch (function (error){
                res.json({
                    status: error.code,
                    message: error.message
                })
            })
        }else{
            res.json({
                status: 401,
                message: 'You need to be logged in to access content'
            })
        }
    })
})

api.delete('/:commentId', function (req,res){
    comment_id =req.params.commentId
    firebase.auth().onAuthStateChanged( function (user){
        if (user){
            admin.database().ref().child('Comments/' + comment_id).remove();
            res.json({
                status: 200,
                message: 'The comment has been deleted'
            })
        } else{
            res.json({
                status: 401,
                message: 'you need to log in to access this content'
            }) 
        }
    })
})

module.exports = api;