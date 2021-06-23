const express = require('express');
const app = express();

const { mongoose } = require('./db/mongoose');

const bodyParser = require('body-parser');

// load mongoose models
const { List, Task, User } = require('./db/models');

const jwt = require('jsonwebtoken');

// *** MIDDLEWARE ***

// load middleware
app.use(bodyParser.json());

// cors headers middleware
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, HEAD, OPTIONS, PUT");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-access-token, x-refresh-token, _id");
    
    res.header(
        'Access-Control-Expose-Headers',
        'x-access-token, x-refresh-token'
    );

    next();
});

// check whether the request has a valid JWT access token 
let authenticate = (req, res, next) => {
    let token = req.header('x-access-token');

    // verify the JWT 
    jwt.verify(token, User.getJWTSecret(), (err, decoded) => {
        if (err) {
            // jwt is invalid - * DO NOT AUTHENTICATE*
            res.status(401).send(err);
        } else {
            // jwt is valid 
            req.user_id = decoded._id;
            next();
        }
    });
}

// verify refresh token middleware (which will be erifying the session)
let verifySession = (req, res, next) => {
    // grab the refresh token from the request header 
    let refreshToken = req.header('x-refresh-token');

    // grab the _id from the request header 
    let _id = req.header('_id');

    User.findByIdAndToken(_id, refreshToken).then((user) => {
        if (!user) {
            // user couldn't be found
            return Promise.reject({
                'error': 'User not found. Make sure that the refresh token and user id are correct'
            });
        }
        // if the code reaches here - the user was found 
        // therefore the refresh token exists in the database - but still have to check if it has expired or not
        req.user_id = user._id;
        req.userObject = user;
        req.refreshToken = refreshToken;

        let isSessionValid = false;
    
        user.sessions.forEach((session) => {
            if (session.token === refreshToken) {
                // check the sessison has expired 
                if (User.hasRefreshTokenExpired(session.expiresAt) === false) {
                    // refresh token has not expired 
                    isSessionValid = true;
                }
            }
        });
    
        if (isSessionValid) {
            // the session is valid - call next() to continue with processing this web request
            next();
            console.log(isSessionValid)
        } else {
            // the session is not valid 
            return Promise.reject({
                'error': 'Refresh token has expired or the session is invalid'
            });
        }
    }).catch((e) => {
        res.status(401).send('error' + e);
    });
}

// *** END MIDDLEWARE ***

/**
 * ...................................................................
 *       LIST API started 
 * ...................................................................
 */

/**
 * GET /lists
 * Purpose: Get all lists
 */
app.get('/lists', authenticate, (req, res) => {
    // return an array of all lists that belongs to the authenticated user
    List.find({
        _userId: req.user_id
    }).then((lists) => {
        res.send(lists);
    }).catch((e) => {
        res.send(e);
    });
});

/**
 * POSTS /lists
 * Purpose: Create a list
 */
app.post('/lists', authenticate, (req, res) => {
    // create a new list and return the new list document back to the user (which includes the id)
    // The list information (fields) will be passed in via JSON request body
    let title = req.body.title;

    let newList = new List({
        title,
        _userId: req.user_id
    });
    newList.save().then((listDoc) => {
        res.send(listDoc);
    });
});

/**
 * PATCH /lists/:id
 * Purpose: Update a specified list
 */
app.patch('/lists/:id', authenticate, (req, res) => {
    // update specified list (list document with id in the URL) with new values specified in the JSON body request
    List.findOneAndUpdate({ 
        _id: req.params.id,
        _userId: req.user_id
    }, { $set: req.body }).then(() => {
        res.sendStatus(200);
    });
});

/**
 * DELETE /lists/:id
 * Purpose: Delete a list
 */
app.delete('/lists/:id', authenticate, (req, res) => {
    // delete a specified list (document with id in the URL)
    List.findOneAndRemove({ 
        _id: req.params.id,
        _userId: req.user_id
    }).then((removedListDoc) => {
        res.send(removedListDoc);

        // delete all the tasks are in deleted list 
        deleteTasksFromList(removedListDoc._id);

    });
});

/**
 * ...................................................................
 *       TASK API started 
 * ...................................................................
 */

/**
 * GET /lists/:listId/tasks
 * Purpose: Get all tasks in a specific list
 */
app.get('/lists/:listId/tasks', authenticate, (req, res) => {
    // return all tasks that belong to a specific list specified by listId
    Task.find({
        _listId: req.params.listId,
        _userId: req.user_id
    }).then((tasks) => {
        res.send(tasks);
    });
});

// app.get('/lists/:listId/tasks/:taskId', authenticate, (req, res) => {
//     Task.findOne({
//         _id: req.params.taskId,
//         _listId: req.params.listId,
//         _userId: req.user_id
//     }).then((task) => {
//         res.send(task);
//     });
// });

/**
 * POST /lists/:listId/tasks
 * Purpose: Create a task in a specific list
 */
app.post('/lists/:listId/tasks', authenticate, (req, res) => {
    // create anew task in a list specified by listId

    List.findOne({
        _id: req.params.listId,
        _userId: req.user_id
    }).then((list) => {
        if (list) {
            // list object with the specified conditions was found
            // therefore the currently authenticated user can create new tasks 
            return true;
        }
        // list object is undefined 
        return false;
    }).then((canCreateTask) => {
        if (canCreateTask) {
            let newTask = new Task({
                title: req.body.title,
                _listId: req.params.listId
            });
            newTask.save().then((taskDoc) => {
                res.send(taskDoc);
            });
        } else {
            res.sendStatus(404);
        }
    });
});

/**
 * PATCH /lists/:listId/tasks/:taskId
 * Purpose: Create a task in a specific list
 */
app.patch('/lists/:listId/tasks/:taskId', authenticate, (req, res) => {
    // update an existing task specified by taskId

    List.findOne({
        _id: req.params.listId,
        _userId: req.user_id
    }).then((list) => {
        if (list) {
            // list object with the specified conditions was found
            // therefore the currently authenticated user can update tasks within this list 
            return true;
        }
        // list object is undefined 
        return false;
    }).then((canUpdateTasks) => {
        if (canUpdateTasks) {
            // the currently authenticated user can update tasks
            Task.findOneAndUpdate({ 
                _id: req.params.taskId,
                _listId: req.params.listId
            }, {
                $set: req.body
            }).then(() => {
                res.send({message: 'Updated Successfully'});
            });
        } else {
            res.sendStatus(404);
        }
    });
});

/**
 * DELETE /lists/:listId/tasks/:taskId
 * Purpose: Delete a task
 */
app.delete('/lists/:listId/tasks/:taskId', authenticate, (req, res) => {
    // delete a task specified by taskId
    List.findOne({
        _id: req.params.listId,
        _userId: req.user_id
    }).then((list) => {
        if (list) {
            // list object with the specified conditions was found
            // therefore the currently authenticated user can delete tasks within this list
            return true;
        }
        // else - the list object is undefined
        return false;
    }).then((canDeleteTasks) => {
        
        if (canDeleteTasks) {
            Task.findOneAndRemove({
                _id: req.params.taskId,
                _listId: req.params.listId
            }).then((removedTaskDoc) => {
                res.send(removedTaskDoc);
            })
        } else {
            res.sendStatus(404);
        }
    });
});



// *** USER ROUTES ***

/**
 * POST /users
 * Purpose: registration
 */
app.post('/users', (req, res) => {
    // user registration 
    let body = req.body;
    let newUser = new User(body);

    newUser.save().then(() => {
        return newUser.createSession();
    }).then((refreshToken) => {
        // session created successfully - refreshToken returned 
        // now we generate an access with token for the user 

        return newUser.generateAccessAuthToken().then((accessToken) => {
            // access with token successfully, now we return an object containing the auth tokens
            return {accessToken, refreshToken};
        });
    }).then((authTokens) => {
        // Now we construct and send the response to the user with their auth tokens in the header and the user object in the body
        res
            .header('x-refresh-token', authTokens.refreshToken)
            .header('x-access-token', authTokens.accessToken)
            .send(newUser);
    }).catch((e) => {
        res.status(400).send(e);
    });
});

/**
 * POST /users/login
 * Purpose: sign in
 */
app.post('/users/login', (req, res) => {
    let email = req.body.email;
    let password = req.body.password;

    User.findByCredentials(email, password).then((user) => {
        return user.createSession().then((refreshToken) => {
            // session created successfully - refreshToken returned 
            // now we generate an access auth token for the user

            return user.generateAccessAuthToken().then((accessToken) => {
                // access auth token generated successfully, now we return an object containing the auth tokens
                return {accessToken, refreshToken}
            });
        }).then((authTokens) => {
            // Now we construct and send the response to the user with their auth tokens in the header and the user object in the body
            res
                .header('x-refresh-token', authTokens.refreshToken)
                .header('x-access-token', authTokens.accessToken)
                .send(user);
        });
    }).catch((e) => {
        res.status(400).send(e);
    });
    
});

/**
 * GET /users/me/access-token
 * Purpose: generates and returns an access token
 */
app.get('/users/me/access-token', verifySession, (req, res) => {
    // user/caller is authenticated and have the user_id and user objet available
    req.userObject.generateAccessAuthToken().then((accessToken) => {
        res.header('x-access-token', accessToken).send({ accessToken });
    }).catch((e) => {
        res.status(400).send(e);
    });
});


// *** helper methods ***
let deleteTasksFromList = (_listId) => {
    Task.deleteMany({
        _listId
    }).then(() => {
        console.log('Tasks from ' + _listId + ' were deleted');
    });
}

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});