const express = require('express');
const session = require('cookie-session');
const bodyParser = require('body-parser');
const app = express();
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const assert = require('assert');
const http = require('http');
const url = require('url');

const mongourl = 'mongodb+srv://macs111:1997111@cluster0.zkyft.mongodb.net/381Project?retryWrites=true&w=majority';
const dbName = '381Project';


app.set('view engine', 'ejs');

const SECRETKEY = 'HelloWorld COMPS381F!';

const users = new Array({
    name: 'demo',
}, {
    name: 'student',
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
    // console.log(req.session);
    if (!req.session.authenticated) { // user not logged in --> variable "authenticated" inside authcookie session is not exist (null)
        res.redirect('/login');
    } else {
        handle_Find(req,res,{});
    }
});

// this route is for showing the login page
app.get('/login', (req, res) => {
    res.status(200).render('login', {});
});

// this route is for receiving the "login" form submission 
app.post('/login', (req, res) => {
    users.forEach((user) => {
        if (user.name == req.body.name) {
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

// new code here










// handle search
app.get('/search', (req, res) => {
    // var parsedURL = url.parse(req.url, true);
    // console.log("parsedURL.query: " + JSON.stringify(parsedURL.query));
    // let criteria = {};
    // let inputText = parsedURL.query.inputCriteria;
    // let option = parsedURL.query.options;
    // criteria[option] = inputText; // {name:"xxx"}

    
    // if (inputText.length == 0 && option === "all") {
    //      handle_Find(req, res, {});
    // } else if (inputText.length > 0 && option !== "all") {
    //     handle_Find(req, res, criteria);
    // } else {
    //     console.log("enter wrong")
    // }
    if(req.query.options==="all"){
        console.log("all");
        handle_Find(req, res, {}); 
    }else if(req.query.options==="name"){
        if(req.query.inputCriteria===""){
            handle_Find(req, res, {}); 
        }else{
        handle_Find(req, res, {"name":req.query.inputCriteria}); 
        }
    }else if(req.query.options==="borough"){
        if(req.query.inputCriteria===""){
            handle_Find(req, res, {}); 
        }
        else{
        handle_Find(req, res, {"borough":req.query.inputCriteria}); 
        }
    }else if(req.query.options==="cuisine"){
        if(req.query.inputCriteria===""){
            handle_Find(req, res, {}); 
        }else{
        handle_Find(req, res, {"cuisine":req.query.inputCriteria}); 
        }
    }





});

// --------------------------  CRUD operations  ---------------------------------------

const findDocument =  (db, criteria, callback) => {
    let cursor = db.collection('Restaurants').find(criteria);
    console.log(`findDocument criteria: ${JSON.stringify(criteria)}`);
    cursor.toArray((err, docs) => {
        assert.equal(err, null);
        callback(docs); // pass the result(array) to the callback function(caller's)
    });
}


const handle_Find =  (req ,res, criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        findDocument(db, criteria, (docs) => {
            client.close();
            console.log("Closed DB connection");
            console.log(docs);
            console.log("documents found: "+ docs.length);
            console.log("req.session.name :"+req.session.username)
            res.status(200).render('welcomePage',{
                name : req.session.username,
                length: docs.length,
                documents: docs
            }); 
        });
    });
}




app.listen(process.env.PORT || 8099);