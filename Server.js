const express = require('express');
const session = require('cookie-session');
const bodyParser = require('body-parser');
const app = express();
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const assert = require('assert');
const http = require('http');
const url = require('url');
const formidable = require('express-formidable');
const fs = require("fs");

const { Certificate } = require('crypto');
const { compile } = require('ejs');

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

app.use(formidable());

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
        aGrade["user"]=req.session.username;
        document["grades"] = [aGrade];
        document["owner"] = req.session.username;

        if (files.fileToUpload.size > 0) {
            fs.readFile(files.fileToUpload.path, (err,data) => {
                assert.equal(err,null);
                 document["photo"] =  new Buffer.from(data).toString('base64');
                 document["photo mimetype"] = files.fileToUpload.type;
                 console.log("document to insert : "+ JSON.stringify(document));
            });
            handle_Insert(req,res,document);
        }else{
            handle_Insert(req,res,document);
        }
    
    });
});


app.post("/rate",(req,res)=>{
    let criteria ={"_id":req.query._id};
    let newRate = {"grade":req.query.score ,"user":req.session.username };

    let cursor = db.collection('Restaurants').find(criteria);
    console.log(`findDocument criteria: ${JSON.stringify(criteria)}`);
    cursor.toArray((err, docs) => {
        assert.equal(err, null);
        for(grade of docs[0].grades){
            if(grade.user === req.session.username){
                console.log("you have rated once");
            }else{
                //update
            }
        }
    });

app.get("/gmap", (req,res) => {
	res.render("leaflet.ejs", {
		lat:req.query.lat,
		lon:req.query.lon,
		zoom:req.query.zoom ? req.query.zoom : 18
	});
	res.end();

});

app.get("/remove",(req,res) => {
 handle_Delete(res, req, req.query);
})

app.post('/update', (req,res) => {
    handle_Update(res, req, req.query);
});

app.get('/edit',(req,res)=>{
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        /* use Document ID for query */
        let DOCID = {};
        DOCID['_id'] = ObjectID(req.query._id)
        findDocument(db, DOCID, (docs) => { // docs contain 1 document (hopefully)
            client.close();
            console.log("Closed DB connection");
            console.log("docs[0]: " + JSON.stringify(docs[0]));
            res.status(200).render('edit', {
                doc: docs[0]
            });
        });
    });
})
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
    db.collection('Restaurants').insert(RestaurantDoc);
   console.log(`Document to insert : ${JSON.stringify(RestaurantDoc)}`);
   
       callback(RestaurantDoc); // pass the result(array) to the callback function(caller's)

}

const deleteDocument = (db, criteria, callback) => {
    db.collection('Restaurants').deleteMany(criteria, (err,results) => {
        assert.equal(err,null);
        console.log('deleteMany was successful');
        callback(results);
    })
}
const updateDocument = (criteria, updateDoc, callback) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

         db.collection('Restaurants').updateOne(criteria,
            {
                $set : updateDoc
            },
            (err, results) => {
                client.close();
                assert.equal(err, null);
                callback(results);
            }
        );
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
            //console.log(docs);
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
        insertDocument(db,newDoc,(docs)=>{
            client.close();
            console.log("Closed DB connection");
            res.status(200).render('RestaurantDoc', {
                doc: docs,
                name:req.session.username
            });
        });
    });
}


const handle_Delete = (res, req, criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);
    	let DOCID = {};
        DOCID['_id'] = ObjectID(criteria._id);
	    findDocument(db, DOCID, (docs) => { // docs contain 1 document (hopefully)
            console.log("docs[0]: " + JSON.stringify(docs[0]));
		    if (req.session.username == req.session.username){
            	deleteDocument(db, DOCID, (results) => {
                res.status(200).render('Delete');
                client.close();
                console.log("Closed DB connection");
                });     
            }
	        else{
                res.status(200).render('warning');
                client.close();
                console.log("Closed DB connection");            
            }
        });
    });
}

const handle_Update = (res, req, criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);
        console.log(req.fields.name);
        var DOCID = {};
        DOCID['_id'] = ObjectID(req.fields._id);
        findDocument(db, DOCID, (docs) => {     
            if (req.session.username == req.session.username){    
                var updateDoc = {};
                updateDoc["name"]= req.fields.name;
                updateDoc["cuisine"]= req.fields.cuisine;
                updateDoc["borough"]= req.fields.borough;
                var address={};
                address["street"]= req.fields.street;
                address["zipcode"] = req.fields.zipcode;
                address["building"]= req.fields.building;
                address ["coord"]=[req.fields.lon , req.fields.lat];
                updateDoc["address"]= address;
                //updateDoc["owner"]=req.flields.owner;
                    if (req.files.fileToUpload.size > 0) {
                        fs.readFile(req.files.fileToUpload.path, (err,data) => {
                        updateDoc['photo'] = new Buffer.from(data).toString('base64');
                        updateDocument(DOCID, updateDoc, (results) => {
                            console.log(results.reuslt.nModified);
                            res.redirect('/');
                            
                        });
                    });
                } 
                    else {
                    updateDocument(DOCID, updateDoc, (results) => {
                        console.log(results.result.nModified);
                        res.redirect('/');
                        
                    });
                }
                client.close();
                console.log("Closed DB connection");
            }    
            else{
                res.status(200).render('warning');
                client.close();
                console.log("Closed DB connection");  
            }
        });
    });
}

app.listen(process.env.PORT || 8099);
