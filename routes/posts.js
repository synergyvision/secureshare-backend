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
    var unsubscribe = firebase.auth().onAuthStateChanged( function (user){
        posts = [];
        if (user){
            admin.firestore().collection('Posts').get().then(function (snapshot){
                snapshot.forEach( doc => {
                    post = {
                        id: doc.id,
                        data: doc.data()
                    }
                    posts.push(post);
                })
                res.status(200).json({
                    status: 200,
                    message: 'Post Retrieved',
                    data: posts
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
    unsubscribe();   
})

api.post('/', function (req,res){
   
    var unsubscribe = firebase.auth().onAuthStateChanged(function (user){
        if (user){
            if (req.body.image_id){
                image = req.body.image_id
            }else{
                image = null
            }
            var postData = admin.firestore().collection('Posts');
            var newPostData = postData.add({
                 content: req.body.content,
                 user_id: req.body.uid,
                 image_id: image,
                 public: req.body.public,
                 likes: 0,
                 dislikes: 0
            }).then(ref => {
                console.log('Post created with id: ', ref.id)
                res.status(201).json({
                    status: 200,
                    message: 'Post generated id: ' + ref.id
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
    unsubscribe();

})

api.put('/:postId', function (req,res){
    var unsubscribe = firebase.auth().onAuthStateChanged(function (user){
        if (user){
            post_id = req.params.postId;
            var postData = {
                content: req.body.content
            }
            var oldData = admin.firestore().collection('Posts').doc(post_id).update(postData);
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
    unsubscribe();  

})

api.delete('/:postId', function (req,res){
    post_id = req.params.postId
    var unsubscribe = firebase.auth().onAuthStateChanged( function (user){
        if (user){
            var deleteDoc = admin.firestore().collection('Posts').doc(post_id).delete();
            deleteDoc.then(function (){
                res.json({
                    status: 200,
                    message: 'The post has been deleted'
                })
            }).catch(function (error){
                res.status(400).json({
                    status: 400,
                    message: 'There was an error deleting posts'
                })
            })
            
        } else{
            res.json({
                status: 401,
                message: 'you need to log in to acces this content'
            }) 
        }
    })
    unsubscribe();
})

api.put('/:postId/likes', function (req,res){
    var unsubscribe = firebase.auth().onAuthStateChanged(function (user){
        if (user){
            post_id = req.params.postId;
            data = admin.firestore().collection('Posts').doc(post_id).get().then(function (doc){
                if (req.body.likes){
                    likes = doc.get('likes');
                    likes = parseInt(likes) + 1;
                    admin.firestore().collection('Posts').doc(post_id).update({likes: likes})
                }else if (req.body.dislikes){
                    dislikes = doc.get('dislikes');
                    dislikes = parseInt(dislikes) + 1;
                    admin.firestore().collection('Posts').doc(post_id).update({dislikes: dislikes})
                }
                res.status(200).json({
                    status: 200,
                    message: 'the post has been liked'
                })
            }).catch(function (error){
                res.status(404).json({
                    status: 404,
                    message: 'the post could not be found'
                })
            })
        } else{
            res.json({
                status: 401,
                message: 'you need to log in to acces this content'
            })
        } 
    }) 
    unsubscribe();  
})

module.exports = api;  

