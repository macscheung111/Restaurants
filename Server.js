const express = require('express');
const session = require('cookie-session');
const bodyParser = require('body-parser');
const app = express();
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const assert = require('assert');
const http = require('http');
const url = require('url');
const formidable = require('formidable');
const fs = require("fs");

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
        handle_Find(req, res, {});
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
    if (req.query.options === "all") {
        console.log("all");
        handle_Find(req, res, {});
    } else if (req.query.options === "name") {
        if (req.query.inputCriteria === "") {
            handle_Find(req, res, {});
        } else {
            handle_Find(req, res, {
                "name": req.query.inputCriteria
            });
        }
    } else if (req.query.options === "borough") {
        if (req.query.inputCriteria === "") {
            handle_Find(req, res, {});
        } else {
            handle_Find(req, res, {
                "borough": req.query.inputCriteria
            });
        }
    } else if (req.query.options === "cuisine") {
        if (req.query.inputCriteria === "") {
            handle_Find(req, res, {});
        } else {
            handle_Find(req, res, {
                "cuisine": req.query.inputCriteria
            });
        }
    }
});



// handle detail
app.get('/display', (req, res) => {
    handle_Details(req, res, req.query)
});


app.get("/newDoc", (req, res) => {
    res.status(200).render('InsertRestaurant');
    // console.log("req.query : " + req.query);
    //handle_Insert(req,res);
});

app.post("/insert", (req, res) => {

    var document = {};

    var form = new formidable.IncomingForm();
    form.parse(req,(err,fields,files) => {

       
        document["name"]= fields.name;
        document["cuisine"]= fields.cuisine;
        document["borough"]= fields.borough;
        var address={};
        address["street"]= fields.street;
        address["zipcode"] = fields.zipcode;
        address["building"]= fields.building;
        address ["coord"]=[fields.lon , fields.lat];
        document["address"]= address;
        var aGrade = {};
        aGrade["grade"]= files.grade;
        aGrade["createdBy"]=req.session.username;
        document["grades"] = [files.aGrade];
        document["owner"] = req.session.username;

        console.log("fields: "+JSON.stringify(fields));
        console.log("files: "+JSON.stringify(files));
        console.log("files.filetoupload.path: "+JSON.stringify(files.filetoupload.path));

        // if (files.fileToUpload.size > 0) {
        //     fs.readFile(files.filetoupload.path, (err,data) => {
        //         assert.equal(err,null);
        //          document["photo"] =  new Buffer.from(data).toString('base64');
        //          document["photo mimetype"] = files.fileToUpload.type;
        //     });
        // }
    
    });
    console.log("document to insert : "+ JSON.stringify(document));
    res.status(200).render('InsertRestaurant');
});










// --------------------------  CRUD operations  ---------------------------------------

const findDocument = (db, criteria, callback) => {
    let cursor = db.collection('Restaurants').find(criteria);
    console.log(`findDocument criteria: ${JSON.stringify(criteria)}`);
    cursor.toArray((err, docs) => {
        assert.equal(err, null);
        callback(docs); // pass the result(array) to the callback function(caller's)
    });
}

const insertDocument = (db, RestaurantDoc, callback) => {
    let cursor = db.collection('Restaurants').insert(RestaurantDoc);
    console.log(`Document to insert : ${JSON.stringify(RestaurantDoc)}`);
    cursor.toArray((err, docs) => {
        assert.equal(err, null);
        callback(docs); // pass the result(array) to the callback function(caller's)
    });
}


// ---------------------------------------------------------------------------------------

const handle_Find = (req, res, criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        findDocument(db, criteria, (docs) => {
            client.close();
            console.log("Closed DB connection");
            console.log(docs);
            console.log("documents found: " + docs.length);
            console.log("req.session.name :" + req.session.username)
            res.status(200).render('welcomePage', {
                name: req.session.username,
                length: docs.length,
                documents: docs
            });
        });
    });
}




const handle_Details = (req, res, criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        /* use Document ID for query */
        let DOCID = {};
        DOCID['_id'] = ObjectID(criteria._id)
        findDocument(db, DOCID, (docs) => { // docs contain 1 document (hopefully)
            client.close();
            console.log("Closed DB connection");
            console.log("docs[0]: " + JSON.stringify(docs[0]));
            res.status(200).render('RestaurantDoc', {
                doc: docs[0],
                name: req.session.username
            });
        });
    });
}


const handle_Insert = (req, res, newDoc) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);
        client.close();
        console.log("Closed DB connection");
        console.log("req.query: " + JSON.stringify(req.query))
        res.status(200).render('InsertRestaurant', {
            doc: docs[0],
            name: req.session.username
        });

    });
}













app.listen(process.env.PORT || 8099);