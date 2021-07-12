const Validator  = require('fastest-validator');
const db = require('../models');
const Category_sub_table = require('../middleware/CategorySubTableMiddleware');
const Post = db.Post

exports.getPost = async(req, res) => {
    if(res.locals.user && res.locals.admin) {
        Post.findOne({where: {id: req.params.id}}).then(async(post) => {
            if(post) {
                categories = await Category_sub_table.getCategoriesForPost(post.id);
                res.status(200).send([
                    post,
                    categories
                ]);
            }
            else {
                res.status(404).send("post not found");
            }
        });
    }
    else {
        Post.findOne({where: {id: req.params.id, status: "active"}}).then(async(post) => {
            if(post) {
                categories = await Category_sub_table.getCategoriesForPost(post.id);
                res.status(200).send([
                    post,
                    categories
                ]);
            }
            else {
                res.status(404).send("post not found");
            }
        });
    }
};

exports.getPosts = async(req, res) => {
    if(res.locals.user && res.locals.admin) {
        Post.findAll({}).then(async(posts) => {
            if(posts) {
                let PostsCats = [];
                for(let post of posts) {
                    categories = await Category_sub_table.getCategoriesForPost(post.id);
                    PostsCats.push([post, categories])
                }
                res.status(200).send(PostsCats)
            }
            else {
                res.status(404).send("posts not found")
            }
        });
    }
    else {
        Post.findAll({where: {status: "active"}}).then(async(posts) => {
            if(posts) {
                let PostsCats = []
                for(let post of posts) {
                    categories = await Category_sub_table.getCategoriesForPost(post.id);
                    PostsCats.push([post, categories])
                }
                res.status(200).send(PostsCats)
            }
            else {
                res.status(404).send("posts not found")
            }
        });
    }
};

exports.createPost = async(req, res) => {
    if(res.locals.user) {
        const schema = {
            title: {type: "string"},
            content: {type: "string"},
            category_id: {type: "object"}
        };

        let data = {
            author_id: res.locals.user.id,
            title: req.body.title,
            content: req.body.content,
            category_id: req.body.category_id,
            likes: 0,
            status: "active",
        };

        const v = new Validator();
        const validationresponse = v.validate(data, schema);
        if(validationresponse !== true) {
            return res.status(400).json({
                message: "Validation fail",
                errors: validationresponse
            });
        }

        Post.create(data).then(async(post) => {
            await Category_sub_table.addCategory(req.body.category_id, post.id)
            res.status(201).send(data);
        });
        
    }
    else {
        res.status(403).send("only logged users can create posts");
    }
}

exports.updatePost = async(req, res) => {
    const schema = {
        status: { type: "string", optional: true, enum: [ "active", "inactive" ] },
        title: {type: "string", optional: true},
        content: {type: "string", optional: true},
        category_id: {type: "object", optional: true}
    }

    let data = {
        status: req.body.status,
        title: req.body.title,
        content: req.body.content,
        category_id: req.body.category_id,
    }

    const v = new Validator();
    const validationresponse = v.validate(data, schema);
    if(validationresponse !== true) {
        return res.status(400).json({
            message: "Validation fail",
            errors: validationresponse
        });
    }

    let post = await Post.findOne({where: {id: req.params.id}})

    if(req.body.category_id && ((res.locals.user && post.author_id == res.locals.user.id) || res.locals.admin)) {
        Category_sub_table.addCategory(req.body.category_id, post.id);
    }

    if(res.locals.admin && req.body.status) {

        Post.update({status: req.body.status}, {where: {id: req.params.id}});
    }
    
    if(res.locals.user && (req.body.title || req.body.content) && post && post.author_id == res.locals.user.id) {
        Post.update({title: req.body.title, content: req.body.content}, {where: {id: req.params.id}})
    }

    if(!res.locals.admin && !res.locals.user)
        res.status(403).send("You don't have permission to change this data");
    else
        res.status(200).send("data updated");
};

exports.deletePost = async(req, res) => {
    let post = await Post.findOne({where: {id: req.params.id}})

    if(!res.locals.admin && (!res.locals.user || (post.author_id != res.locals.user.id))) {
        return res.status(401).send("Only andmin and author can delete post");
    }
    Post.destroy({where: {id: req.params.id}}).then(() => {
        res.status(200).send("success");
    })
};