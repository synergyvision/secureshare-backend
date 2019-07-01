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

var getUserInfo = function (id){
    return admin.firestore().collection('Users').doc(id).get().then( function (snapshot){
        name = snapshot.get('name');
        lastname = snapshot.get('lastname')
        return name + ' ' + lastname;
    }).catch(function (error){
        res.json({
            status: error.code,
            message: error.message
        })
    })
}

var getUserPhoto = function (id){
    return admin.firestore().collection('Users').doc(id).get().then( function (snapshot){
        picture = doc.get('profileUrl');
        return picture;
    }).catch(function (error){
        res.json({
            status: error.code,
            message: error.message
        })
    })
}


api.get('/', function (req,res){
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        posts = [];
        if (decodedToken.uid){
            admin.firestore().collection('Posts').get().then(async (snapshot) => {
                 for (doc of snapshot.docs){
                    name = await getUserInfo(doc.get('user_id'));
                    userPicture = await getUserPhoto(doc.get('user_id'))
                    post = {
                        id: doc.id,
                        data: doc.data(),
                        name: name,
                        userPicture : userPicture

                    }
                    posts.push(post);
                }
                res.status(200).json({
                    status: 200,
                    message: 'posts retrieved',
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

api.get('/:userId/:postId', function (req,res){
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        var uid = req.params.userId;
        var post = req.params.postId;
        if (decodedToken.uid == uid){
            admin.firestore().collection('Posts').doc(post).get().then(async (doc) =>{
                name = await getUserInfo(doc.get('user_id'));
                userPicture = await getUserPhoto(doc.get('user_id'))
                post = {
                    id: doc.id,
                    data: doc.data(),
                    name: name,
                    userPicture : userPicture
                }
                res.status(200).json({
                    status: 200,
                    message: 'post retrieved',
                    data: post
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

api.post('/', function (req,res){
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        if (decodedToken.uid){
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
                 dislikes: 0,
                 timestamp: Date.now()
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

api.put('/:postId', function (req,res){
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        if (decodedToken.uid){
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

api.delete('/:postId', function (req,res){
    post_id = req.params.postId
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        if (decodedToken.uid){
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

api.put('/:postId/likes', function (req,res){
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        if (decodedToken.uid){
            post_id = req.params.postId;
            user_id = req.body.likedBy;
            data = admin.firestore().collection('Posts').doc(post_id).get().then(function (doc){
                if (req.body.likes){
                    likes = doc.get('likes');
                    likes = parseInt(likes) + 1;
                    if (doc.get('reactions.'+user_id) == 'disliked'){
                        dislikes = doc.get('dislikes');
                        dislikes = parseInt(dislikes) - 1;
                        admin.firestore().collection('Posts').doc(post_id).update({dislikes: dislikes});
                    }
                    admin.firestore().collection('Posts').doc(post_id).update(
                        {likes: likes,
                        ['reactions.'+user_id]: 'liked'}
                    )
                }else if (req.body.dislikes){
                    dislikes = doc.get('dislikes');
                    dislikes = parseInt(dislikes) + 1;
                    if (doc.get('reactions.'+user_id) == 'liked'){
                        likes = doc.get('likes');
                        likes = parseInt(likes) - 1;
                        admin.firestore().collection('Posts').doc(post_id).update({likes: likes});
                    }
                    admin.firestore().collection('Posts').doc(post_id).update(
                        {dislikes: dislikes,
                        ['reactions.'+user_id]: 'disliked'}
                    )
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

