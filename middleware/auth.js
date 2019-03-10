const jwt = require('jsonwebtoken');
const key = require('../key');
const JWT_SECRET = key.JWT_SECRET;

module.exports = (req, res, next) => {

    // Extract Authorization property from the req Header
    const authHeader = req.get('Authorization');
    if(!authHeader) {
        req.isAuth = false;
        return next();
    }

    // Extract token from Authorization: 'Bearer ' + token
    const token = authHeader.split(' ')[1]; 
    let decodedToken;
    try {
        decodedToken = jwt.verify(token, JWT_SECRET);
    }
    catch (err) {
        req.isAuth = false;
        return next();
    }
    if(!decodedToken) 
    {
        req.isAuth = false;
        return next();
    }
    req.userId = decodedToken.userId;
    req.isAuth = true;
    next();
}