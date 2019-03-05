const jwt = require('jsonwebtoken');
const key = require('../key');
const JWT_SECRET = key.JWT_SECRET;

module.exports = (req, res, next) => {

    // Extract Authorization property from the req Header
    const authHeader = req.get('Authorization');
    if(!authHeader) {
        const error = new Error('Not authenticated.');
        error.statusCode = 401;
        throw error;
    }

    // Extract token from Authorization: 'Bearer ' + token
    const token = authHeader.split(' ')[1]; 
    let decodedToken;
    try {
        decodedToken = jwt.verify(token, JWT_SECRET);
    }
    catch (err) {
        err.statusCode = 500;
        throw err;
    }
    if(!decodedToken) 
    {
        const error = new Error('Not authenticated.');
        error.statusCode = 401;
        throw error;
    }
    req.userId = decodedToken.userId;
    next();
}