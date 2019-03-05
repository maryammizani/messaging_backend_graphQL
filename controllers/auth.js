const {validationResult} = require('express-validator/check');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const key = require('../key');
const JWT_SECRET = key.JWT_SECRET;

exports.signup = async (req, res, next) => {

    // Check the validation errors that were gathered in routes
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        const error = new Error('Validation failed.');
        error.statusCode = 422;
        error.data = errors.array();
        throw error;
    }
    const email = req.body.email;
    const name = req.body.name;
    const password = req.body.password;
    try {
        const hashedPw = await bcrypt.hash(password, 12)  // salt(strength)=12
        const user = new User({
            email: email,
            password: hashedPw,
            name: name
        });
        const result = await user.save();  
        res.status(201).json({message: 'User created', userId: result._id})
    }
    catch (err) {
        if(!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.login = async (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    try {
        let user = await User.findOne({email: email})
        if(!user) {
            const error = new Error('A user with this email could not be found.');
            error.statusCode = 401;
            throw error;
        }
        const isEqual = await bcrypt.compare(password, user.password);
        if(!isEqual) {
            const error = new Error('Wrong password');
            error.statusCode = 401;
            throw error;
        }
        // jwt.sign() creates a new signature and packs that into a new json web token. 
        // we can add any data into the token (user email ,... )
        const token = jwt.sign({
            email: user.email,
            userId: user._id.toString()
            }, 
            JWT_SECRET, 
            {expiresIn: '1h'}  // configure the token to expire in 1 hour
        ); 
        res.status(200).json({
            token: token, 
            userId: user._id.toString()
        });
    }
    catch (err) {
        if(!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    } 
}

exports.updateUserStatus = async (req, res, next) => {

    // Check the validation errors that were gathered in routes
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        console.log('error');
        const error = new Error('Validation failed.');
        error.statusCode = 422;
        error.data = errors.array();
        throw error;
    }

    try {
        const newStatus = req.body.status;
        let user = await User.findById(req.userId)
        if(!user) {
            const error = new Error('User not found.');
            error.statusCode = 404;
            throw error;
        }
        user.status = newStatus;  
        await user.save();     
        res.status(200).json({
            message: 'User updated.'
        })
    }
    catch (err) {
        if(!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.getUserStatus = async (req, res, next) => {
    try {
        const user = await User.findById(req.userId)
        if(!user) {
            const error = new Error('User not found.');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({message: 'getStatus', status: user.status });
    }  
    catch (err) {
        if(!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}


