var express = require("express");
var openpgp = require("openpgp");
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
var apiKeys = require("./routes/config");
var apiFiles = require("./routes/files");
var mnemonic = require("./routes/mnemonic");
var apiRepo = require("./routes/repos");



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

var server = require('http').Server(app);

app.get("/", function(req,res){
  res.send("Servidor arriba")
});

io = require('socket.io')(server);

io.on('connection', function (socket){
    console.log('new user connection')
    socket.on('subscribeSurvey', function (data){
      ref = admin.firestore().collection('Surveys')
      var observer = ref.onSnapshot(querySnapshot => {
        let changes = querySnapshot.docChanges();
        changes.forEach(changes => {
          if (changes.type == 'added'){
            socket.emit('updateSurveys')
          }
        })
      }, err => {
        console.log(`Encountered error: ${err}`);
      });
    })

    socket.on('subscribeMessages',function (data){
      messagesRef = admin.firestore().collection('Users').doc(data).collection('Messages').where('tray','==','inbox');
      var messageObserver = messagesRef.onSnapshot(docSnapshot => {
        let MessageChanges = docSnapshot.docChanges();
        MessageChanges.forEach(MessageChanges => {
          if (MessageChanges.type == 'added'){
              socket.emit('updateMessages');          
          }
        })
      }, err => {
        console.log(err)
      });
    })

    socket.on('subscribeRequest', function (data){
      var requestRef = admin.firestore().collection('Requests').where('id_to','==',data).where('status','==',false);
      var RequestObserver = requestRef.onSnapshot(querySnapshot => {
        let newRequest = querySnapshot.docChanges();
        newRequest.forEach(newRequest =>{
          if (newRequest.type == 'added'){
            socket.emit('updateRequests');   
          }
        })  
      }, err => {
        console.log(err)
      });
    })

    socket.on('subscribeNewChats', function (data){
      console.log('iniated observable for chats ' + data);
      var chatsRef = admin.firestore().collection('Users').doc(data).collection('Chats')
      var chatsOberserver = chatsRef.onSnapshot(querySnapshot => {
        let newChat = querySnapshot.docChanges();
        newChat.forEach( newChat => {
          if (newChat.type == 'added'){
            socket.emit('updateChats');
          }
        })
      }, err => {
        console.log(err)
      });
    })

    socket.on('disconnected', function(data) {
      console.log('user disconnected')
  });  
})



server.listen(process.env.PORT, function() {
  console.log("Express app started on heroku server");
})


/*app.listen(3000, function() {
  console.log("Express app started on port 3000.");
});*/

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
app.use("/repositories",apiRepo);
app.use("/config",apiKeys);

