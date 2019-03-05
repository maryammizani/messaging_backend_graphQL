const express = require('express');
const {body} = require('express-validator/check');
const User = require('../models/user');
const authController = require('../controllers/auth');
const isAuth = require('../middleware/is-auth');

const router = express.Router();

router.put('/signup', [
    body('email')
        .isEmail()
        .withMessage('Please enter a valid email.')
        .custom((value, {req}) => {   
            // value is the email property value
            // req is an object from which we can extract the req as a property with the destructuring syntax
            // custom function returns true if validation succeeds or returns a promise in case it needs to do an async task
            return User.findOne({ email: value })
            .then(userDoc => {
                if(userDoc) {
                    return Promise.reject('Email already exists!');
                }
            })
        })
        .normalizeEmail(),
    body('password')
        .trim()
        .isLength({min: 5}),
    body('name')
        .trim()
        .not()
        .isEmpty()
    ],
    authController.signup
);

router.post('/login', authController.login);

router.patch('/status', isAuth, [
    body('status')
    .trim()
    .not()
    .isEmpty()
    ],
    authController.updateUserStatus);
    
router.get('/status', isAuth, authController.getUserStatus);

module.exports = router;