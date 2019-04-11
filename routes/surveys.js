var express = require("express");
var firebase= require("firebase");
var admin = require("firebase-admin");
var bodyParser = require("body-parser");

var api = express.Router();

api.use(bodyParser.urlencoded({ extended: false }));

api.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

api.get('/', function (req,res){
  firebase.auth().onAuthStateChanged( function (user){
      if (user){
        surveys = [];
        admin.firestore().collection('Surveys').get().then( function (snapshot){
            if (snapshot){
              snapshot.forEach( doc => {
                survey = {
                  [doc.id]: doc.data()
                }
                surveys.push(survey);
              })
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
        res.status(401).json({
          message: 'You need to be logged in to access content'
        })
    }
  })
})

api.post('/', function (req,res){
  firebase.auth().onAuthStateChanged(function (user){
    if (user){
      var newSurveyData = {
        title: req.body.title,
        uid: req.body.id_user
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
      res.status(401).json({
        message: 'You need to be logged in to access content'
      })
    }
  })
})

api.put('/:surveyid' , function (req,res){
  firebase.auth().onAuthStateChanged( function (user){
    if (user){
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
      res.status(401).json({
        status: 401,
        message: 'You need to be logged in to access content'
      })
    }
  })
})

api.delete('/:surveyid', function (req,res){
  firebase.auth().onAuthStateChanged(function (user){
    if (user){
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
    }else {
      res.status(201).json({
        status: 401,
        message: 'You need to log in to access content'
      })
    }
  })
})

api.post('/:surveyid/question', function (req,res){
  firebase.auth().onAuthStateChanged( function (user){
    if (user){
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
      res.status(401).json({
        status:401,
        message: 'You need to be logged in to access content'
      })
    }
  })
})

api.get('/:surveyid/question/', function (req,res){
  firebase.auth().onAuthStateChanged(function (user){
    if (user){
        surveys = req.params.surveyid
        questions =[];
        admin.firestore().collection('Surveys').doc(surveys).collection('Questions').get().then(function (snapshot){
          if (snapshot){
            snapshot.forEach(doc =>{
              survey = {
                [doc.id]: doc.data()
              }
              questions.push(survey)
            })
            res.status(200).json({
                status: 200,
                message: 'Survey questions retrieved',
                data: questions
            })
          }else{
            res.status(404).json({
              status: 404,
              message: 'This survey has no questions'
            })
          }
        }).catch(function (error){
            res.status(400).json({
              status: error.code,
              message: error.message
            })
        })
    }else{
      res.status(401).json({
        status:401,
        message: 'You need to be logged in to access content'
      })
    }
  })
})

api.put('/:surveyid/question/:questionid', function (req,res){
  firebase.auth().onAuthStateChanged(function (user){
    if (user){
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
      res.status(401).json({
        status:401,
        message: 'You need to be logged in to access content'
      })
    }
  })
})

api.delete('/:surveyid/question/:questionid', function (req,res){
  firebase.auth().onAuthStateChanged(function (user){
    if (user){
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
      res.status(401).json({
        status:401,
        message: 'You need to be logged in to access content'
      })
    }
  })
})



api.get('/:surveyid/question/:questionid/answer', function (req, res){
  firebase.auth().onAuthStateChanged( function (user){
    if (user){
      survey = req.params.surveyid
      question = req.params.questionid
      answers = []
      admin.firestore().collection('Surveys').doc(survey).collection('Questions').doc(question).collection('Answers').get().then( function (snapshot){
        if (snapshot){
          snapshot.forEach(doc => {
            answer = {
              [doc.id]: doc.data(0)
            }
            answers.push(answer);
          })
          res.status(200).json({
            status: 200,
            message: 'answers retrieved',
            data: answers
          })
        }else{
          res.status(404).json({
            status:404,
            message: 'No answers for this questions have been added'
          })
        }
      }).catch(function (error){
          res.status(400).json({
            status: error.code,
            message: error.message
          })
      })
    }else{
      res.status(401).json({
        status:401,
        message: 'You need to be logged in to access content'
      })
    }
  })
})

api.post('/:surveyid/question/:questionid/answer', function (req,res){
  firebase.auth().onAuthStateChanged(function (user){
    if (user){
      newAnswer = {
        content: req.body.content,
        votes: 0
      }
      survey = req.params.surveyid
      question = req.params.questionid
      admin.firestore().collection('Surveys').doc(survey).collection('Questions').doc(question).collection('Answers').add(newAnswer).then( function (doc){
        res.status(201).json({
            status: 201,
            message: 'Answer to question added',
            key: doc.id
        })
      }).catch(function (error){
        res.status(400).json({
            status: error.code,
            message: error.message
        })
      })
    }else{
      res.status(401).json({
        status:401,
        message: 'You need to be logged in to access content'
      })
    }
  })
})

api.put('/:surveyid/question/:questionid/answer/:answerid', function (req,res){
  firebase.auth().onAuthStateChanged(function (user){
    if (user){
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
      res.status(401).json({
        status:401,
        message: 'You need to be logged in to access content'
      })
    }
  })
})

api.put('/:surveyid/question/:questionid/answer/:answerid/vote', function (req,res){
  firebase.auth().onAuthStateChanged(function (user){
    if (user){
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
      res.status(401).json({
        status:401,
        message: 'You need to be logged in to access content'
      })
    }
  })
})

api.delete('/:surveyid/question/:questionid/answer/:answerid', function (req,res){
  firebase.auth().onAuthStateChanged(function (user){
    if (user){
      survey = req.params.surveyid
      question = req.params.questionid
      answer = req.params.answerid
      admin.firestore().collection('Surveys').doc(survey).collection('Questions').doc(question).collection('Answers').doc(answer).delete();
      res.status(200).json({
        status: 200,
        message: 'the answer has been removed from the survey'
      })
    }else{
      res.status(401).json({
        status:401,
        message: 'You need to be logged in to access content'
      })
    }
  })
})

module.exports  = api;