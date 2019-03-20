var express = require("express");
var admin = require("firebase-admin");
var firebase = require("firebase");
var bodyParser = require("body-parser");
var bcrypt = require("bcrypt");
var serviceAccount = require("../../credentials.json");
var config = require("../../credentials2.json");
var Cryptr = require("cryptr");
var openpgp = require("openpgp");
var seed = 'one dos tres cuatro cinco seix siete ocho nueve diez once doce';

var cryptr = new Cryptr(seed);

firebase.initializeApp(config);


db = admin.initializeApp({
  //credential: admin.credential.cert(config),
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://vision-sharekey.firebaseio.com",
  storageBucket: "gs://vision-sharekey.appspot.com"
});



var api = express();

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
api.get("/", function (req,res){
       var au = firebase.auth();    
       au.signInWithEmailAndPassword('ale@gmail.com', '12345678').then ( (response) => {
            var uid = 'ev6vSVTprTObIYjM4hcVBH8xSlk1';
            var options = {
                userIds: [{ name: 'ale', email: 'ale@gmail.com'}],
                numBits: 512,
                passphrase: 'test',
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
                storePrivateKey(uid,'test',privkey)
                res.json({
                    status:200,
                    message: "user Keys have been created and stored"
                })
            }).catch(function (error){
                res.send(error);
            })
    }).catch(function(error) {
         var code = error.code;
         var message = error.message;
         return res.json({
             status: code,
             message: message
         })
   })

})

api.listen(3000, function() {
    console.log("Express app started on port 3000.");
  });