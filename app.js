const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');

const graphqlHttp = require('express-graphql');
const graphqlSchema = require('./graphql/schema');
const graphqlResolver = require('./graphql/resolvers');
const auth = require('./middleware/auth');
const {clearImage} = require('./util/file');
const uuidv4 = require('uuid/v4');
const key = require('./key');
const MONGODB_URI = key.MONGODB_URI;

const app = express();

// Configure multer storage to define where to save the file
const fileStorage = multer.diskStorage({
    // define where the file should be stored
    destination: (req, file, cb) => {
        cb(null, 'images');
    },
    // define how to name the file
    filename: (req, file, cb) => {
        cb(null, uuidv4()); //new Date().toISOString() + '-' + file.originalname);
    }
});

// Define a fileFilter to be used by multer to specify which files are acceptable
const fileFilter = (req, file, cb) => {
    if(
        file.mimetype === 'image/png' || 
        file.mimetype === 'image/jpg' || 
        file.mimetype === 'image/jpeg'
        ) {
        cb(null, true); // true means accept the file
    }
    else {
        cb(null, false);
    }
};

//app.use(bodyParser.urlencoded()); /// x-www-form-urlencoded <form>
app.use(bodyParser.json());  //application/json

// Use multer to extract the file out of req and save them
app.use(
    multer({ storage: fileStorage, fileFilter: fileFilter }) 
    .single('image') // inform multer to extract a single file stored in a field called image in the incoming requests.
);

// Serve the images staticlly
// All the req starting with /images, will go through this middleware
// __dirname: path to the dir were this file is located
app.use('/images', express.static(path.join(__dirname, 'images')))
//app.use('/images', express.static(__dirname));

app.use((req, res, next) => {
    // set all the domains that should be able to access our server
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTION');
    // set all the headers that should be allowed
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); 
    if(req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(auth);

// To create a post with images:
// First send a REST req to save the image and return the path to the front
// Then send a graphql req with this path and the rest of the data
app.put('/post-image', (req, res, next) => {
    if(!req.isAuth) {
        throw new Error('Not authenticated');
    }
    if(!req.file) {
        return res.status(200).json({message: 'No file provided.'});
    }
    if(req.body.oldPath) {
        clearImage(req.body.oldPath);       
    }
    return res.status(201)
    .json({message: 'File stored.', filePath: req.file.path});
});


app.use('/graphql', graphqlHttp({
        schema: graphqlSchema,
        rootValue: graphqlResolver,
        graphiql: true,
        formatError(err) {
            // originalError will be set by express-graphQL
            // when it detects an error thrown in our code or by a third party package.
            if(!err.originalError) {  // Example missing char in a query
                return err;
            }
            const data = err.originalError.data;
            const message = err.message || 'An Error occered.';
            const code = err.originalError.code || 500;
            return { message: message, status: code, data: data}
        }
    })
);

app.use((error, req, res, next) => {
    //console.log(error);
    const status = error.statusCode || 500;
    const message = error.message;
    const data = error.data;
    res.status(status).json({  message: message, data: data });
});

mongoose.connect(MONGODB_URI + '?retryWrites=true', { useNewUrlParser: true } )
.then(result => {
    app.listen(8080);
})
.catch(err => console.log(err));

