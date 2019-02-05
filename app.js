var express = require("express");
var apiRegister= require("./routes/signup");
var apiLogin= require("./routes/login")


var admin = require("firebase-admin");
var firebase = require("firebase");

var serviceAccount = require("./credentials.json");

var config = require("./credentials2.json");

firebase.initializeApp(config);

db = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://vision-sharekey.firebaseio.com"
});


var app = express();

app.get("/", function(req,res){
  res.send("Servidor arriba")
});

app.use("/signup", apiRegister);
app.use("/login", apiLogin);

app.listen(3000, function() {
    console.log("Express app started on port 3000.");
  });