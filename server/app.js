const express = require('express');
const path = require('path');
const utils = require('./lib/hashUtils');
const partials = require('express-partials');
const bodyParser = require('body-parser');
const Auth = require('./middleware/auth');
const models = require('./models');

const app = express();

app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');
app.use(partials());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));



app.get('/',
(req, res) => {
  res.render('index');
});

app.get('/create',
(req, res) => {
  res.render('index');
});

app.get('/links',
(req, res, next) => {
  models.Links.getAll()
    .then(links => {
      res.status(200).send(links);
    })
    .error(error => {
      res.status(500).send(error);
    });
});

app.post('/links',
(req, res, next) => {
  var url = req.body.url;
  if (!models.Links.isValidUrl(url)) {
    // send back a 404 if link is not valid
    return res.sendStatus(404);
  }

  return models.Links.get({ url })
    .then(link => {
      if (link) {
        throw link;
      }
      return models.Links.getUrlTitle(url);
    })
    .then(title => {
      return models.Links.create({
        url: url,
        title: title,
        baseUrl: req.headers.origin
      });
    })
    .then(results => {
      return models.Links.get({ id: results.insertId });
    })
    .then(link => {
      throw link;
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(link => {
      res.status(200).send(link);
    });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/
//route post request from /login
//route post request from /signup
app.post('/signup', (req, res, next) => {
  var username = req.body.username;
  var password = req.body.password;
  models.Users.get({username})
    .then(user => {
      if (user) {
        //redirect user to login page
        // res.status(303).send('/signup');
        res.redirect("/signup");
        //res.send <--- JSON, status code, text, res.sendFile <--static file that won't change, if dealing with variables use--> res.render, mostly use render even with static files
      }
      models.Users.create({username, password});
    })
      .then((err) => {
        if (err) {
          throw err;
        }
        // app.get('/', auth.)
        res.redirect('/');
      });
});
  //send req.body.username and req.body.password to
  //Users.get to check if user name is taken
  //if it isn't, create a new user with Users.create
//NEXT STEPS:
  //finishing app.post authentication routes
    //how far do we go into directing the user to the next place
app.post('/login', (req, res, next) => {
  var username = req.body.username;
  var password = req.body.password;
  models.Users.get({username})
    .then((err, user) => {
      if (err) {
        throw err;
      }
      if (user) {
        models.Users.compare(password, user.password, user.salt);
      }
    })
    .then(result => {
      if (false) {
        throw (false);
      }
      res.redirect('/');
    });
});




/************************************************************/
// Handle the code parameter route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/:code', (req, res, next) => {

  return models.Links.get({ code: req.params.code })
    .tap(link => {

      if (!link) {
        throw new Error('Link does not exist');
      }
      return models.Clicks.create({ linkId: link.id });
    })
    .tap(link => {
      return models.Links.update(link, { visits: link.visits + 1 });
    })
    .then(({ url }) => {
      res.redirect(url);
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(() => {
      res.redirect('/');
    });
});

module.exports = app;
