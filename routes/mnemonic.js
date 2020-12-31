var express = require("express");
var Mnemonic = require('bitcore-mnemonic');
var bodyParser = require("body-parser");


var api = express.Router();
api.use(bodyParser.urlencoded({ extended: false }));
api.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

api.get("/", function (req,res){
    console.log('here');
    var code = new Mnemonic(Mnemonic.Words.SPANISH);
    console.log(code.toString());
    res.status(200).json({
        status: 200,
        message: code.toString()
    })
})

module.exports = api;