var express = require("express");
var admin = require("firebase-admin");
var bodyParser = require("body-parser");
var bcrypt = require("bcrypt");
var nodemailer = require("nodemailer");

var api = express.Router();

api.use(bodyParser.urlencoded({ extended: false }));

api.post("/", function (req, res){

        db = admin.database();

        db.ref().child("Users").orderByChild("email").equalTo(req.body.email).once("value").then(snapshot => {
            if(snapshot.exists()){
                db.ref().child("Users").orderByChild("email").equalTo(req.body.email).once("child_added").then(snapshot => {
                    bcrypt.compare(req.body.password,snapshot.val().password, function (err, resp){
                        if (snapshot.exists()){
                            if( resp == true){
                                res.json({
                                    status: 200,
                                    message: "The user has logged in"
                                });
                            } else {
                                res.json({
                                    status: 400,
                                    message: "The password is incorrect"
                                });
                            }
                        }
                    });
                });    
            } else{
                res.json({
                    status: 404,
                    message: "User with that email has not been found"
                })
            }

        });
});

api.post("/resetPassword", function (req , res){
   
    console.log(req.body.email);
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth:{
            user: 'lugaliguori@gmail.com',
            pass: 'ancestralmite'

        }
      });
      // setup e-mail data with unicode symbols
      console.log("sending email......")
      var mailOptions = {
        from: '"lugaliguori@gmail.com" <lugaliguori@gmail.com>', // sender address
        to: req.body.email, // list of receivers
        subject: 'Recuperacion contrasena', // Subject line
        text: 'Este es un correo de prueba de recuperacion de contrasena'
      };
      console.log("email sent");

      transporter.sendMail(mailOptions, function (err, info) {
        if(err)
          console.log(err)
        else
          res.json({
                status: 200,
                message: "Check your inbox for an email about resetting your password"
          })
          console.log(info);
     });

});


module.exports = api;