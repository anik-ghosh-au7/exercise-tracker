const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongo = require('mongodb');
const mongoose = require('mongoose');
const {ObjectId} = require('mongodb');

const cors = require('cors')

mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true, useUnifiedTopology: true});

app.use(cors());

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());


app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

var workoutSchema = new mongoose.Schema({
  username: String,
  description: String,
  duration: Number,
  date: Date
});

var Workout = mongoose.model("Workout", workoutSchema);

var userSchema = new mongoose.Schema({
  username: String,
  workouts: [{
    description: String,
    duration: Number,
    date: Date
  }]
});

var User = mongoose.model("User", userSchema);

app.post("/api/exercise/new-user", (req, res) => {

  let username = req.body.username;
  User.findOne({username: username}, (err, data) => {
    if (err) {return console.error(err);}
    else {
      if (data !== null) {
        res.json("Username already taken");
      } else {
        let newUser = new User({username: username, exercise: []});
        newUser.save((err, updatedUser) => {
          if (err) {return console.error(err);}
          else {
            res.json({"username": username, "_id": newUser._id});
          }
        });
      }
    }
  });
});

app.post("/api/exercise/add", (req, res) => {
  let userId = req.body.userId;
  let description = req.body.description;
  let time = Number(req.body.duration);
  let date;
  if (req.body.date !== '') {
    date = new Date(req.body.date);
  } else {
    date = new Date(Date.now());
  }
  
  if (description == '' || time == '' || userId == '') {
    res.json({"error": "invalid fields"});
  } else {
    
    User.findOne({_id: userId}, (err, data) => {
      if (err) {return console.error(err);}
      else if (data !== null) {
        let newWorkout = {
          username: data.username,
          description,
          duration: time,
          date: date.toDateString()
        }
        
        data.workouts = data.workouts.concat(newWorkout);
        data.workouts = data.workouts.sort((a, b) => a.date - b.date);
        data.save((err) => {if (err) return console.error(err)});
        res.json({
          username: newWorkout.username, 
          description: newWorkout.description, 
          duration: newWorkout.duration, 
          _id: data._id, 
          date: newWorkout.date
        });
      } else {
        res.json({"error": "create valid user first"});
      }
    });
  }
});

app.get("/api/exercise/users", (req, res) => {
  User.find({}, (err, data) => {
    if (err) {return console.error(err);}
    else if (data !== null) {
      res.json(data);
    } else {
      res.json({"error": "no known users"});
    }
  });
});

app.get("/api/exercise/log", (req, res) => {
  let userId = req.query.userId;
  let from = new Date(req.query.from);
  let to = new Date(req.query.to);
  let limit = Number(req.query.limit);
  
  User.findOne({_id: userId}, (err, data) => {
    if (err) {return console.error(err);}
    else if (data !== null) {
      let log = data.workouts;
      
      if (!isNaN(to.getTime()) && !isNaN(from.getTime())) {
        log = log.filter((item) => ((item.date <= to) && (item.date >= from)));
      }
      
      if (!isNaN(limit)) {
        log = log.slice(0, limit);
      }
      
      let count = log.length;
      
      res.send({ log, count });
      
    } else {
      res.json({"error": "cannot retrieve workout"});
    }
  })
});

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
