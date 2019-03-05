const fs = require('fs');
const path = require('path');
const {validationResult } = require('express-validator/check');

const Post = require('../models/post');
const User = require('../models/user');

exports.getPosts = async (req, res, next) => {
    const currentPage = req.query.page || 1;
    const perPage = 2;
    let totalItems;
    try {
        const totalItems = await Post.find().countDocuments();
        const posts = await Post.find()
            .populate('creator')
            .sort({createdAt: -1})  // -1: Descending order
            .skip((currentPage -1) * perPage)
            .limit(perPage);
        res.status(200).json({
            message: 'Fetched posts',
            posts: posts,
            totalItems: totalItems
        })
    }
    catch (err) {
        if(!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.createPost = async (req, res, next) => {

    // Check validation errors that were gathered in routes 
    const errors = validationResult(req);  
    if(!errors.isEmpty()) {
        const error = new Error('Validation failed, entered data is incorrect.');
        error.statusCode = 422;
        throw error;
        // return res.status(422).json({
        //     message: 'Validation failed, entered data is incorrect.',
        //     errors: errors.array()
        // });
    }
    if(!req.file) {
        const error = new Error('No image provided.');
        error.statusCode = 422;
        throw error;
    }
    let imageUrl = req.file.path;
    if(process.platform === "win32")
    {
        imageUrl = imageUrl.replace("\\" ,"/");
    }
    const title = req.body.title;
    const content = req.body.content;
 
    // Create the post in DB
    const post = new Post({
        // _id will be automatically created by mongoose
        //  createdAt: timestamp will be automatically created by mongoose
        title: title,
        content: content,
        imageUrl: imageUrl,
        creator: req.userId //userId is extracted from the token in the middleware/is-auth            
    });
    try {
        await post.save(); // Saves the model in the DB
        const user = await User.findById(req.userId);  // find the user to update its Posts 

        // Update the user Posts in DB
        user.posts.push(post);  //mongoose will do all the heavy lifting of pulling out the post ID and adding that to the user.
        await user.save();     
        res.status(201).json({
            message: 'Post created',
            post: post,
            creator: {_id: user._id, name: user.name}
        });
    }
    catch (err) {
        if(!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.getPost = async (req, res, next) => {
    const postId = req.params.postId;
    try {
        const post = await Post.findById(postId).populate('creator');
        if(!post) {
            const error = new Error('Could not find post.');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({message: 'Postfetched', post: post });
    }
    catch (err) {
        if(!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.updatePost = async (req, res, next) => {

    // Check validation errors that were gathered in routes 
    const errors = validationResult(req); 
    if(!errors.isEmpty()) {
        const error = new Error('Validation failed, entered data is incorrect.');
        error.statusCode = 422;
        throw error;
    }

    const postId = req.params.postId;
    const title = req.body.title;
    const content = req.body.content;
    let imageUrl = req.body.image;  // If no new file is added, the previoud path is used
    if(req.file) {   // If user enters a new file to replace the old one
        imageUrl = req.file.path;
        if(process.platform === "win32")
        {
            imageUrl = imageUrl.replace("\\" ,"/");
        }
    }
    if(!imageUrl) {
        const error = new Error('No file picked.');
        error.statusCode
    }

    // Update the post in DB
    try {
        const post = await Post.findById(postId).populate('creator');
        if(!post) {
            const error = new Error('Could not find post.');
            error.statusCode = 404;
            throw error;
        }
        //if(post.creator.toString() !== req.userId) {
        if(post.creator._id.toString() !== req.userId) {
            const error = new Error('Not authorzied.');
            error.statusCode = 403;
            throw error;
        }
        if(!imageUrl !== post.imageUrl) {
            clearImage(post.imageUrl);
        }
        post.title = title;
        post.imageUrl = imageUrl;
        post.content = content;
        const result = await post.save();  
        res.status(200).json({
            message: 'Post updated!',
            post: result
        });
    } 
    catch (err) {
        if(!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.deletePost = async (req, res, next) => {
    const postId = req.params.postId;
    try {
        const post = await Post.findById(postId);
        if(!post) {
            const error = new Error('Could not find post.');
            error.statusCode = 404;
            throw error;
        }
        // checked logged in user
        if(post.creator.toString() !== req.userId) {
            const error = new Error('Not authorized.');
            error.statusCode = 403;
            throw error;
        }
        clearImage(post.imageUrl);
        await Post.findByIdAndRemove(postId);      
    
        // Find the User in DB and update its posts
        const user = await User.findById(req.userId);
        user.posts.pull(postId);  // pull is a mongoose funtion that removes the post with the specified ID
        await user.save();        
        res.status(200).json({ message: 'Deleted post.' });
    }
    catch(err) {
        if(!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }  
}

const clearImage = filePath => {
    filePath = path.join(__dirname, '..', filePath);
    fs.unlink(filePath, err => console.log(err));  //Asynchronously removes the file
}