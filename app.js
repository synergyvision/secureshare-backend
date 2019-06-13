var express = require("express");
var apiRegister= require("./routes/signup");
var apiLogin= require("./routes/login");
var apiLogout= require("./routes/logout");
var apiProfile= require("./routes/profile");
var apiPost = require("./routes/posts");
var apiComments = require("./routes/comment");
var apiContacts = require("./routes/contacts");
var apiChats = require("./routes/chats");
var apiMessage = require("./routes/messages");
var apiSurveys = require("./routes/surveys");
var apiFiles = require("./routes/files");
var mnemonic = require("./routes/mnemonic");

 var admin = require("firebase-admin");
 var firebase = require("firebase");

// for initalizing local firebase

//var serviceAccount = require("./credentials.json");
//var config = require("./credentials2.json");

//initialize firebase on server, comment when using locally

var config = {
  apiKey: process.env.firebase_apikey,
  authDomain: process.env.firebase_authDomain,
  databaseURL: process.env.firebase_databaseURL
}

firebase.initializeApp(config);


//initialize firebase admin on server, comment when using locally

var serviceAccount = {
  type: process.env.firebase_type,
  project_id: process.env.firebase_project_id,
  private_key_id: process.env.firebase_private_key_id,
  private_key: process.env.firebase_private_key.replace(/\\n/g,'\n'),
  client_email: process.env.firebase_client_email,
  client_id: process.env.firebase_client_id,
  auth_uri: process.env.firebase_auth_uri,
  token_uri: process.env.firebase_token_uri,
  auth_provider_x509_cert_url: process.env.firebase_auth_provider_x509_cert_url,
  client_x509_cert_url: process.env.firebase_client_x509_cert_url
}

db = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://vision-sharekey.firebaseio.com",
  storageBucket: "gs://vision-sharekey.appspot.com"
});



const firestore = admin.firestore();
const settings = {timestampsInSnapshots: true};
firestore.settings(settings);
var app = express();

app.get("/", function(req,res){
  res.send("Servidor arriba")
});

app.use("/signup", apiRegister);
app.use("/login", apiLogin);
app.use("/logout", apiLogout);
app.use("/profile",apiProfile);
app.use("/posts", apiPost);
app.use("/comments", apiComments);
app.use("/contacts",apiContacts);
app.use("/chats", apiChats);
app.use("/messages",apiMessage);
app.use("/surveys",apiSurveys);
app.use("/upload", apiFiles);
app.use("/mnemonic",mnemonic);

app.listen(process.env.PORT, function() {
    console.log("Express app started on heroku server");
  })

/*app.listen(3000, function() {
    console.log("Express app started on port 3000.");
});*/