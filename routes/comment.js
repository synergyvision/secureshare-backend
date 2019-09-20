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

api.post('/', function (req, res) {
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        if (decodedToken.uid){
            var comment = admin.firestore().collection('Comments');
            var commentData = {
                content: req.body.content,
                user_id: req.body.user_id,
                post_id: req.body.post_id
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

api.put('/:commentId', function (req,res){
    comment_id = req.params.commentId
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        if (decodedToken.uid){
            var newCommentData = {
                content: req.body.content
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

var userInfo = function (id){
    return admin.firestore().collection('Users').doc(id).get().then(function (doc){
        var name = doc.get('name') + '' + doc.get('lastname');
        var picture = doc.get('profileUrl');
        var user = {
            name: name,
            picture: picture
        }
        return user;
    }).catch(function (error){
        console.log(error)
    })
}

api.get('/:userid/:postid', function (req,res){
    uid = req.params.userid;
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        if (decodedToken.uid == uid){
            postId = req.params.postid;
            admin.firestore().collection('Comments').where('post_id', '==',postId).get().then(async (snapshot) => {
                comments = []
                for (doc of snapshot.docs){
                   user = await userInfo(doc.get('user_id'))
                    comment = {
                        id: doc.id,
                        username: user.name,
                        picture: user.picture,
                        userId: doc.get('user_id'),
                        comment: doc.get('content')
                    }
                    comments.push(comment);
                }
                res.status(200).json({
                    status: 200,
                    message: 'post comments retrieved',
                    data: comments
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