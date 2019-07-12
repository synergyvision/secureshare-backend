var express = require("express");
var firebase= require("firebase");
var admin = require("firebase-admin");
var bodyParser = require("body-parser");
const https = require('https');
//var credentials = require('../githubCredentials.json');

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

/*api.get('/callback',function (req,res){
    const {query} = req;
    const {code} = query;
    if (!code){
        res.json({
            message: 'error getting git hub code'
        })
    }

    var options = {
        hostname: 'github.com',
        path: '/login/oauth/access_token?client_id=' + credentials.gihub_client_id + '&client_secret=' + credentials.GitHub_secret_id + '&code='+code,
        method: 'POST',
        headers: {'user-agent': 'node.js','Accept': 'application/json'}
    }
    try {
        let request = https.request(options, function (response){
            response.setEncoding('utf8');
            let body = '';
            response.on('data', function (chunk){
                body = JSON.parse(chunk);
                console.log(body.access_token);
                console.log(body['access_token']);
            });
            response.on('end', function (){
                console.log(body);
            })
        })

        request.end();

        res.send('done')

    }catch(error){
        console.log(error)
    }
 
})*/

api.get('/:userid/getToken', function (req,res){

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

            var options = {
                host: 'api.github.com',
                path: '/authorizations/clients/' + credentials.gihub_client_id,
                method: 'PUT',
                headers: {'user-agent': 'node.js', 
                'Authorization': 'Basic ' + new Buffer(user + ':' + password).toString('base64'), 
                'Content-Type': 'application/json',
                'Content-Length': data.length}
            }
        
            let request = https.request(options,function (response){
                    response.setEncoding('utf8');
                    let body = '';
                    response.on('data',function (chunk){
                        body += chunk;
                    });
                    response.on('end', () => {
                        body = JSON.parse(body);
                        if (body['token']){
                            admin.firestore().collection('Users').doc(uid).update({
                                gitHubToken: body['token'],
                                githubUsername: user
                            })
                            res.status(201).json({
                                status: 'created',
                                message: 'the user Oauth token for github has been created'
                            })
                        }else{
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

var getUserGitData = function (id){

    return admin.firestore().collection('Users').doc(id).get().then(function (snapshot){

        gitData = {
            username : snapshot.get('githubUsername'),
            token: snapshot.get('gitHubToken')
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

api.get('/:userid/getContents/:repo', function (req,res){

    uid = req.params.userid;
    gitData =  getUserGitData(uid);
    gitData.then(function (gitdata){
        repoId = req.params.repo
        var options = {
            host: 'api.github.com',
            path: '/repos/' + gitData.username  + '/' + repoId +'/contents/',
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
})

module.exports  = api;