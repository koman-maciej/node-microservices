var express = require('express');
var bodyParser = require('body-parser');
var http = require('http');
var mongo = require('mongodb');
var monk = require('monk');

var db = monk('localhost:27017/customer');
var api = express();
var CUSTOMER_PREFIX = '[CUSTOMER_SERVICE]';
var CUSTOMERS_COLLECTION = 'customers';

api.use(bodyParser.json());
api.use(function(request, response, next) {
    request.db = db;
    next();
});

api.get('/', function(request, response) {
    console.log("%s Redirecting on [/index.html]...", CUSTOMER_PREFIX);

    response.redirect('/index.html');
    response.end();
});

api.get('/index.html', function(request, response) {
    console.log("%s Handling request: Get index page", CUSTOMER_PREFIX);

    response.send('<h1>Welcome in our Customer Service!!!</h1>');
    response.end();
});

api.get('/customers', function(request, response) {
    console.log("%s Handling request: Get all customers", CUSTOMER_PREFIX);

    // https://github.com/Automattic/monk/issues/24
    if (request.db._state === 'closed') {
        console.log("%s Internal Server Error: %s", CUSTOMER_PREFIX, 'Cannot connect with database...');
        response.statusCode = 500;
        response.end();
        return;
    }
    var collection = request.db.get(CUSTOMERS_COLLECTION);

    collection.find({}, function(err, result) {
        if (err) {
            console.log("%s Internal Server Error: %s", CUSTOMER_PREFIX, err.message);
            response.statusCode = 500;
            response.end();
            return;
        }

        response.set('Content-Type', 'application/json');
        response.end(JSON.stringify(result));
    });
});

api.get('/customers/:customerId', function(request, response) {
    //FIXME: http://stackoverflow.com/questions/26453507/argument-passed-in-must-be-a-single-string-of-12-bytes
    var customerId = request.params.customerId;
    console.log("%s Handling request: Get customer by id [%s]", CUSTOMER_PREFIX, customerId);

    // https://github.com/Automattic/monk/issues/24
    if (request.db._state === 'closed') {
        console.log("%s Internal Server Error: %s", CUSTOMER_PREFIX, 'Cannot connect with database...');
        response.statusCode = 500;
        response.end();
        return;
    }
    var collection = request.db.get(CUSTOMERS_COLLECTION);

    collection.findOne({
        _id: customerId
    }, function(err, result) {
        if (err) {
            console.log("%s Internal Server Error: %s", CUSTOMER_PREFIX, err.message);
            response.statusCode = 500;
            response.end();
            return;
        }

        if (result !== null) {
            response.set('Content-Type', 'application/json');
            response.end(JSON.stringify(result));
        } else {
            console.log("%s Customer with id [%s] not found", CUSTOMER_PREFIX, customerId);
            response.statusCode = 404;
            response.end();
        }
    });
});

api.delete('/customers/:customerId', function(request, response) {
    //FIXME: http://stackoverflow.com/questions/26453507/argument-passed-in-must-be-a-single-string-of-12-bytes
    var customerId = request.params.customerId;
    console.log("%s Handling request: Delete customer by id [%s]", CUSTOMER_PREFIX, customerId);

    // https://github.com/Automattic/monk/issues/24
    if (request.db._state === 'closed') {
        console.log("%s Internal Server Error: %s", CUSTOMER_PREFIX, 'Cannot connect with database...');
        response.statusCode = 500;
        response.end();
        return;
    }
    var collection = request.db.get(CUSTOMERS_COLLECTION);

    collection.findOneAndDelete({
        _id: customerId
    }, function(err, result) {
        if (err) {
            console.log("%s Internal Server Error: %s", CUSTOMER_PREFIX, err.message);
            response.statusCode = 500;
            response.end();
            return;
        }

        console.log("%s Customer with id [%s] is deleted", CUSTOMER_PREFIX, customerId);
        response.end();
    });
});

api.post('/customers', function(request, response) {
    console.log("%s Handling request: Create a new customer", CUSTOMER_PREFIX);
    var newCustomer = request.body;

    // https://github.com/Automattic/monk/issues/24
    if (request.db._state === 'closed') {
        console.log("%s Internal Server Error: %s", CUSTOMER_PREFIX, 'Cannot connect with database...');
        response.statusCode = 500;
        response.end();
        return;
    }
    var collection = request.db.get(CUSTOMERS_COLLECTION);

    collection.insert(newCustomer, function(err, result) {
        if (err) {
            console.log("%s Internal Server Error: %s", CUSTOMER_PREFIX, err.message);
            response.statusCode = 500;
            response.end();
            return;
        }

        console.log("%s Customer with id [%s] is saved", CUSTOMER_PREFIX, result._id);
        response.set('Content-Type', 'application/json');
        response.end(JSON.stringify(result));
    });
});

api.put('/customers/:customerId/hotels/:hotelId', function(request, response) {
    //FIXME: http://stackoverflow.com/questions/26453507/argument-passed-in-must-be-a-single-string-of-12-bytes
    var customerId = request.params.customerId;
    var hotelId = request.params.hotelId;
    console.log("%s Handling request: Assign customer with id [%s] to the hotel [%s]", CUSTOMER_PREFIX, customerId, hotelId);

    var options = {
        host: 'localhost',
        port: 8081,
        path: '/hotels/' + hotelId,
        method: 'GET'
    };

    // https://github.com/Automattic/monk/issues/24
    if (request.db._state === 'closed') {
        console.log("%s Internal Server Error: %s", CUSTOMER_PREFIX, 'Cannot connect with database...');
        response.statusCode = 500;
        response.end();
        return;
    }
    var collection = request.db.get(CUSTOMERS_COLLECTION);

    collection.findOne({
        _id: customerId
    }, function(err, result) {
        if (err) {
            console.log("%s Internal Server Error: %s", CUSTOMER_PREFIX, err.message);
            response.statusCode = 500;
            response.end();
            return;
        }

        if (result !== null) {

            var req = http.request(options, function(res) {
                res.on('data', function() { /* do nothing */ });

                if (res.statusCode == 200) {

                    collection.findOneAndUpdate({
                        _id: customerId
                    }, {
                        $set: {
                            'hotelId': hotelId
                        }
                    }, function(err, result) {
                        if (err) {
                            console.log("%s Internal Server Error: %s", CUSTOMER_PREFIX, err.message);
                            response.statusCode = 500;
                            response.end();
                            return;
                        }

                        console.log("%s Customer with id [%s] is updated", CUSTOMER_PREFIX, customerId);
                        response.set('Content-Type', 'application/json');
                        response.end(JSON.stringify(result));
                    });
                } else {
                    console.log("%s Hotel with id [%s] not found", CUSTOMER_PREFIX, hotelId);
                    response.statusCode = 404;
                    response.end();
                }
            });

            req.on('error', function(err) {
                console.log("%s Problem with request: %s", CUSTOMER_PREFIX, err.message);
                response.statusCode = 500;
                response.end();
            });

            req.end();

        } else {
            console.log("%s Customer with id [%s] not found", CUSTOMER_PREFIX, customerId);
            response.statusCode = 404;
            response.end();
        }
    });
});

var server = api.listen(8080, function() {
    var host = server.address().address;
    var port = server.address().port;

    console.log("Starting %s listening at http://%s:%s", CUSTOMER_PREFIX, host, port);
});