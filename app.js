const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');

const uuidv4 = require('uuid/v4');

const feedRoutes = require('./routes/feed');
const authRoutes = require('./routes/auth');
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

app.use((req, res, next) => {
    // set all the domains that should be able to access our server
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTION');
    // set all the headers that should be allowed
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); 
    next();
});

app.use('/feed', feedRoutes);
app.use('/auth', authRoutes);

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

