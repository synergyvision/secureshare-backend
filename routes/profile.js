var express = require("express");
var admin = require("firebase-admin");
var firebase= require("firebase");
var bodyParser = require("body-parser");
var speakeasy = require("speakeasy");
var openpgp = require("openpgp");
var QRCode = require("qrcode");
var nodemailer = require("nodemailer");
var Cryptr = require("cryptr");

var api = express.Router();

var seed = 'sharekey-seed';

var cryptr = new Cryptr(seed);

const mailTransport = nodemailer.createTransport({
    service: "gmail",
})

api.use(bodyParser.urlencoded({
    extended: true
}));



api.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });
 
 api.get("/:userid", function (req,res){
    firebase.auth().onAuthStateChanged( function (user){
        if (user){
            var db = admin.firestore();
            var uid = req.params.userid;
            db.collection('Users').doc(uid).get().then( function (snapshot){
                console.log(snapshot.data())
                var user = snapshot.data();
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
        }else{
            res.status(401).json({
                message: 'You need to be logged in to access content'
            })
        }
    })        
})

api.put("/:userid" , function (req,res){
    var db = admin.firestore();
    var auth = firebase.auth();
    var uid = req.params.userid;
    console.log(req.body);
    updateData = {
        email: req.body.email,
        lastname: req.body.lastname,
        name: req.body.name,
        phone: req.body.phone,
        username: req.body.username
    }
    db.collection('Users').doc(uid).update(updateData);
    console.log("se ha actualizado en la base de datos")
    if (req.body.email != 'undefined'){
        auth.onAuthStateChanged(function (user){
            if (user) {
                user.updateEmail(req.body.email).then(function() {
                    console.log("se ha actualizado el correo en auth")
                    res.json({
                        status: 200,
                        message: "Perfil actualizado"
                    })
                }).catch(function (error){
                    res.json({
                        status: error.code,
                        message: error.message
                    })
                }) 
            }           
        })
    }else{
        res.json({
            status: 200,
            message: "Perfil actualizado"
        })
    }    
})

api.put("/:userid/resetPassword" , function (req,res){
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
});

var encryptKey = function(key) {
    console.log("encrypting.....")
    encryptedKey = cryptr.encrypt(key)
    return encryptedKey;
}
var decryptKey = function(key){
    decryptedKey = cryptr.decrypt(key);
    return decryptedKey;
}

var storePublicKey =  function (uid,key){
    var db = admin.firestore();
    console.log(uid,key)
    postPBData = db.collection('PubKeys').doc(uid);
    var newPostPBData = postPBData.set({
        PubKey: key,
    }).then(function (){ 
        console.log("Llave publica resguardada") 
    }).catch(function (error){
        res.status(400).json({
            status: error.code,
            message: error.message
        })
    })    
}

var storePrivateKey = function (uid,Pass,Key){
    var db = admin.firestore();
    var securedKey = encryptKey(Key)
    var securedPass = encryptKey(Pass)
    postPKData = db.collection('PrivKeys').doc(uid);
    var newPKData = postPKData.set({
        PrivKey: securedKey,
        passphrase: securedPass,
    }).then( function(){
        console.log("llave privada y pass asegurados")
    }).catch(function (error){
        res.status(400).json({
            status: error.code,
            message: error.message
        })
    })
}


// generating a new pgp key pair
api.post("/:userid/keys", function (req,res){
    firebase.auth().onAuthStateChanged ( function (user){
        if (user){
            var uid = req.params.userid;
            var options = {
                userIds: [{ name: req.body.name, email: req.body.email}],
                numBits: 4096,
                passphrase: req.body.passphrase,
            }
            console.log("Generating Keys")
            openpgp.generateKey(options).then(function(key){
                var privkey = key.privateKeyArmored;
                var pubkey = key.publicKeyArmored;
                var revocationCertificate = key.revocationCertificate;
                console.log("The keys have been generated");
                console.log("Asegurandolas en BD")
                storePublicKey(uid,pubkey)
                console.log("llave publica guardada")
                storePrivateKey(uid,req.body.passphrase,privkey)
                res.json({
                    status:200,
                    message: "user Keys have been created and stored"
                })
            }).catch(function (error){
                res.send(error);
            })
        }else{
            res.status(401).json({
                message: 'You need to be logged in to access content'
            })
        }    
    })

})

var getPrivKeys = function (uid){
    db = admin.firestore();
   return db.collection('PrivKeys').doc(uid).get().then(function(snapshot){
        var key = snapshot.get(PrivKey);
        privKey = decryptKey(key)
        return privKey
    })

}

var getPublicKeys = function(uid){
    db = admin.firestore();
    return db.collection('PubKeys').doc(uid).get().then(function(snapshot){
        var key = snapshot.get('PubKey');
        console.log(snapshot.data())
        console.log(key);
        return key
    }).catch (function(err){
        res.send(err);
    })
}

var getPass = function(uid){
    db = admin.firestore();
    return db.collection('PrivKeys').doc(uid).get().then(function(snapshot){
        var key = snapshot.get(passphrase);
        passphrase = decryptKey(key)
        return passphrase
    }).catch (function(err){
        res.send(err)
    })
}

var readPubKey = async (key) => {
    var k = (await openpgp.key.readArmored(key)).keys;
    return k
}

api.post("/:userid/encrypt", function (req,res) {
    firebase.auth().onAuthStateChanged( function (user){
        if (user){
            var message = req.body.message
            var uid = req.params.userid
            var pubKeys = getPublicKeys(uid);
            pubKeys.then((pubKeys) => {
                console.log(pubKeys);
                var decryptedPublic = readPubKey(pubKeys);
                decryptedPublic.then((decryptedPublic) => {
                    var options = {
                        message: openpgp.message.fromText(message),
                        publicKeys: decryptedPublic,
                    }
                    openpgp.encrypt(options).then((ciphertext) => {
                        encryptedMessage = ciphertext.data;
                        res.status(200).format({
                            text: function(){
                                res.send(encryptedMessage)
                            }
                        })
                    }).catch(function (err){
                        res.send(err);
                    })
                }).catch(function (err){
                    res.send(err);
                })
            }).catch(function (err){
                res.send(err);
            })
        }else{
            res.status(401).json({
                message: 'You need to be logged in to access content'
            })
        }    
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

api.post("/:userid/decrypt", function (req,res) {
    firebase.auth().onAuthStateChanged( function (user){
        if (user){
            var message = req.body.message;
            console.log(message);
            var uid = req.params.userid;
            var privKey = getPrivKeys(uid);
            privKey.then( (privKey) => {
                console.log("got key")
                pass = getPass(uid);
                pass.then( (pass) => {
                    console.log('got pass')
                    var key = decryptPrivKey(privKey,pass);
                    key.then((key)=>{
                        console.log("decrypted key")
                        var text = readMessage(message);
                        text.then((text) => {
                            console.log("read text")
                            var options = {
                                message: text,
                                privateKeys: key
                            }
                            openpgp.decrypt(options).then(plaintext => {
                                res.json({
                                    status:200,
                                    message: 'data decrypted',
                                    data: plaintext
                                })
                            }).catch(function (error){
                                res.send(error)
                            })
                        }).catch(function (error){
                            res.send(error)
                        }) 
                    }).catch(function(error){
                        res.send(error)
                    })
                }).catch(function(error){
                    res.send(error)
                })
            }).catch(function(error){
                res.send(error)
            })
        }else{
            res.status(401).json({
                message: 'You need to be logged in to access content'
            })
        } 
    })       
})


api.get('/:userid/post', function (req,res){
    var uid = req.params.userid;
    firebase.auth().onAuthStateChanged( function (user){
        if (user){
            admin.firestore().collection('Posts').where('user_id','==',uid).get().then(function (snapshot){
                if (snapshot){
                    var posts = snapshot.data();
                    console.log(posts)
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
        } else {
            res.status(401).json({
                message: 'You need to be logged in to access content'
            })
        }
    })
})


api.get('/:userid/contacts', async (req,res) => {
    var uid = req.params.userid;
    firebase.auth().onAuthStateChanged(function (user){
        if (user){
            contatcs = []
            admin.firestore().collection('Users').doc(uid).collection('contacts').then(function (snapshot){
                await (snapshot.forEach( doc => {
                    contact = {
                        user_id: doc.data()
                    }
                    contacts.push(contact)
                }))
                console.log(contacts);
                res.status(200).json({
                    status: 200,
                    message: 'User contacts retrieved succesfully',
                    data: contacts
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
                message: 'You need to be loggen in to access content'
            })
        }
    })
})

var getChats = function (chatKeys){
    chats =[];
    console.log('here');
    
}

api.get('/:userid/chats', function (req,res) {
    uid = req.params.userid;
    firebase.auth().onAuthStateChanged(function (user){
        if (user){
            user_chats = [];
            chats = admin.firestore().collection('Chats');
            i = 0;
            chats.get().then(function (snapshot){
                snapshot.forEach(doc => {
                    chats.doc(doc.id).collection('Participants').where(uid, '==', true).get().then(snap => {
                        snap.forEach(data => {
                            chat = {
                                [doc.id]: doc.data()
                            }
                            user_chats.push(chat)
                        })
                        if (i == snapshot.size){
                            console.log(user_chats);
                            console.log('Chats retrieved for user ', uid)
                            res.status(200).json({
                                status: 200,
                                messagge: 'User chats retrieved',
                                data: user_chats
                            }) 
                        }
                    }).catch(function (error){
                        res.status(400).json({
                            status: error.code,
                            message: error.message
                        })
                    })
                    i++;
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
                message: 'You need to be loggen in to access content'
            })
        }
    })
})





// the following is for the 2 factor auth (untested)
var setSecretKey = function (key, uid){
     db.ref().child("Users/" + uid + "/token").set(key)
 }

 var getSecretKey = function (uid){
    return db.ref("Users/" + uid + "/token").once("value")
           .then( function (snapshot){
                return snapshot.val();
           })
 }

var updateSecretKey = function (uid, token){
    token.secret = token.tempSecret;
    token.activated = true;
    setSecretKey(token,uid);
}

var deactivateSecretKey = function(uid){
    var token = {enabled: false, activated: false};
    setSecretKey(token,uid);
}

var sendQRCode = function (data_url,res){
    const mailOptions = {
        from: "'Vision sharekey' <noreply@firebase.com>",
        to: response.email,
        subject: "Has activado la opción de 2FA",
        html: '<h3>Activación de 2FA</h3>' +
              '<p><br>' + 
              'Es necesario que escanee el código QR a través de Google Autenticator o Authy.</p><br>' + 
              '<b>Codigo:</b> <img src="cid:qrcode"/>',
          attachments: [{
          filename: "image.png",
          path: data_url,
          cid: "qrcode" //same cid value as in the html img src
      }]
      };

    console.log(mailOptions.html)  

    return mailTransport.sendMail(mailOptions)
      .then(() => {
          console.log("mail sent")
      }).catch((error) => console.error("There was an error while sending the email:",error));
}

var verifySecret = function(otp, uid) {
    return new Promise((resolve, reject) => {
    getSecretKey(uid)
        .then((token) => {
            if (token.activated) {
                reject("ERROR.2FA.user_is_verified");
            }
            var verified = speakeasy.totp.verify({
                secret: token.tempSecret, // Secret of the logged in user
                encoding: "base32",
                token: otp
            });
            if (verified) {
                console.log("107");
                console.log("USER Is VERIFIED");
                // we need to update the secret
                updateSecretKey(uid, token)
                resolve("SUCCESS");
            }
            else {
                console.log("NOT VALID OTP");
                reject("ERROR.2FA.invalid_otp");
            }
        })
        .catch((error) => {
            console.log("WHAT HAPPENED");
            console.log(error);
            reject(error);
        });
    });
};

var verifyOTP = function(uid, otp) {
    getSecretKey(uid)
    .then((user) => {
        var verified = speakeasy.totp.verify({
            secret: user.secret,
            encoding: "base32",
            token: otp,
            window: 2
        });
        if (verified){
            return "SUCCESS";
        }
        return "ERROR.2FA.invalid_otp";
    })
    .catch((error) => {
        return error;
    });
}

// Verifies the ID Token generated by Firebase Auth on the Console
var verifyUser = function(token) {
    return new Promise((resolve, reject) => {
    admin.auth()
        .verifyIdToken(token)
        .then((user) => {
            // If user email is verified we can activate 2FA
            // if (user.email_verified) {
                resolve(user);
            //} else {
            //    reject("NO_VERIFIED_EMAIL");
            //}

        })
        .catch((error) => {
            console.log("143");
            console.log(error);
            reject ("ERROR.2FA.invalid_id_token");
        })
    }) 
};

api.post('/enable2factor', function (){
    verifyUser(req.body.uid).then((user) => {
        const secret = speakeasy.generateSecret({length: 10});
        var url = speakeasy.otpauthURL({secret: secret.ascii, label: 'sharekey', algorithm: 'sha512'});
        QRCode.toDataURL(url, (err,data_url)=> {
            setSecretKey({
                tempSecret: secret.base32,
                dataURL: data_url,
                otpURL: url,
                activated: false,
                enabled: true,
            },user.uid);
            sendCodeToEmail(data_url,user);
            return res.json({
                message: "Verify_otp",
                tempSecret: secret.base32,
                dataURL,
                otpURL: secret.otpauth_url,
            });
        });
    }).catch((error) => {
        return res.status(400).send(error);
    })
})

api.post("/disable2factor", function (req,res){
    verifyUser(req.body.uid).then ((user) => {
        deactivateSecretKey(user.id);
        var message = "Deactivated 2 factor authenthication"
        res.status(200).semd(message);
    }).catch((error) => {
        console.log(error);
        res.status("400").send(error);
    }); 

})

api.post("/twofactor/setup/verify", function(req, res){
    verifyUser(req.body.idToken)
    .then((user) => {
        verifySecret(req.body.otp, user.uid)
        .then((message) => {
            console.log(message);
            return res.status(200).sendStatus(message);
        })
        .catch((error) => {
            console.log(error);
            return res.status(400).send(error);
        });
    })
    .catch((error) => {
        console.log(error);
        return res.status(400).send(error);
    });
});

// Verifies an OTP

api.post("/twofactor/verify" , function(req, res){
    verifyUser(req.body.idToken)
    .then((user) => {
        verifyOTP(user.uid, req.body.otp)
        .then((response) => {
            console.log("207");
            return res.status(200).send(response);
        })
        .catch((error) => {
            console.log(error);
            return res.status(400).send(error);
        });
    })
    .catch((error) => {
        return res.status(400).send(error);
    });
});



module.exports = api;