var express = require("express");
var admin = require("firebase-admin");
var firebase= require("firebase");
var bodyParser = require("body-parser");
var speakeasy = require("speakeasy");
var QRCode = require("qrcode");
var nodemailer = require("nodemailer");
var Mnemonic = require('bitcore-mnemonic');

var api = express.Router();


const mailTransport = nodemailer.createTransport({
    service: "gmail",
})

api.use(bodyParser.urlencoded({
    extended: true
}));



api.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.header("Access-Control-Allow-Headers", "Origin,Authorization, X-Requested-With, Content-Type, Accept");
    next();
  });
 
 api.get("/:userid", function (req,res){
    var uid = req.params.userid;
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
            var db = admin.firestore();
            console.log(uid)
            db.collection('Users').doc(uid).get().then( function (snapshot){
                var user = snapshot.data();
                console.log(user);
                res.status(200).json({
                    status: 200,
                    message: "user data retrieved",
                    content: user
                })
            }).catch(function (error){
                res.json({
                    status: error.code,
                    message: error.message
                })
            })
    }).catch(function (error){
        res.status(401).json({
            status: error.code,
            message: error.message
        })
    }) 
})

api.put("/:userid" , function (req,res){
    var db = admin.firestore();
    var auth = firebase.auth();
    var uid = req.params.userid;
    var updateData = {
        lastName: req.body.lastName,
        firstName: req.body.firstName,
        phone: req.body.phone,
        username: req.body.username,
        bio: req.body.bio
    }
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        if (decodedToken.uid == uid) {
            db.collection('Users').doc(uid).update(updateData);
            console.log("se ha actualizado en la base de datos");
            res.json({
                status: 200,
                message: "Perfil actualizado"
            })
        }else{
            res.json({
                status: 401,
                message: 'token mismatch'
            })
        }
    }).catch(function (error){
        res.status(401).json({
            status: error.code,
            message: error.message
        })
    })
})

/*api.put("/:userid/resetPassword" , function (req,res){
    var au = firebase.auth();
    var uid = req.params.userid;
    var user = firebase.auth().currentUser;
    user.updatePassword(req.body.password).then(function(){
        console.log('password updated');
        res.json({
            status:200,
            message: 'the password has been updated'
        })
    }).catch(function(error){
        var code = error.code;
        var message = error.message;
        res.json({
            status: code,
            message: message
        })
    })
});*/



var storeKeys =  function (uid,pubkey,privkey,keyName){
    var db = admin.firestore();
    postPBData = db.collection('Users').doc(uid).collection('Keys');
    var newPostPBData = postPBData.add({
        PubKey: pubkey,
        PrivKey: privkey,
        name: keyName,
        default: false
    }).then(function (){ 
        console.log("Llaves resguardadas") 
    }).catch(function (error){
        res.status(400).json({
            status: error.code,
            message: error.message
        })
    })    
}



// store the keys received from client
api.post("/:userid/storeKeys", function (req,res){
    var uid = req.params.userid;
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        if (decodedToken.uid == uid){
            var pubkey = req.body.pubkey;
            var privkey = req.body.privkey;
            var keyName= req.body.keyname;
            storeKeys(uid,pubkey,privkey,keyName);
            console.log('Stored public keys for user ' + uid);
            res.status(200).json({
                status:200,
                message: 'The user keys have been received and stored'
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


var getKeys = function (uid){
    db = admin.firestore();
    keys = [];
    var i = 0;
   return db.collection('Users').doc(uid).collection('Keys').get().then(function(snapshot){
        snapshot.forEach(doc => {
            i ++;
            key = {
                name: doc.get('name'),
                publicKey: doc.get('PubKey'),
                privateKey: doc.get('PrivKey'),
                pass: doc.get('passphrase'),
                default: doc.get('default')
            }
            keys.push(key)            
        })
        return keys;
    })

}

api.get("/:userid/getKeys" , function (req,res){
    var uid = req.params.userid;
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        if (decodedToken.uid == uid){
            var keys = getKeys(uid);
            keys.then((keys) => {
                res.status(200).json({
                    message: 'Keys retrieved',
                    data: keys
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

api.delete("/:userid/deleteKey/:keyName", function (req,res){
    var uid = req.params.userid;
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        if (decodedToken.uid == uid){
            var keyname = req.params.keyName;
            admin.firestore().collection('Users').doc(uid).collection('Keys').where('name','==',keyname).get().then(function (querySnapshot){
                querySnapshot.forEach(function (doc){
                    docId = doc.id;
                    admin.firestore().collection('Users').doc(uid).collection('Keys').doc(docId).delete();
                    res.json({
                        status: 200,
                        message: 'Key succesfully deleted'
                    })
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

api.post("/:userid/recoverKey", function (req,res){
    var uid = req.params.userid;
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        if (decodedToken.uid == uid){
            var keyname = req.body.name;
            
            console.log(req.body);
            admin.firestore().collection('Users').doc(uid).collection('Keys').where('name','==',keyname).get().then(function (querySnapshot){
                querySnapshot.forEach(function (doc){
                    docId = doc.id;
                    admin.firestore().collection('Users').doc(uid).collection('Keys').doc(docId).get().then(function (doc){
                        if (doc){
                            res.status(200).json({
                                status: 200,
                                message: 'Key retrieved',
                                data: doc.data()
                            })
                        }else{
                            res.status(400).json({
                                status:404,
                                message: 'The key was not found'
                            })
                        }
                    }).catch(function (error){
                        res.status(400).json({
                            status: error.code,
                            message: error.message
                        })
                    })
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

api.put("/:userid/updateDefault", function (req,res){
    var uid = req.params.userid;
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        if (decodedToken.uid == uid){
            var name = req.body.name;
            admin.firestore().collection('Users').doc(uid).collection('Keys').where('default', '==', true).get().then(function (snapshot){
                if (!snapshot.empty){    
                    snapshot.forEach(function (doc){
                        admin.firestore().collection('Users').doc(uid).collection('Keys').doc(doc.id).update({default: false});
                        admin.firestore().collection('Users').doc(uid).collection('Keys').where('name','==',name).get().then(function (querySnapshot){
                            querySnapshot.forEach(function (document){
                                admin.firestore().collection('Users').doc(uid).collection('Keys').doc(document.id).update({default: true});
                                res.status(200).json({
                                    status: 201,
                                    message: 'user default key updated'
                                })
                            })
                        }).catch(function (error){
                            res.status(400).json({
                                status: error.code,
                                message: error.message
                            })
                        })
                    })
                }else{
                    admin.firestore().collection('Users').doc(uid).collection('Keys').where('name','==',name).get().then(function (querySnapshot){
                        querySnapshot.forEach(function (document){
                            admin.firestore().collection('Users').doc(uid).collection('Keys').doc(document.id).update({default: true});
                            res.status(200).json({
                                status: 201,
                                message: 'user default key updated'
                            })
                        })
                    }).catch(function (error){
                        res.status(400).json({
                            status: error.code,
                            message: error.message
                        })
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

api.post("/:userid/getPublicKey", function (req,res){
    uid = req.params.userid;
    id = req.body.id;
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        if (decodedToken.uid == uid){
            admin.firestore().collection('Users').doc(id).collection('Keys').where('default','==',true).get().then( function (querySnapshot){
                querySnapshot.forEach( function (doc){
                    publicKey = doc.get('PubKey');
                    name = doc.get('name');
                    res.status(200).json({
                        status: 200,
                        message: 'Public Key retrieved',
                        data: publicKey,
                        name: name
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

api.post("/:userid/getMultipleKeys", function (req,res){
    uid = req.params.userid;
    ids = JSON.parse(req.body.id);
    keys = [];
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(async (decodedToken) => {
        if (decodedToken.uid == uid){
            for (i = 0; i < ids.length; i++){
                await admin.firestore().collection('Users').doc(ids[i]).collection('Keys').where('default','==',true).get().then( function (querySnapshot){
                    querySnapshot.forEach( function (doc){
                        publicKey = doc.get('PubKey');
                        console.log(publicKey);
                        keys.push(publicKey);
                    })
                }).catch( function (error){
                    res.status(400).json({
                        status: error.code,
                        message: error.message
                    })
                })
                if (i == (ids.length-1)){
                    res.status(200).json({
                        status: 200,
                        data: keys
                    })
                }

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

var readMessage = async (message) => {
    m =  await openpgp.message.readArmored(message)
    return m
}

var decryptPrivKey = async (key,pass) => {
    priv = (await openpgp.key.readArmored(key)).keys[0]
    await priv.decrypt(pass)
    return priv
}

api.get('/:userid/post', function (req,res){
    var uid = req.params.userid;
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        if (decodedToken.uid == uid){
            admin.firestore().collection('Posts').where('user_id','==',uid).get().then(function (snapshot){
                if (snapshot){
                    var posts = snapshot.data();
                    res.status(200).json({
                        status: 200,
                        message: 'Users Post retrieved succesfully',
                        data: posts
                    })
                }else{
                    res.status(404).json({
                        status: 404,
                        message: 'No Posts found',
                        data: posts
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

var contactInfo = function (id) {
    return admin.firestore().collection('Users').doc(id).get().then( function (snapshot){
        var info = {
            id: id,
            name: snapshot.get('name'),
            lastname: snapshot.get('lastname'),
            bio: snapshot.get('bio'),
            photo: snapshot.get('profileUrl')
        }
        return info;
    }).catch(function (error){
        console.log(error.code);
        console.log(error.message);
    })  
}

api.get('/:userid/contacts', function (req,res) {
    var uid = req.params.userid;
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        if (decodedToken.uid == uid){
            contacts = []
            var i = 0
            admin.firestore().collection('Users').doc(uid).collection('contacts').get().then((snapshot) => {
                if (!snapshot.empty){
                    snapshot.forEach( doc => {
                        id = doc.get('Iduser');
                        userInfo = contactInfo(id);
                        userInfo.then((userInfo) => {
                            i++;
                            contacts.push(userInfo);
                            if (i == snapshot.size){
                                res.status(200).json({
                                    status: 200,
                                    message: 'User contacts retrieved succesfully',
                                    data: contacts
                                })
                            }
                        })
                    })
                }else{
                    res.status(404).json({
                        status: 404,
                        message: 'User has no contacts'
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

var getChats = async (uid) => {
    db = admin.firestore();
    chats = [];
    var i =0;
    chatsCollection = await db.collection('Users').doc(uid).collection('Chats').get();
    for await (doc of chatsCollection.docs){
        await db.collection('Chats').doc(doc.id).get().then(function (snap){
            data = snap.data();
            chats.push(data);
        }).catch(function (errot){
            console.log(error)
        })
    }
    return chats;

}

api.get('/:userid/chats', function (req,res) {
    uid = req.params.userid;
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        if (decodedToken.uid == uid){
            var chats = getChats(uid);
            chats.then((chats) =>{
                res.status(200).json({
                    message: 'Chats retrieved',
                    data: chats
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

api.delete('/:userid/chats/:chatid', function (req,res){
    uid = req.params.userid;
    chatId = req.params.chatid;
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        if (decodedToken.uid == uid){
           messages =  admin.firestore().collection('Users').doc(uid).collection('Chats').doc(chatId).collection('Messages').get();
           messages.then(function(snapshot){
                snapshot.forEach( doc =>{
                    admin.firestore().collection('Users').doc(uid).collection('Chats').doc(chatId).collection('Messages').doc(doc.id).delete();                    
                })
                admin.firestore().collection('Users').doc(uid).collection('Chats').doc(chatId).delete()
                res.status(200).json({
                    status: 200,
                    message: 'User copy of messages deleted'
                })    
            }).catch(function (error){
                console.log(error.message)
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


module.exports = api;