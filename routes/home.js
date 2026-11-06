var User = require('../models/user');
var mongoose = require('mongoose');
var Task = require('../models/task');

module.exports = function (router) {
    router.route('/users').get(function (req, res) {
        var where;
        try {
            if (req.query.where !== undefined) {
                where = JSON.parse(req.query.where);
            } else {
                where = {};
            }
            if (where === null || typeof where !== 'object' || Array.isArray(where)) {
                return res.status(400).json({ message: 'Bad Request', data: null });
            }
        } catch (err) {
            return res.status(400).json({ message: 'Bad Request', data: null });
        }

        var sort;
        try {
            if (req.query.sort !== undefined) {
                sort = JSON.parse(req.query.sort);
            } else {
                sort = {};
            }
            if (sort === null || typeof sort !== 'object' || Array.isArray(sort)) {
                return res.status(400).json({ message: 'Bad Request', data: null });
            }
        } catch (err) {
            return res.status(400).json({ message: 'Bad Request', data: null });
        }

        var select;
        try {
            if (req.query.select !== undefined) {
                select = JSON.parse(req.query.select);
            } else {
                select = {};
            }
            if (select === null || typeof select !== 'object' || Array.isArray(select)) {
                return res.status(400).json({ message: 'Bad Request', data: null });
            }
        } catch (err) {
            return res.status(400).json({ message: 'Bad Request', data: null });
        }

        var skip = 0;
        if (req.query.skip !== undefined) {
            skip = Number(req.query.skip);
            if (!Number.isInteger(skip) || skip < 0) {
                return res.status(400).json({ message: 'Bad Request', data: null });
            }
        }

        var limit;
        if (req.query.limit !== undefined) {
            limit = Number(req.query.limit);
            if (!Number.isInteger(limit) || limit < 0) {
                return res.status(400).json({ message: 'Bad Request', data: null });
            }
        }

        var count = false;
        if (req.query.count !== undefined) {
            if (req.query.count !== 'true' && req.query.count !== 'false') {
                return res.status(400).json({ message: 'Bad Request', data: null });
            }
            count = req.query.count === 'true';
        }

        var query;
        if (count) {
            query = User.countDocuments(where);
        } else {
            query = User.find(where).sort(sort).select(select).skip(skip);
            if (limit !== undefined) {
                query = query.limit(limit);
            }
        }

        query.then(function (users) {
            res.status(200).json({
                message: 'Success',
                data: users
            });
        }).catch(function (err) {
            res.status(500).json({
                message: 'Server Error',
                data: null
            });
        });
    });

    router.route('/users/:id').get(function (req, res) {
        var select;
        try {
            if (req.query.select !== undefined) {
                select = JSON.parse(req.query.select);
            } else {
                select = {};
            }
            if (select === null || typeof select !== 'object' || Array.isArray(select)) {
                return res.status(400).json({ message: 'Bad Request', data: null });
            }
        } catch (err) {
            return res.status(400).json({ message: 'Bad Request', data: null });
        }

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(404).json({ message: 'Not Found', data: null });
        }

        User.findById(req.params.id).select(select).then(function (user) {
            if (!user) {
                return res.status(404).json({ message: 'Not Found', data: null });
            }

            res.status(200).json({
                message: 'Success',
                data: user
            });
        }).catch(function (err) {
            res.status(500).json({ message: 'Server Error', data: null });
        });
    });

    router.route('/users').post(function (req, res) {
        if (!req.body.name || !req.body.email) {
            return res.status(400).json({
                message: 'Bad Request',
                data: null
            });
        }

        var newUser = new User();
        newUser.name = req.body.name;
        newUser.email = req.body.email;

        newUser.save().then(function (savedUser) {
            res.status(201).json({
                message: 'Created',
                data: savedUser
            });
        }).catch(function (err) {
            if (err.code === 11000) {
                return res.status(400).json({
                    message: 'Bad Request',
                    data: null
                });
            }

            res.status(400).json({
                message: 'Bad Request',
                data: null
            });
        });
    });

    router.route('/users/:id').put(function (req, res) {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(404).json({ message: 'Not Found', data: null });
        }
        if (!req.body.name || !req.body.email) {
            return res.status(400).json({
                message: 'Bad Request',
                data: null
            });
        }
        User.findById(req.params.id).then(function (existingUser) {
            if (!existingUser) {
                return res.status(404).json({ message: 'Not Found', data: null });
            }
            var suppliedUser = {
                name: req.body.name,
                email: req.body.email,
                pendingTasks: req.body.pendingTasks || [],
                dateCreated: existingUser.dateCreated
            };

            return User.findOneAndReplace(
                { _id: req.params.id },
                suppliedUser,
                { new: true, runValidators: true }
            );
        }).then(function (user) {
            if (!user) {
                return res.status(404).json({
                    message: 'Not Found',
                    data: null
                });
            }
            res.status(200).json({
                message: 'Success',
                data: user
            });
        }).catch(function (err) {
            if (err.code === 11000 || err.name === 'ValidationError') {
                return res.status(400).json({ message: 'Bad Request', data: null });
            }
            res.status(500).json({ message: 'Server Error', data: null });
        });
    });

    router.route('/users/:id').delete(function (req, res) {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(404).json({ message: 'Not Found', data: null });
        }
        User.findById(req.params.id).then(function (user) {
            if (!user) {
                return res.status(404).json({ message: 'Not Found', data: null });
            }
            return Task.updateMany({ assignedUser: req.params.id },
                {
                    $set: {
                        assignedUser: '',
                        assignedUserName: 'unassigned'
                    }
                }
            ).then(function () {
                return User.findByIdAndDelete(req.params.id);
            }).then(function () {
                res.status(204).end();
            });
        }).catch(function (err) {
            res.status(500).json({ message: 'Server Error', data: null });
        });
    });

    router.route('/tasks').get(function (req, res) {
        var where;
        try {
            if (req.query.where) {
                where = JSON.parse(req.query.where);
            } else {
                where = {};
            }
            if (where === null || typeof where !== 'object' || Array.isArray(where)) {
                return res.status(400).json({ message: 'Bad Request', data: null });
            }
        } catch (err) {
            return res.status(400).json({ message: 'Bad Request', data: null });
        }

        var sort;
        try {
            if (req.query.sort) {
                sort = JSON.parse(req.query.sort);
            } else {
                sort = {};
            }
            if (sort === null || typeof sort !== 'object' || Array.isArray(sort)) {
                return res.status(400).json({ message: 'Bad Request', data: null });
            }
        } catch (err) {
            return res.status(400).json({ message: 'Bad Request', data: null });
        }

        var select;
        try {
            if (req.query.select) {
                select = JSON.parse(req.query.select);
            } else {
                select = {};
            }
            if (select === null || typeof select !== 'object' || Array.isArray(select)) {
                return res.status(400).json({ message: 'Bad Request', data: null });
            }
        } catch (err) {
            return res.status(400).json({ message: 'Bad Request', data: null });
        }

        var skip = 0;
        if (req.query.skip != undefined) {
            skip = Number(req.query.skip);
            if (!Number.isInteger(skip) || skip < 0) {
                return res.status(400).json({ message: 'Bad Request', data: null });
            }
        }

        var limit = 100;
        if (req.query.limit != undefined) {
            limit = Number(req.query.limit);
            if (!Number.isInteger(limit) || limit < 0) {
                return res.status(400).json({ message: 'Bad Request', data: null });
            }
        }

        var count = false;
        if (req.query.count != undefined) {
            if (req.query.count !== 'true' && req.query.count !== 'false') {
                return res.status(400).json({ message: 'Bad Request', data: null });
            }
            count = req.query.count === 'true';
        }

        var query;
        if (count) {
            query = Task.countDocuments(where);
        } else {
            query = Task.find(where).sort(sort).select(select).skip(skip).limit(limit);
        }

        query.then(function (tasks) {
            res.status(200).json({
                message: 'Success',
                data: tasks
            });
        }).catch(function (err) {
            res.status(500).json({
                message: 'Server Error',
                data: null
            });
        });
    });

    router.route('/tasks/:id').get(function (req, res) {
        var select;
        try {
            if (req.query.select !== undefined) {
                select = JSON.parse(req.query.select);
            } else {
                select = {};
            }
            if (select === null || typeof select !== 'object' || Array.isArray(select)) {
                return res.status(400).json({ message: 'Bad Request', data: null });
            }
        } catch (err) {
            return res.status(400).json({ message: 'Bad Request', data: null });
        }

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(404).json({ message: 'Not Found', data: null });
        }

        Task.findById(req.params.id).select(select).then(function (task) {
            if (!task) {
                return res.status(404).json({
                    message: 'Not Found',
                    data: null
                });
            }

            res.status(200).json({
                message: 'Success',
                data: task
            });
        }).catch(function (err) {
            res.status(500).json({ message: 'Server Error', data: null });
        });
    });

    router.route('/tasks').post(function (req, res) {
        if (!req.body.name || !req.body.deadline) {
            return res.status(400).json({
                message: 'Bad Request',
                data: null
            });
        }
        var newTask = new Task();

        newTask.name = req.body.name;
        newTask.description = req.body.description;
        newTask.deadline = req.body.deadline;
        newTask.completed = req.body.completed;
        newTask.assignedUser = req.body.assignedUser;
        newTask.assignedUserName = req.body.assignedUserName;
        newTask.save().then(function (savedTask) {
            res.status(201).json({
                message: 'Created',
                data: savedTask
            });
        }).catch(function (err) {
            res.status(400).json({
                message: 'Bad Request',
                data: null
            });
        });
    });

    router.route('/tasks/:id').put(function (req, res) {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(404).json({ message: 'Not Found', data: null });
        }
        Task.findById(req.params.id).then(function (existingTask) {
            if (!existingTask) {
                return res.status(404).json({ message: 'Not Found', data: null });
            }
            if (typeof req.body.name !== 'string' || !req.body.name.trim() || !req.body.deadline || isNaN(Date.parse(req.body.deadline))) {
                return res.status(400).json({
                    message: 'Bad Request',
                    data: null
                });
            }
            if (req.body.description !== undefined && typeof req.body.description !== 'string') {
                return res.status(400).json({
                    message: 'Bad Request',
                    data: null
                });
            }
            if (req.body.completed !== undefined && typeof req.body.completed !== 'boolean') {
                return res.status(400).json({
                    message: 'Bad Request',
                    data: null
                });
            }

            var assignedUserId = req.body.assignedUser || '';
            if (typeof assignedUserId !== 'string') {
                return res.status(400).json({
                    message: 'Bad Request',
                    data: null
                });
            }
            if (assignedUserId !== '' &&
                !mongoose.Types.ObjectId.isValid(assignedUserId)) {
                return res.status(400).json({
                    message: 'Bad Request',
                    data: null
                });
            }
            if (assignedUserId !== '') {
                return User.findById(assignedUserId).then(function (newUser) {

                    if (!newUser) {
                        return res.status(404).json({
                            message: 'Not Found',
                            data: null
                        });
                    }
                    if (req.body.assignedUserName !== undefined &&
                        req.body.assignedUserName !== newUser.name) {
                        return res.status(400).json({
                            message: 'Bad Request',
                            data: null
                        });
                    }
                    return updateTaskAndUsers(existingTask, newUser);

                });
            }
            if (req.body.assignedUserName !== undefined &&
                req.body.assignedUserName !== 'unassigned') {
                return res.status(400).json({
                    message: 'Bad Request',
                    data: null
                });
            }

            return updateTaskAndUsers(existingTask, null);

            function updateTaskAndUsers(existingTask, newUser) {

                var suppliedTask = {
                    name: req.body.name,
                    description: req.body.description !== undefined
                        ? req.body.description : '',
                    deadline: new Date(req.body.deadline),
                    completed: req.body.completed !== undefined
                        ? req.body.completed : false,
                    assignedUser: newUser ? newUser._id.toString() : '',
                    assignedUserName: newUser ? newUser.name : 'unassigned',
                    dateCreated: existingTask.dateCreated
                };

                return Task.findOneAndReplace(
                    { _id: req.params.id },
                    suppliedTask,
                    { new: true, runValidators: true }
                ).then(function (updatedTask) {
                    var removeOldAssignment = Promise.resolve();

                    if (existingTask.assignedUser) {
                        removeOldAssignment = User.updateOne(
                            { _id: existingTask.assignedUser },
                            { $pull: { pendingTasks: req.params.id } }
                        );
                    }

                    return removeOldAssignment.then(function () {
                        if (newUser && suppliedTask.completed === false) {
                            return User.updateOne(
                                { _id: newUser._id },
                                { $addToSet: { pendingTasks: req.params.id } }
                            );
                        }

                    }).then(function () {
                        res.status(200).json({
                            message: 'Success',
                            data: updatedTask
                        });
                    });
                });
            }

        }).catch(function (err) {
            console.log(err);
            res.status(500).json({
                message: 'Server Error',
                data: null
            });
        });
    });

    router.route('/tasks/:id').delete(function (req, res) {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(404).json({
                message: 'Not Found',
                data: null
            });
        }

        Task.findById(req.params.id).then(function (task) {
            if (!task) {
                return res.status(404).json({ message: 'Not Found', data: null });
            }
            if (task.assignedUser) {
                return User.updateOne(
                    { _id: task.assignedUser },
                    { $pull: { pendingTasks: req.params.id } }
                ).then(function () {
                    return Task.findByIdAndDelete(req.params.id);
                });
            }
            return Task.findByIdAndDelete(req.params.id);
        }).then(function (deletedTask) {
            if (!deletedTask) {
                return;
            }
            res.status(204).end();
        }).catch(function (err) {
            res.status(500).json({ message: 'Server Error', data: null });
        });
    });

    return router;
};
