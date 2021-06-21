const express = require('express');
const app = express();

const { mongoose } = require('./db/mongoose');

const bodyParser = require('body-parser');

// load mongoose models
const { List, Task } = require('./db/models');

// load middleware
app.use(bodyParser.json());

// cors headers middleware
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, HEAD, OPTIONS, PUT");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-access-token, x-refresh-token, _id");
    next();
});

/**
 * ...................................................................
 *       LIST API started 
 * ...................................................................
 */

/**
 * GET /lists
 * Purpose: Get all lists
 */
app.get('/lists', (req, res) => {
    // return an array of all lists in the database
    List.find().then((lists) => {
        res.send(lists);
    });
});

/**
 * POSTS /lists
 * Purpose: Create a list
 */
app.post('/lists', (req, res) => {
    // create a new list and return the new list document back to the user (which includes the id)
    // The list information (fields) will be passed in via JSON request body
    let title = req.body.title;

    let newList = new List({
        title
    });
    newList.save().then((listDoc) => {
        res.send(listDoc);
    });
});

/**
 * PATCH /lists/:id
 * Purpose: Update a specified list
 */
app.patch('/lists/:id', (req, res) => {
    // update specified list (list document with id in the URL) with new values specified in the JSON body request
    List.findOneAndUpdate({ _id: req.params.id }, {
        $set: req.body
    }).then(() => {
        res.sendStatus(200);
    });
});

/**
 * DELETE /lists/:id
 * Purpose: Delete a list
 */
app.delete('/lists/:id', (req, res) => {
    // delete a specified list (document with id in the URL)
    List.findOneAndRemove({ 
        _id: req.params.id
    }).then((removedListDoc) => {
        res.send(removedListDoc);
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
app.get('/lists/:listId/tasks', (req, res) => {
    // return all tasks that belong to a specific list specified by listId
    Task.find({
        _listId: req.params.listId
    }).then((tasks) => {
        res.send(tasks);
    });
});

app.get('/lists/:listId/tasks/:taskId', (req, res) => {
    Task.findOne({
        _id: req.params.taskId,
        _listId: req.params.listId
    }).then((task) => {
        res.send(task);
    });
});

/**
 * POST /lists/:listId/tasks
 * Purpose: Create a task in a specific list
 */
app.post('/lists/:listId/tasks', (req, res) => {
    // create anew task in a list specified by listId
    let newTask = new Task({
        title: req.body.title,
        _listId: req.params.listId
    });
    newTask.save().then((taskDoc) => {
        res.send(taskDoc);
    });
});

/**
 * PATCH /lists/:listId/tasks/:taskId
 * Purpose: Create a task in a specific list
 */
app.patch('/lists/:listId/tasks/:taskId', (req, res) => {
    // update an existing task specified by taskId
    Task.findOneAndUpdate({ 
        _id: req.params.taskId,
        _listId: req.params.listId
    }, {
        $set: req.body
    }).then(() => {
        res.send({message: 'Updated Successfully'});
    });
});

/**
 * DELETE /lists/:listId/tasks/:taskId
 * Purpose: Delete a task
 */
app.delete('/lists/:listId/tasks/:taskId', (req, res) => {
    // delete a task specified by taskId
    Task.findOneAndRemove({
        _id: req.params.taskId,
        _listId: req.params.listId
    }).then((removedTaskDoc) => {
        res.send(removedTaskDoc);
    });
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});