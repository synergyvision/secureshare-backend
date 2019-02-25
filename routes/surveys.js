var express = require("express");
var firebase= require("firebase");
var admin = require("firebase-admin");
var bodyParser = require("body-parser");

var api = express.Router();

api.use(bodyParser.urlencoded({ extended: false }));

api.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

api.get('/', function (req,res){
  firebase.auth().onAuthStateChanged( function (user){
      if (user){
        admin.database().ref().child('Surveys').once('value').then( function (snapshot){
            if (snapshot){
              var surveys = snapshot.val();
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
      var key = admin.database().ref().child('Surveys/').push().key
      admin.database().ref().child('Surveys/' + key).set(newSurveyData, function (error){
        if (error){
          res.status(400).json({
              status: 400,
              message: 'Could not save the new Survey'
          })
        } else{
          res.status(201).json({
            status: 201,
            message: 'Survey store on the database',
            key: key
          })
        }
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
      admin.database().ref().child('Surveys/' + survey).update(newSurveyData).then(function (){
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
      admin.database().ref().child('Surveys/' + survey).remove();
      admin.database().ref().child('Questions/' + survey).remove();
      admin.database().ref().child('Answers/' + survey).remove();
      res.status(200).json({
        status: 200,
        message: 'The survey has been deleted'
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
        var key = admin.database().ref().child('Questions').push().key
        admin.database().ref().child('Questions/' + survey + '/' + key).set(newQuestion, function (error){
            if (error){
                res.json({
                  status: 400,
                  message: 'There has been an error storing on the database'
                })   
            }else{
              res.status(201).json({
                status: 201,
                message: 'Question added to survey',
                id_question: key,
                id_survey: survey
              })
            }
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
        admin.database().ref().child('Surveys/' + surveys).once('value').then(function (snapshot){
          if (snapshot){
            survey = snapshot.child('title').val();
            admin.database().ref().child('Questions/' + surveys).once('value').then( function (snapshot){
              if (snapshot){
                questions = snapshot.val();
                res.status(200).json({
                  status: 200,
                  message: 'The survey has been retrieved',
                  survey_title: survey,
                  questions: questions
                })
              } else{
                res.status(404).json({
                  status: 404,
                  message: 'This survey has no questions added'
                })
              }
            }).catch(function (error){
              res.status(400).json({
                  status: error.code,
                  message: error.message
              })
            })
          } else{
            res.status(404).json({
              status: 404,
              message: 'No survey by that id found'
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
      admin.database().ref().child('Questions/' + survey + '/' + question).update(newQuestionData).then(function (){
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
      admin.database().ref().child('Questions/' + survey + '/' + question).remove();
      admin.database().ref().child('Answers/' + survey + '/' + question).remove();
      res.status(200).json({
        status: 200,
        message: 'the question has been removed from the survey'
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
      admin.database().ref().child('Questions/' + survey + '/' + question).once('value').then( function (snapshot){
        if (snapshot){
          question_title = snapshot.child('content').val();
          admin.database().ref().child('Answers/' + survey + '/' + question).once('value').then( function (snap){
            if (snap){
              answers = snap.val();
              res.status(200).json({
                status:200,
                message: 'Question and its answers retrieved',
                question: question_title,
                possible_answers: answers
              })
            }else{
              res.status(200).json({
                status:200,
                message: 'The questions doenst have any answers yet '
              })
            }
          }).catch(function (error){
            res.status(400).json({
              status: error.code,
              message: error.message
            })
          })
        }else{
          res.status(404).json({
            status: 404,
            message: 'No question found'
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
        content: req.body.content
      }
      survey = req.params.surveyid
      question = req.params.questionid
      var key = admin.database().ref().child('Answers/' + survey + '/' + question).push().key
      admin.database().ref().child('Answers/' + survey + '/' + question + '/' + key).set(newAnswer, function (error){
        if (error){
          res.status(400).json({
            status:400,
            message: 'there was an error inserting on the database' + erro
          })
        } else {
          res.status(201).json({
            status: 201,
            message: 'The answer has been saved',
            answer_id: key
          })
        }
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
    console.log('dale')
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
      admin.database().ref().child('Answers/' + survey + '/' + question + '/' + answer).remove();
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