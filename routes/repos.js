var express = require("express");
var firebase= require("firebase");
var admin = require("firebase-admin");
var bodyParser = require("body-parser");
const https = require('https');
//var credentials = require('../githubCredentials.json');
const multer = require('multer');
var fs = require('fs');
//var keys = require('../keys.json');
var openpgp = require('openpgp');

var credentials = {
    GitHub_secret_id: process.env.GitHub_secret_id,
    gihub_client_id: process.env.gihub_client_id
}


var api = express.Router();

api.use(bodyParser.urlencoded({ extended: false }));

api.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.header("Access-Control-Allow-Headers", "Origin, Authorization, X-Requested-With, Content-Type, Accept");
    next();
  });

/*api.get('/:userid/getClientId',function (req,res){
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
        uid = req.param.userid;
        if (decodedToken.uid != uid){
            res.status(200).json({
                status: 200,
                message: 'clientId retrieved',
                code: credentials.gihub_client_id
            })
        }else{
            res.status(401).json({
                status: 401,
                message: 'Token mismatch'
            })
        }
    }).catch(function (error){
        res.status(400).json({
            status: error.status,
            message: error.message
        })
    })
})*/

var decryptPassword = async (string) => {
    //passphrase = keys.server_passphrase;
    //privateKey = keys.server_private_key;
    var privateKey = process.env.server_private_key
    var passphrase = process.env.server_passphrase
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

api.post('/:userid/getToken', function (req,res){

    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken){
        uid = req.params.userid
        if (decodedToken.uid == uid){
            data = {      
                "scopes": [
                    "repo",
                    "delete_repo"
                ],
                "note": "sharekey Oauth token",
                "client_secret": credentials.GitHub_secret_id      
            }

            data = JSON.stringify(data)

            user = req.body.username;
            password = req.body.password
            password = decryptPassword(password);
            password.then(function (password){
                if (!req.body.otp){
                    var options = {
                        host: 'api.github.com',
                        path: '/authorizations/clients/' + credentials.gihub_client_id,
                        method: 'PUT',
                        headers: {'user-agent': 'node.js', 
                        'Authorization': 'Basic ' + new Buffer(user + ':' + password).toString('base64'), 
                        'Content-Type': 'application/json',
                        'Content-Length': data.length}
                    }
                }else{
                    otp = req.body.otp;
                    var options = {
                        host: 'api.github.com',
                        path: '/authorizations/clients/' + credentials.gihub_client_id,
                        method: 'PUT',
                        headers: {'user-agent': 'node.js', 
                        'Authorization': 'Basic ' + new Buffer(user + ':' + password).toString('base64'), 
                        'Content-Type': 'application/json',
                        'x-github-otp': otp,
                        'Content-Length': data.length}
                    }
                }    
                let request = https.request(options,function (response){
                        response.setEncoding('utf8');
                        let body = '';
                        response.on('data',function (chunk){
                            body += chunk;
                        });
                        response.on('end', () => {
                            body = JSON.parse(body);
                            console.log(body)
                            if (body['token']){
                                admin.firestore().collection('Users').doc(uid).update({
                                    gitHubToken: body['token'],
                                    githubUsername: user
                                })
                                res.status(201).json({
                                    status: 'created',
                                    message: 'the user Oauth token for github has been created'
                                })
                            }else if (body['message'] == 'Must specify two-factor authentication OTP code.'){
                                res.status(200).json({
                                    status: 401,
                                    message: "Missing otp token"
                                })
                            } else{
                                res.status(400).json({
                                    status: 400,
                                    message: 'could not create token'
                                })
                            }  
                        });
                        response.on('error', (e) => {
                            console.error(`problem with request: ${e.message}`);
                        });
                        
    
                    });
                    request.write(data);
                    request.end(); 
            })   

        }else{
            res.status(401).json({
                status: "Unauthorized",
                message: "token missmatch"
            })
        }

         
    }).catch(function (error){
        res.status(400).json({
            status: error.status,
            message: error.message
        })
    })            
})

api.get('/:userid/checkToken', function (req,res){
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken){
        uid = req.params.userid;
        if (decodedToken.uid == uid){
            admin.firestore().collection('Users').doc(uid).get().then(function (snapshot){
                if (snapshot.get('gitHubToken')){
                    tokenExists = true;
                }else{
                    tokenExists = false;
                }
                res.status(200).json({
                    status: 200,
                    tokenExists: tokenExists
                })
            })
        }else{
            res.status(401).json({
                message: 'token mismmatch'
            })
        }
    }).catch(function (error){
        res.status(400).json({
            status: error.status,
            message: error.message
        })
    })
})

var getUserGitData = function (id){

    return admin.firestore().collection('Users').doc(id).get().then(function (snapshot){
        name = snapshot.get('name');
        lastname = snapshot.get('lastname')
        gitData = {
            username : snapshot.get('githubUsername'),
            token: snapshot.get('gitHubToken'),
            name: name + lastname,
            email: snapshot.get('email')
        }
        return gitData
    }).catch(function (error){
        console.log(error)
    })

}


// list User repos

api.get('/:userid/listRepos', function (req,res){
        uid = req.params.userid;

        var encoded = req.headers.authorization.split(' ')[1]
        admin.auth().verifyIdToken(encoded).then(function(decodedToken){
            if (decodedToken.uid == uid){

                gitData =  getUserGitData(uid);
                gitData.then(function (gitData){
                    var options = {
                        host: 'api.github.com',
                        path: '/user/repos',
                        method: 'GET',
                        headers: {'user-agent': 'node.js', 
                        'Authorization': 'token ' + gitData.token}
                    }

                    let request = https.request(options,function (response){
                            response.setEncoding('utf8');
                            let body = '';
                            response.on('data',function (chunk){
                                body += chunk;
                            });
                            response.on('end', () => {
                                body = JSON.parse(body);  
                                res.status(200).json({
                                    status: 200,
                                    repoList: body,
                                    message: 'User repositories retrieved'
                                });
                            });
                            response.on('error', (e) => {
                                console.error(`problem with request: ${e.message}`);
                            });
                            

                        });
                        request.end();   
                
                })
            }else{
                res.status(401).json({
                    message: 'Token missmatch'
                })
            }    
        }).catch(function (error){
            res.status(400).json({
                status: error.status,
                message: error.message
            })
        })    

})

api.get('/:userid/getRepo/:repoName',function (req,res){

        uid = req.params.userid;

        var encoded = req.headers.authorization.split(' ')[1]
        admin.auth().verifyIdToken(encoded).then(function(decodedToken){
            if (decodedToken.uid == uid){
                repoId = req.params.repoName;
                gitData =  getUserGitData(uid);
                gitData.then(function (gitData){
                    var options = {
                        host: 'api.github.com',
                        path: '/repos/' + gitData.username + '/' + repoId,
                        method: 'GET',
                        headers: {'user-agent': 'node.js', 
                        'Authorization': 'token ' + gitData.token}
                    }

                    let request = https.request(options,function (response){
                            response.setEncoding('utf8');
                            let body = '';
                            response.on('data',function (chunk){
                                body += chunk;
                            });
                            response.on('end', () => {
                                body = JSON.parse(body);  
                                res.status(200).json({
                                    status: 200,
                                    repoData: body,
                                    message: 'User repositories retrieved'
                                });
                            });
                            response.on('error', (e) => {
                                console.error(`problem with request: ${e.message}`);
                            });
                            

                        });
                        request.end();   
                
                })
            }else{
                res.status(401).json({
                    message: 'Token missmatch'
                })
            }    
        }).catch(function (error){
            res.status(400).json({
                status: error.status,
                message: error.message
            })
        })    

})

//creating a repo

api.post('/:userid/createRepo', function (req,res){


    uid = req.params.userid;
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken){
        if (decodedToken.uid == uid){

            gitData =  getUserGitData(uid);
            gitData.then(function (gitData){

                data = {}

                data['name'] = req.body.name
                data['description'] = req.body.description
                if (req.body.homepage){
                    data['homepage'] = req.body.homepage
                }
                if (req.body.private){
                    data['private'] = req.body.private
                }else{
                    data['private'] = false
                }

                data = JSON.stringify(data)

                var options = {
                    host: 'api.github.com',
                    path: '/user/repos',
                    method: 'POST',
                    headers: {'user-agent': 'node.js', 
                    'Content-Length': data.length,
                    'Authorization': 'token ' + gitData.token}
                }

                let request = https.request(options,function (response){
                        response.setEncoding('utf8');
                        let body = '';
                        response.on('data',function (chunk){
                            body += chunk;
                        });
                        response.on('end', () => {
                            body = JSON.parse(body);  
                            res.status(201).json({
                                status: 201,
                                repoData: body,
                                message: 'User repositories created'
                            });
                        });
                        response.on('error', (e) => {
                            console.error(`problem with request: ${e.message}`);
                        });
                        

                    });
                    request.write(data);
                    request.end();   
            })
        }else{
            res.status(401).json({
                message: 'Token missmatch'
            })
        }  
    }).catch(function (error){
        res.status(400).json({
            status: error.status,
            message: error.message
        })
    })
})

api.delete('/:userid/deleteRepo/:repoName', function (req,res){
  
    uid = req.params.userid;
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken){
        if (decodedToken.uid == uid){
            gitData =  getUserGitData(uid);
            gitData.then(function (gitdata){
                repoId = req.params.repoName
                var options = {
                    host: 'api.github.com',
                    path: '/repos/' + gitData.username + '/' + repoId,
                    method: 'DELETE',
                    headers: {'user-agent': 'node.js',
                    'Authorization': 'token ' + gitData.token}
                }

                let request = https.request(options,function (response){
                        response.setEncoding('utf8');
                        let body = '';
                        response.on('data',function (chunk){
                        });
                        response.on('end', (e) => {
                            res.status(200).json({
                                status: 200,
                                data: e,
                                message: 'User has deleted a repositorie'
                            });
                        });
                        response.on('error', (e) => {
                            console.error(`problem with request: ${e.message}`);
                        });
                        

                    });
                    request.end();   
            })        

        }else{
            res.status(401).json({
                message: 'Token missmatch'
            })
        }  
    }).catch(function (error){
        res.status(400).json({
            status: error.status,
            message: error.message
        })
    })       

})

// now the functions are for the file on the repo

api.post('/:userid/getContents/:repo', function (req,res){
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken){
        uid = req.params.userid;
        if (decodedToken.uid == uid){
            gitData =  getUserGitData(uid);
            gitData.then(function (gitdata){
                repoId = req.params.repo
                if (req.body.dir){
                    path = '/repos/' + gitData.username  + '/' + repoId +'/contents/' + req.body.dir
                }else{
                    path = '/repos/' + gitData.username  + '/' + repoId +'/contents/'
                }
                var options = {
                    host: 'api.github.com',
                    path: path,
                    method: 'GET',
                    headers: {'user-agent': 'node.js',
                    'Authorization': 'token ' + gitData.token}
                }

                let request = https.request(options,function (response){
                        response.setEncoding('utf8');
                        let body = '';
                        response.on('data',function (chunk){
                            body += chunk;
                        });
                        response.on('end', () => {
                            body = JSON.parse(body);  
                            res.status(200).json({
                                status: 200,
                                message: 'Repo files retrived',
                                data: body
                            });
                        });
                        response.on('error', (e) => {
                            console.error(`problem with request: ${e.message}`);
                        });
                        

                    });
                    request.end();   
            })
        }else{
            res.status(401).json({
                message: 'Token missmatch'
            })
        }    
    }).catch(function (error){
        res.status(400).json({
            status: error.status,
            message: error.message
        })
    })    
})

//creating a file or updating it

api.put('/:userid/pushFile/:repo', multer({dest: "./uploads/"}).single('file'), function (req,res){
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken){
        uid = req.params.userid;
        if (decodedToken.uid == uid){
            gitData =  getUserGitData(uid);
            gitData.then(function (gitdata){
                repoId = req.params.repo
                path = '/repos/' + gitData.username  + '/' + repoId +'/contents/' + req.body.dir
                console.log(req.file);
                content = fs.readFileSync(req.file.path).toString("base64")
                data = {
                    message: req.body.commit,
                    committer: {
                      name: gitData.name,
                      email: gitData.email
                    },
                    content: content
                }
                if (req.body.sha){
                    data['sha'] = req.body.sha
                }

                data = JSON.stringify(data)

                var options = {
                    host: 'api.github.com',
                    path: path,
                    method: 'PUT',
                    headers: {'user-agent': 'node.js',
                    'Content-Length': data.length,
                    'Authorization': 'token ' + gitData.token}
                }

                let request = https.request(options,function (response){
                        response.setEncoding('utf8');
                        let body = '';
                        response.on('data',function (chunk){
                            body += chunk;
                        });
                        response.on('end', () => {
                            body = JSON.parse(body);  
                            res.send(body)
                        });
                        response.on('error', (e) => {
                            console.error(`problem with request: ${e.message}`);
                        });
                        

                    });
                    request.write(data);
                    request.end();   
                    fs.unlink(req.file.path,(err)=>{
                        if (err){
                            console.log(err);
                        }
                    })
            })
        }else{
            res.status(401).json({
                message: 'Token missmatch'
            })
        }    
    }).catch(function (error){
        res.status(400).json({
            status: error.status,
            message: error.message
        })
    })    
})

api.delete('/:userid/deleteFile/:repo', function (req,res){
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken){
        uid = req.params.userid;
        if (decodedToken.uid == uid){
            gitData =  getUserGitData(uid);
            gitData.then(function (gitdata){
                repoId = req.params.repo
                var dir = decodeURIComponent(req.body.dir)
                path = '/repos/' + gitData.username  + '/' + repoId +'/contents/' + dir
                console.log(path)
                data = {
                    message: "deleted from app client",
                    sha: req.body.sha,
                    committer: {
                        name: gitData.name,
                        email: gitData.email
                    }
                }

                data = JSON.stringify(data)

                var options = {
                    host: 'api.github.com',
                    path: path,
                    method: 'DELETE',
                    headers: {'user-agent': 'node.js',
                    'Content-Length': data.length,
                    'Authorization': 'token ' + gitData.token}
                }

                let request = https.request(options,function (response){
                        response.setEncoding('utf8');
                        let body = '';
                        response.on('data',function (chunk){
                            body += chunk;
                        });
                        response.on('end', () => {
                            body = JSON.parse(body);  
                            res.send(body)
                        });
                        response.on('error', (e) => {
                            console.error(`problem with request: ${e.message}`);
                        });
                        

                    });
                    request.write(data);
                    request.end();   
            })
        }else{
            res.status(401).json({
                message: 'Token missmatch'
            })
        }    
    }).catch(function (error){
        res.status(400).json({
            status: error.status,
            message: error.message
        })
    })
})

module.exports  = api;