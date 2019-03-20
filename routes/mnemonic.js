var express = require("express");
var Mnemonic = require('bitcore-mnemonic');

api.get("/", function (req,res){
    var code = new Mnemonic(Mnemonic.Words.SPANISH);
    console.log(code.toString()); // natal hada sutil año sólido papel jamón combate aula flota ver esfera...
    res.status(200).json({
        status: 200,
        message: code.toString()
    })
})

module.exports = api;