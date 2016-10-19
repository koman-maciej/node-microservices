var express = require('express');
var bodyParser = require('body-parser');
var http = require('http');
var uuid = require('node-uuid');
var fs = require('fs');

var api = express();
var CUSTOMER_PREFIX = '[CUSTOMER_SERVICE]';

api.use(bodyParser.json());

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

    fs.readFile(__dirname + '/customers.json', 'utf8', function(e, data) {
        if (e) {
            console.log("%s Internal Server Error: %s", CUSTOMER_PREFIX, e.message);
            response.statusCode = 500;
            response.end();
            return;
        }

        response.set('Content-Type', 'application/json');
        response.end(data);
    });
});

api.get('/customers/:customerId', function(request, response) {
    var customerId = request.params.customerId;
    console.log("%s Handling request: Get customer by id [%s]", CUSTOMER_PREFIX, customerId);

    fs.readFile(__dirname + '/customers.json', 'utf8', function(e, data) {
        if (e) {
            console.log("%s Internal Server Error: %s", CUSTOMER_PREFIX, e.message);
            response.statusCode = 500;
            response.end();
            return;
        }

        data = JSON.parse(data);

        for (var i = 0; i < data.length; i++) {
            if (data[i].id == customerId) {
                response.set('Content-Type', 'application/json');
                response.end(JSON.stringify(data[i]));
                return;
            }
        }

        console.log("%s Customer with id [%s] not found", CUSTOMER_PREFIX, customerId);
        response.statusCode = 404;
        response.end();
    });
});

api.delete('/customers/:customerId', function(request, response) {
    var customerId = request.params.customerId;
    console.log("%s Handling request: Delete customer by id [%s]", CUSTOMER_PREFIX, customerId);

    fs.readFile(__dirname + '/customers.json', 'utf8', function(e, data) {
        if (e) {
            console.log("%s Internal Server Error: %s", CUSTOMER_PREFIX, e.message);
            response.statusCode = 500;
            response.end();
            return;
        }

        data = JSON.parse(data);
        updatedData = [];

        for (var i = 0; i < data.length; i++) {
            if (data[i].id != customerId) {
                updatedData.push(data[i]);
            }
        }

        fs.writeFile(__dirname + '/customers.json', JSON.stringify(updatedData, null, 2), function(e) {
            if (e) {
                console.log("%s Internal Server Error: %s", CUSTOMER_PREFIX, e.message);
                response.statusCode = 500;
                response.end();
                return;
            }

            console.log("%s Customer with id [%s] is deleted", CUSTOMER_PREFIX, customerId);
        });

        response.end();
    });
});

api.post('/customer', function(request, response) {
    var newCustomer = request.body;
    console.log("%s Handling request: Create a new customer", CUSTOMER_PREFIX);

    fs.readFile(__dirname + '/customers.json', 'utf8', function(e, data) {
        if (e) {
            console.log("%s Internal Server Error: %s", CUSTOMER_PREFIX, e.message);
            response.statusCode = 500;
            response.end();
            return;
        }

        newCustomer.id = uuid.v1();
        data = JSON.parse(data);
        data[data.length] = newCustomer;

        fs.writeFile(__dirname + '/customers.json', JSON.stringify(data, null, 2), function(e) {
            if (e) {
                console.log("%s Internal Server Error: %s", CUSTOMER_PREFIX, e.message);
                response.statusCode = 500;
                response.end();
                return;
            }

            console.log("%s Customer with id [%s] is saved", CUSTOMER_PREFIX, newCustomer.id);
        });

        response.set('Content-Type', 'application/json');
        response.end(JSON.stringify(newCustomer));
    });
});

api.put('/customers/:customerId/hotels/:hotelId', function(request, response) {
    var customerId = request.params.customerId;
    var hotelId = request.params.hotelId;
    console.log("%s Handling request: Assign customer with id [%s] to the hotel [%s]", CUSTOMER_PREFIX, customerId, hotelId);

    var options = {
        host: 'localhost',
        port: 8081,
        path: '/hotels/' + hotelId,
        method: 'GET'
    };

    fs.readFile(__dirname + '/customers.json', 'utf8', function(e, data) {
        if (e) {
            console.log("%s Internal Server Error: %s", CUSTOMER_PREFIX, e.message);
            response.statusCode = 500;
            response.end();
            return;
        }

        data = JSON.parse(data);
        var idx = -1;
        for (var i = 0; i < data.length; i++) {
            if (data[i].id == customerId) {
                idx = i;
                break;
            }
        }

        if (idx < 0) {
            console.log("%s Customer with id [%s] not found", CUSTOMER_PREFIX, customerId);
            response.statusCode = 404;
            response.end();
            return;
        } else {
            var req = http.request(options, function(res) {
                res.on('data', function() { /* do nothing */ });

                if (res.statusCode == 200) {
                    data[idx].hotelId = hotelId;
                    fs.writeFile(__dirname + '/customers.json', JSON.stringify(data, null, 2), function(e) {
                        if (e) {
                            console.log("%s Internal Server Error: %s", CUSTOMER_PREFIX, e.message);
                            response.statusCode = 500;
                            response.end();
                            return;
                        }

                        console.log("%s Customer with id [%s] is updated", CUSTOMER_PREFIX, customerId);
                        response.set('Content-Type', 'application/json');
                        response.end(JSON.stringify(data[idx]));
                    });
                } else {
                    console.log("%s Hotel with id [%s] not found", CUSTOMER_PREFIX, hotelId);
                    response.statusCode = 404;
                    response.end();
                }
            });

            req.on('error', function(e) {
                console.log("%s Problem with request: %s", CUSTOMER_PREFIX, e.message);
                response.statusCode = 500;
                response.end();
            });

            req.end();
        }
    });
});

var server = api.listen(8080, function() {
    var host = server.address().address;
    var port = server.address().port;

    console.log("Starting %s listening at http://%s:%s", CUSTOMER_PREFIX, host, port);
});
