var bodyParser = require('body-parser');
var cors = require('cors');
var express = require('express');
var http = require('http');
var mongo = require('mongodb');
var monk = require('monk');
var path = require('path');
var swaggerJsdoc = require('swagger-jsdoc');

var db = monk('localhost:27017/customer');
var api = express();
var CUSTOMER_PREFIX = '[CUSTOMER_SERVICE]';
var CUSTOMERS_COLLECTION = 'customers';

api.use('/api-docs', express.static(path.join(__dirname, '../commons/swagger-ui')))
api.use(bodyParser.json());
api.use(cors());
api.use(function(request, response, next) {
    request.db = db;
    next();
});

/**
 * @swagger
 * definition:
 *   CustomerRequest:
 *     required:
 *       - firstname
 *       - lastname
 *     properties:
 *       firstname:
 *         type: string
 *       lastname:
 *         type: string
 *   CustomerResponse:
 *     required:
 *       - _id
 *       - firstname
 *       - lastname
 *     properties:
 *       _id:
 *         type: string
 *       firstname:
 *         type: string
 *       lastname:
 *         type: string
 *       hotelId:
 *         type: string
 */

/**
 * @swagger
 * /customers:
 *   get:
 *     tags:
 *       - Customer management
 *     description: Gets all customers
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: An array of customers
 *         schema:
 *           type: array
 *           items:
 *             $ref: '#/definitions/CustomerResponse'
 */
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

/**
 * @swagger
 * /customers/{customerId}:
 *   get:
 *     tags:
 *       - Customer management
 *     description: Gets a single customer for the given customerId
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: customerId
 *         description: customer's id
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: A single customer
 *         schema:
 *           $ref: '#/definitions/CustomerResponse'
 *       404:
 *         description: The customer was not found
 */
api.get('/customers/:customerId', function(request, response) {
    var customerId = request.params.customerId;
    console.log("%s Handling request: Get customer by id [%s]", CUSTOMER_PREFIX, customerId);

    // https://github.com/Automattic/monk/issues/24
    if (request.db._state === 'closed') {
        console.log("%s Internal Server Error: %s", CUSTOMER_PREFIX, 'Cannot connect with database...');
        response.statusCode = 500;
        response.end();
        return;
    }

    // http://stackoverflow.com/questions/26453507/argument-passed-in-must-be-a-single-string-of-12-bytes
    try {
        new mongo.ObjectID.createFromHexString(customerId);
    } catch (e) {
        console.log("%s Customer with id [%s] not found", CUSTOMER_PREFIX, customerId);
        response.statusCode = 404;
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

/**
 * @swagger
 * /customers/{customerId}:
 *   delete:
 *     tags:
 *       - Customer management
 *     description: Removes a single customer for the given customerId
 *     parameters:
 *       - name: customerId
 *         description: customer's id
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: The customer was removed
 */
api.delete('/customers/:customerId', function(request, response) {
    var customerId = request.params.customerId;
    console.log("%s Handling request: Delete customer by id [%s]", CUSTOMER_PREFIX, customerId);

    // https://github.com/Automattic/monk/issues/24
    if (request.db._state === 'closed') {
        console.log("%s Internal Server Error: %s", CUSTOMER_PREFIX, 'Cannot connect with database...');
        response.statusCode = 500;
        response.end();
        return;
    }

    // http://stackoverflow.com/questions/26453507/argument-passed-in-must-be-a-single-string-of-12-bytes
    try {
        new mongo.ObjectID.createFromHexString(customerId);
    } catch (e) {
        console.log("%s Customer with id [%s] is deleted", CUSTOMER_PREFIX, customerId);
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

/**
 * @swagger
 * /customers:
 *   post:
 *     tags:
 *       - Customer management
 *     description: Creates a new customer
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: customer
 *         description: customer object representation
 *         in: body
 *         required: true
 *         schema:
 *           $ref: '#/definitions/CustomerRequest'
 *     responses:
 *       200:
 *         description: Successfully created
 *         schema:
 *           $ref: '#/definitions/CustomerResponse'
 */
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

/**
 * @swagger
 * /customers/{customerId}/hotels/{hotelId}:
 *   put:
 *     tags:
 *       - Customer management
 *     description: Assigns a given hotel the the given customer
 *     parameters:
 *       - name: customerId
 *         description: customer's id
 *         in: path
 *         required: true
 *         type: string
 *       - name: hotelId
 *         description: hotel's id
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Successfully assigned
 *         schema:
 *           $ref: '#/definitions/CustomerResponse'
 *       404:
 *         description: The customer or hotel was not found
 */
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

    // https://github.com/Automattic/monk/issues/24
    if (request.db._state === 'closed') {
        console.log("%s Internal Server Error: %s", CUSTOMER_PREFIX, 'Cannot connect with database...');
        response.statusCode = 500;
        response.end();
        return;
    }

    // http://stackoverflow.com/questions/26453507/argument-passed-in-must-be-a-single-string-of-12-bytes
    try {
        new mongo.ObjectID.createFromHexString(customerId);
    } catch (e) {
        console.log("%s Customer with id [%s] not found", CUSTOMER_PREFIX, customerId);
        response.statusCode = 404;
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
                            hotelId: hotelId
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

var swaggerDefinition = {
  info: {
    title: 'Customer Service API',
    version: '1.0.0',
    description: 'RESTful API with Swagger'
  },
  host: server.address().address + ':' + server.address().port,
  basePath: '/'
};

var options = {
  swaggerDefinition: swaggerDefinition,
  apis: [path.join(__dirname, './*.js')]
};

var swaggerSpec = swaggerJsdoc(options);

api.get('/swagger.json', function(request, response) {
  response.set('Content-Type', 'application/json');
  response.send(swaggerSpec);
});