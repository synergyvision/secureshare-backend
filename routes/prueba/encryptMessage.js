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

api.get("/", function (req,res) {
        var au = firebase.auth();    
       au.signInWithEmailAndPassword('lugaliguori@gmail.com', 'ancestralmite8').then ( (response) => {
            var message = 'Hola alex'
            var uid = 'ev6vSVTprTObIYjM4hcVBH8xSlk1'
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