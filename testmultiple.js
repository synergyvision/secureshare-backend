var openpgp = require('openpgp');

var express = require("express");
var http = require("http");

var app = express();

app.get('/', function (req,res){

    console.log('start')
    var options = {
        userIds: [{ name:'alexander ramirez', email:'ar@synergy.vision' }], // multiple user IDs
        numBits: 4096,                                            // RSA key size
        passphrase: 'SyNerGyVis19'
    };

    openpgp.generateKey(options).then(function(key) {
        var privkey1 = key.privateKeyArmored; // '-----BEGIN PGP PRIVATE KEY BLOCK ... '
        var pubkey1 = key.publicKeyArmored;   // '-----BEGIN PGP PUBLIC KEY BLOCK ... '
        console.log(pubkey1)
        console.log(privkey1);
        res.status(200).json({
            public: pubkey1,
            private: privkey1
        })   
    });


})



app.listen(3000, function() {
    console.log("Express app started on heroku server");
  });
