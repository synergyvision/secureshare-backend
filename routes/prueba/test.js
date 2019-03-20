var express = require("express");
var Mnemonic = require('bitcore-mnemonic');

var api = express();

api.get("/", function (req,res){
    var code = new Mnemonic(Mnemonic.Words.SPANISH);
    console.log(code.toString()); // natal hada sutil año sólido papel jamón combate aula flota ver esfera...
    res.status(200).json({
        status: 200,
        message: code.toString()
    })
})

api.listen(3000, function() {
    console.log("Express app started on port 3000.");
  });