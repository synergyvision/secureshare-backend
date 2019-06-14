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

api.get('/', function (req,res){
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        comments =[]
        if (decodedToken.uid ){
            admin.firestore().collection('Comments').get().then(function (snapshot){
                snapshot.forEach(doc => {
                    comment = {
                        [doc.id]: doc.data()
                    }
                    comments.push(comment)
                })
                res.status(200).json({
                    status: 200,
                    message: 'Comments Retrieved',
                    data: comments
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
                messgae: 'You need to be logged in to access this content'
            })
        }
    })
})

api.post('/', function (req, res) {
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        if (decodedToken.uid){
            var comment = admin.firestore().collection('Comments');
            var commentData = {
                content: req.body.content,
                user_id: req.body.user_id,
                post_id: req.body.post_id,
                image_id: req.body.image_id
            }
            comment.add(commentData).then(function (){
                res.status(201).json({
                    status:201,
                    message: 'Comment succesfully created'
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
                messgae: 'You need to be logged in to access this content'
            })
        }
    }) 
})

api.put('/:commentId', function (req,res){
    comment_id = req.params.commentId
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        if (decodedToken.uid){
            var newCommentData = {
                content: req.body.content,
                image_id: req.body.image_id
            }
            var oldData = admin.firestore().collection('Comments').doc(comment_id).update(newCommentData);
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
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        if (decodedToken.uid){
            var comment = admin.firestore().collection('Comments').doc(comment_id).delete();
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