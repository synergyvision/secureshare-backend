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


const firestore = admin.firestore();
const settings = {timestampsInSnapshots: true};
firestore.settings(settings);
var api = express();

api.use(bodyParser.urlencoded({
    extended: true
}));



api.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });
 
var decryptKey = function(key){
    decryptedKey = cryptr.decrypt(key);
    return decryptedKey;
}

var getPrivKeys = function (uid){
    db = admin.firestore();
   return db.collection('PrivKeys').doc(uid).get().then(function(snapshot){
        var key = snapshot.get('PrivKey');
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
        var key = snapshot.get('passphrase');
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


var readMessage = async (message) => {
    m =  await openpgp.message.readArmored(message)
    return m
}

var decryptPrivKey = async (key,pass) => {
    priv = (await openpgp.key.readArmored(key)).keys[0]
    await priv.decrypt(pass)
    return priv
}

api.post("/", function (req,res) {
    var au = firebase.auth();  
    au.signInWithEmailAndPassword('ale@gmail.com', '12345678').then ( (response) => {
            var message = req.body.message;
            var uid = 'ev6vSVTprTObIYjM4hcVBH8xSlk1';
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