var express = require("express");
var firebase= require("firebase");
var admin = require("firebase-admin");
var bodyParser = require("body-parser");

var api = express.Router();

api.use(bodyParser.urlencoded({ extended: false }));

api.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.header("Access-Control-Allow-Headers", "Origin, Authorization, X-Requested-With, Content-Type, Accept");
    next();
  });

let io = api.get("socket");
console.log(io);
var getUsername = function (id){
    return admin.firestore().collection('Users').doc(id).get().then( function (snapshot){
        name = snapshot.get('name');
        lastname = snapshot.get('lastname')
        return name + ' ' + lastname;
    }).catch(function (error){
        res.json({
            status: error.code,
            message: error.message
        })
    })
}

var startObservable = function(){
  ref = admin.firestore().collection('Surveys');
  var observer = ref.onSnapshot(querySnapshot => {
    io.emmit('updateSurveys',function (){
      console.log('emmited update survey event')
    });
  }, err => {
    console.log(`Encountered error: ${err}`);
  });
  
}

io.on('subscribeSurvey', function (){
  startObservable()

})

api.get('/', function (req,res){
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
      if (decodedToken.uid){
        surveys = [];
        admin.firestore().collection('Surveys').get().then( async (snapshot) => {
            if (snapshot){
              for (doc of snapshot.docs){
                survey = {
                  id: doc.id,
                  data: doc.data(),
                  name: await getUsername(doc.get('uid'))
                }
                surveys.push(survey);
              }
              res.status(200).json({
                  status: 200,
                  message: 'Surveys retrieved',
                  data: surveys
              })
            } else{
              res.status(404).json({
                message: 'No surveys found'
              })
            }
        }).catch(function (error){
            res.status(400).json({
              status: error.code,
              message: error.message
            })
        })

      }else{
        res.json({
            status: 401,
            messgae: 'token mismatch'
        })
    }
  }).catch(function (error){
      res.status(401).json({
          status: error.code,
          message: error.message
      })
  }) 
})

api.post('/', function (req,res){
  var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
    if (decodedToken.uid){
      var newSurveyData = {
        title: req.body.title,
        uid: req.body.id_user,
        expires: req.body.expires_in,
        created: req.body.created
      }
      admin.firestore().collection('Surveys').add(newSurveyData).then(function (ref){
          res.status(201).json({
            status: 201,
            message: 'Survey store on the database',
            key: ref.id
          })
      }).catch(function (error){
          res.status(400).json({
            status: error.code,
            message: error.message
          })
      })
    }else{
      res.json({
          status: 401,
          messgae: 'token mismatch'
      })
  }
  }).catch(function (error){
    res.status(401).json({
        status: error.code,
        message: error.message
    })
  }) 
})

api.put('/:surveyid' , function (req,res){
  var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
      if (decodedToken.uid){
        var newSurveyData = {
          title: req.body.title
        }
        survey = req.params.surveyid
        admin.firestore().collection('Surveys').doc(survey).update(newSurveyData).then(function (){
          res.status(200).json({
            status: 200,
            message: 'The survey has been updated'
          })
        }).catch(function (error){
          res.status(400).json({
            status: error.code,
            message: error.message
          })
        })
      }else{
        res.json({
            status: 401,
            messgae: 'token mismatch'
        })
    }
  }).catch(function (error){
    res.status(401).json({
        status: error.code,
        message: error.message
    })
  }) 
})

api.put('/:surveyid/updateAnsweredBy',  function (req,res){
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
      uid = req.body.uid
      if (decodedToken.uid){
        var answeredBy = {
          ['AnsweredBy.'+uid]: true
        }
        survey = req.params.surveyid
        admin.firestore().collection('Surveys').doc(survey).update(answeredBy ).then(function (){
          res.status(200).json({
            status: 200,
            message: 'The survey has been updated'
          })
        }).catch(function (error){
          res.status(400).json({
            status: error.code,
            message: error.message
          })
        })
      }else{
        res.json({
            status: 401,
            messgae: 'token mismatch'
        })
    }
  }).catch(function (error){
    res.status(401).json({
        status: error.code,
        message: error.message
    })
  }) 
})

api.delete('/:surveyid', function (req,res){
  var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
      if (decodedToken.uid){
        survey = req.params.surveyid
        deletes = admin.firestore().collection('Surveys').doc(survey);
        deletes.collection('Questions').get().then( function (snapshot){
          snapshot.forEach( doc => {
            deletes.collection('Questions').doc(doc.id).collection('Answers').get().then(function (snap){
              snap.forEach( docs => {
                deletes.collection('Questions').doc(doc.id).collection('Answers').doc(docs.id).delete();
                console.log('Deleted answer ' + docs.id)
              })
              deletes.collection('Questions').doc(doc.id).delete();
              console.log('Deleted question ' + doc.id)
            }).catch(function (error){
                res.status(400).json({
                  status: error.code,
                  message: error.message
                })
            })
          })
          deletes.delete();
          res.status(200).json({
            status: 200,
            message: 'Survey deleted'
          })
        }).catch(function (error){
          res.status(400).json({
              status: error.code,
              message: error.message
          })
        })
      }else{
        res.json({
            status: 401,
            messgae: 'token mismatch'
        })
    }
  }).catch(function (error){
      res.status(401).json({
          status: error.code,
          message: error.message
      })
  }) 
})

api.post('/:surveyid/question', function (req,res){
  var encoded = req.headers.authorization.split(' ')[1]
  admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
    if (decodedToken.uid){
        survey = req.params.surveyid
        var newQuestion = {
          content: req.body.content
        }
        admin.firestore().collection('Surveys').doc(survey).collection('Questions').add(newQuestion).then( function (doc){
              res.status(201).json({
                status: 201,
                message: 'Question added to survey',
                id_question: doc.id,
                id_survey: survey
              })
        }).catch(function (error){
            res.status(400).json({
              status: error.code,
              message: error.message
            })
        })
    }else{
      res.json({
          status: 401,
          messgae: 'token mismatch'
      })
  }
  }).catch(function (error){
    res.status(401).json({
        status: error.code,
        message: error.message
    })
  }) 
})

api.put('/:surveyid/question/:questionid', function (req,res){
  var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
    if (decodedToken.uid){
      survey = req.params.surveyid
      question = req.params.questionid
      var newQuestionData = {
        content: req.body.content
      }
      admin.firestore().collection('Surveys').doc(survey).collection('Questions').doc(question).update(newQuestionData).then(function (){
        res.status(200).json({
          status: 200,
          message: 'The question has been updated'
        })
      }).catch (function (error){
        res.status(400).json({
          status: error.code,
          message: error.message
        })
      })
    }else{
      res.json({
          status: 401,
          messgae: 'token mismatch'
      })
  }
  }).catch(function (error){
    res.status(401).json({
        status: error.code,
        message: error.message
    })
  }) 
})

api.delete('/:surveyid/question/:questionid', function (req,res){
  var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
    if (decodedToken.uid){
      survey = req.params.surveyid
      question = req.params.questionid
      var deletes = admin.firestore().collection('Surveys').doc(survey).collection('Questions').doc(question)
      deletes.collection('Answers').get().then(function (snapshot){
          if (snapshot){
            snapshot.forEach( doc => {
                deletes.collection('Answers').doc(doc.id).delete();
                console.log('Deleted ' + doc.id)
            })
            deletes.delete();
            res.status(200).json({
              status: 200,
              message: 'The question and its answers were deleted'
            })
          }
          
      }).catch(function (error){
          res.status(400).json({
              status: error.code,
              message: error.message
          })
      })
    }else{
      res.json({
          status: 401,
          messgae: 'token mismatch'
      })
  }
  }).catch(function (error){
    res.status(401).json({
        status: error.code,
        message: error.message
    })
  }) 
})


api.post('/:surveyid/question/:questionid/answer', function (req,res){
  var encoded = req.headers.authorization.split(' ')[1]
  admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
    if (decodedToken.uid){
      survey = req.params.surveyid
      question = req.params.questionid
      answers = JSON.parse(req.body.content)
      for (i = 0; i < answers.length;i++){
        var newAnswer = {
          content: answers[i].content,
          votes: 0
        }
        admin.firestore().collection('Surveys').doc(survey).collection('Questions').doc(question).collection('Answers').add(newAnswer).then( function (){
          console.log('added one possible answer')
        }).catch(function (error){
          res.status(400).json({
              status: error.code,
              message: error.message
          })
        })
      }
      res.status(201).json({
        status: 201,
        message: 'Answers to question added'
      })
    }else{
      res.json({
          status: 401,
          messgae: 'token mismatch'
      })
  }
  }).catch(function (error){
    res.status(401).json({
        status: error.code,
        message: error.message
    })
  }) 
})

api.put('/:surveyid/question/:questionid/answer/:answerid', function (req,res){
  var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
    if (decodedToken.uid){
      survey = req.params.surveyid
      question = req.params.questionid
      answer = req.params.answerid
      var newAnswerData = {
        content: req.body.content
      }
      admin.firestore().collection('Surveys').doc(survey).collection('Questions').doc(question).collection('Answers').doc(answer).update(newAnswerData).then(function (){
        res.status(200).json({
          status: 200,
          message: 'Answer updated'
        })
      }).catch(function (error){
          res.status(404).json({
            status: error.status,
            message: error.message
          })
      })
    }else{
      res.json({
          status: 401,
          messgae: 'token mismatch'
      })
  }
  }).catch(function (error){
    res.status(401).json({
        status: error.code,
        message: error.message
    })
  }) 
})

api.put('/:surveyid/question/:questionid/answer/:answerid/vote', function (req,res){
  var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
    if (decodedToken.uid){
      survey = req.params.surveyid
      question = req.params.questionid
      answer = req.params.answerid
       update = admin.firestore().collection('Surveys').doc(survey).collection('Questions').doc(question).collection('Answers');
       update.doc(answer).get().then( function (snap){
       var vote = snap.data();
         vote.votes = ((vote.votes- 0) + (1-0))
         newAnswerData = {
           votes: vote.votes
         }
       update.doc(answer).update(newAnswerData).then(function (){
          res.status(200).json({
            status: 200,
            message: 'Answer updated'
          })
        }).catch(function (error){
            res.status(404).json({
              status: error.status,
              message: error.message
            })
        })
      }).catch(function (error){
        res.status(404).json({
          status: error.status,
          message: error.message
        })
      })  
    }else{
      res.json({
          status: 401,
          messgae: 'token mismatch'
      })
  }
  }).catch(function (error){
    res.status(401).json({
        status: error.code,
        message: error.message
    })
  }) 
})

api.delete('/:surveyid/question/:questionid/answer/:answerid', function (req,res){
  var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
    if (decodedToken.uid){
      survey = req.params.surveyid
      question = req.params.questionid
      answer = req.params.answerid
      admin.firestore().collection('Surveys').doc(survey).collection('Questions').doc(question).collection('Answers').doc(answer).delete();
      res.status(200).json({
        status: 200,
        message: 'the answer has been removed from the survey'
      })
    }else{
      res.json({
          status: 401,
          messgae: 'token mismatch'
      })
  }
  }).catch(function (error){
    res.status(401).json({
        status: error.code,
        message: error.message
    })
  }) 
})

var getQuestionAnswers = function (ref,id){
    return ref.collection('Questions').doc(id).collection('Answers').get().then(function (snapshot){
      answers = []
      for (doc of snapshot.docs){
        answer = {
          id: doc.id,
          content: doc.get('content'),
          votes: doc.get('votes')
        }
        answers.push(answer)
      }
      return answers
    }).catch(function (error){
        console.log(error);
    })

}


api.get('/:surveyId', function (req,res){
    var encoded = req.headers.authorization.split(' ')[1]
    admin.auth().verifyIdToken(encoded).then(function(decodedToken) {
    if (decodedToken.uid){
      surveyDoc = req.params.surveyId
      survey = admin.firestore().collection('Surveys').doc(surveyDoc);
      survey.collection('Questions').get().then(async (snapshot) => {
        questions = [];
        for (doc of snapshot.docs){
          questionid = doc.id
          question = doc.get('content')
          answers = await getQuestionAnswers(survey,doc.id);
          question = {
            questionId: questionid,
            question: question,
            answers: answers
          }
          questions.push(question);
        }
        survey.get().then(async (doc) => {
          user = await getUsername(doc.get('uid')),
          res.status(200).json({
              status:200,
              message: 'survey data retrieved',
              title: doc.get('title'),
              expires: doc.get('expires'),
              user: user,
              surveyId: doc.id,
              questions: questions,
              answeredBy: doc.get('AnsweredBy')
          })

        }).catch(function (error){
              res.status(401).json({
                status: error.code,
                message: error.message
            })
        })
      }).catch(function (error){
            res.status(401).json({
              status: error.code,
              message: error.message
          })
      })
    }else{
      res.json({
          status: 401,
          messgae: 'token mismatch'
      })
  }
  }).catch(function (error){
    res.status(401).json({
        status: error.code,
        message: error.message
    })
  })   
})

module.exports  = api;