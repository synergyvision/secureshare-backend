var express = require("express");
var openpgp = require('openpgp');
var admin = require("firebase-admin");
var fire = require("firebase");
var bodyParser = require("body-parser");
var nodemailer = require("nodemailer");
//var keys = require('../keys.json');
var api = express.Router();

api.use(bodyParser.urlencoded({ extended: false }));

api.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, Authorization, X-Requested-With, Content-Type, Accept");
    next();
  });
 
  var decryptPassword = async (string) => {
    //passphrase = keys.server_passphrase;
    //privateKey = keys.server_private_key;
    var privateKey = process.env.server_private_key;
    console.log(privateKey);
    console.log(await openpgp.key.readArmored(privateKey))
    var privKeyObj = (await openpgp.key.readArmored(privateKey)).keys[0]
	await privKeyObj.decrypt(passphrase)
	const options = {
		message: await openpgp.message.readArmored(string),
		privateKeys: [privKeyObj]           
	}

	return openpgp.decrypt(options).then(plaintext => {
		decrypted = plaintext.data;
		return decrypted
	})

}

api.post("/", function (req, res){
    var db = admin.database();
    var au = fire.auth();    
       password = decryptPassword(req.body.password);
        password.then(function (password){
        au.signInWithEmailAndPassword(req.body.email,password).then ( (response) => {
                au.currentUser.getIdToken(true).then(function(idToken) {
                    res.status(200).json({
                        status: 200,
                        message: 'User has logged in',
                        uid: au.currentUser.uid,
                        token: idToken
                    })
                }).catch(function(error) {
                        console.log(error);
                        res.status(400).json({
                            status: error.code,
                            message: error.message 
                        })
                });
        }).
        catch(function(error) {
                var code = error.code;
                var message = error.message;
                return res.json({
                    status: code,
                    message: message
                })
        })
    })    

});

api.post("/sendEmail", function (req , res){
    var au = fire.auth();   
    au.sendPasswordResetEmail(req.body.email).then(function(){
        res.json({
            status: 200,
            message: 'An email has been sent check your inbox'

        })
    }).catch(function (error){
        var code = error.code;
        var message = error.message;
        return res.json({
            status: code,
            message: message
        })
    });

});

api.get("/activeUser", function (req,res) {
    var au = fire.auth();
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded)
        .then(function(decodedToken) {
            var uid = decodedToken.uid;
                res.json({
                    status: 200,
                    message: uid
                })
        }).catch(function(error) {
            res.json({
                message: 'no user is logged in'
            })
        });
})


module.exports = api;