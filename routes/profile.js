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
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });
 
 api.get("/:userid", function (req,res){
    var db = admin.database();
    var uid = req.params.userid;
    console.log(uid);
    db.ref().child('Users/' + uid).once("value").then( function (snapshot){
        var user = snapshot.val();
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

})

api.put("/:userid" , function (req,res){
    var db = admin.database();
    var auth = firebase.auth();
    var uid = req.params.userid;
    updateData = {
        email: req.body.email,
        lastname: req.body.lastname,
        name: req.body.name,
        phone: req.body.phone,
        username: req.body.username
    }
    db.ref().child('Users/' + uid).update(updateData);
    console.log("se ha actualizado en la base de datos")
    if (req.body.email != 'undefined'){
        auth.onAuthStateChanged(function (user){
            if (user) {
                user.updateEmail(req.body.email).then(function() {
                    console.log("se ha actualizado el correo en auth")
                }).catch(function (error){
                    res.json({
                        status: error.code,
                        message: error.message
                    })
                }) 
            }           
        })
    }    
    res.json({
        status: 200,
        message: "Perfil actualizado"
    })
})

var encryptKey = function(key) {
    console.log("encrypting.....")
    encryptedKey = cryptr.encrypt(key)
    return encryptedKey;
}
var decryptKey = function(key){
    console.log("decrypting......")
    decryptedKey = cryptr.decrypt(key);
    return decryptedKey;
}

var storePublicKey =  function (uid,key){
    var db = admin.database();
    securedKey = encryptKey(key);
    postPBData = db.ref().child("PubKeys/" + uid);
    var newPostPBData = postPBData.set({
        PubKey: securedKey,
    }, function (error){
        if (error){
            res.json({
                status: error.code,
                message: error.message
            })
        }
    }); 
    console.log("Llave publica resguardada") 
}

var storePrivateKey = function (uid,Pass,Key){
    var db = admin.database();
    var securedKey = encryptKey(Key)
    var securedPass = encryptKey(Pass)
    postPKData = db.ref().child("PrivKeys/" + uid);
    var newPKData = postPKData.set({
        PrivKey: securedKey,
        passphrase: securedPass,
    }, function (error){
        if (error){
            res.json({
                status: error.code,
                message: error.message
            })
        }    
    });
    console.log("llave privada y pass asegurados")
}


// generating a new pgp key pair
api.post("/:userid/keys", function (req,res){
    var uid = req.params.userid;
    var options = {
        userIds: [{ name: req.body.name, email: req.body.email}],
        numBits: 512,
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

})

var getPrivKeys = function (uid){
    db = admin.database();
    db.ref().child("PrivKeys/" + uid).once('value').then(function(snapshot){
        var key = snapshot.val().PrivKey;
        privKey = decryptKey(key)
        console.log(privKey)
        return privKey

    })
}

var getPublicKeys = function(uid){
    db = admin.database();
    db.ref().child("PubKeys/" + uid).once('value').then(function(snapshot){
        var key = snapshot.val().PubKey;
        public = decryptKey(key)
        return public
    })
}

var getPass = function(uid){
    db = admin.database();
    db.ref().child("PrivKeys/" + uid).once('value').then(function(snapshot){
        var key = snapshot.val().passphrase;
        passphrase = decryptKey(key)
        return passphrase
    }).catch (function(err){
        res.send(err)
    })
}


api.post("/:userid/encrypt", function (req,res) {
    var message = req.body.message
    var uid = req.params.userid
    getPrivKeys(uid).then((keys) =>{

    }).catch (function (err){
        res.send(err)
    })

});






// the following is for the 2 factor auth
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