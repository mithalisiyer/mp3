var User = require('../models/user');
var mongoose = require('mongoose');
var Task = require('../models/task');

module.exports = function (router) {
    router.route('/users').get(function (req, res) {
        User.find().then(function (users) {
            res.status(200).json({
                message: 'Success',
                data: users
            });
        }).catch(function (err) {
            res.status(500).json({ message: 'Server Error', data: null });
        });
    });

    router.route('/users/:id').get(function (req, res) {
        User.findById(req.params.id).then(function (user) {
            if (!user) {
                return res.status(404).json({ message: 'Not found', data: null });
            }

            res.status(200).json({
                message: 'Success',
                data: user
            });
        }).catch(function (err) {
            res.status(404).json({ message: 'Not Found', data: null });
        });
    });

    router.route('/users').post(function (req, res) {
        if (!req.body.name || !req.body.email) {
            return res.status(400).json({
                message: 'Name and email are required',
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
                    message: 'Email already exists',
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
                message: 'Name and email are required',
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
                        assignedUserName: 'unassiged'
                    }
                }
            ).then(function () {
                return User.findByIdAndDelete(req.params.id);
            });
        }).then(function (deletedUser) {
            if (!deletedUser) {
                return res.status(404).json({ message: 'Not Found', data: null });
            }
            res.status(204).end();
        }).catch(function (err) {
            res.status(500).json({ message: 'Server Error', data: null });
        });
    });

    return router;
};
