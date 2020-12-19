const express = require('express');
const session = require('cookie-session');
const bodyParser = require('body-parser');
const app = express();

app.set('view engine', 'ejs');

const SECRETKEY = 'HelloWorld COMPS381F!';

const users = new Array({
    name: 'demo',
    password: 'demo'
}, {
    name: 'student',
    password: 'student'
});

app.set('view engine', 'ejs');

app.use(session({
    name: 'loginSession',
    keys: [SECRETKEY]
}));

// support parsing of application/json type post data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.get('/', (req, res) => {
    console.log(req.session);
    if (!req.session.authenticated) { // user not logged in --> variable "authenticated" inside authcookie session is not exist (null)
        res.redirect('/login');
    } else {
        res.status(200).render('logout', { // require user to login
            name: req.session.username
        });
    }
});

// this route is for showing the login page
app.get('/login', (req, res) => {
    res.status(200).render('login', {});
});

// this route is for receiving the "login" form submission 
app.post('/login', (req, res) => {
    users.forEach((user) => {
        if (user.name == req.body.name && user.password == req.body.password) {
            // correct user name + password
            // store the following name/value pairs in cookie session
            req.session.authenticated = true; // 'authenticated': true
            req.session.username = req.body.name; // 'username': req.body.name		
        }
    });
    res.redirect('/');
});

app.get('/logout', (req, res) => {
    req.session = null; // clear cookie-session
    res.redirect('/');
});

app.listen(process.env.PORT || 8099);