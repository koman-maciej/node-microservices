var bodyParser = require('body-parser');
var cors = require('cors');
var express = require('express');
var mongo = require('mongodb');
var monk = require('monk');
var path = require('path');
var swaggerJsdoc = require('swagger-jsdoc');

var db = monk('localhost:27017/hotel');
var api = express();
var HOTEL_PREFIX = '[HOTEL_SERVICE]';
var HOTELS_COLLECTION = 'hotels';

api.use('/api-docs', express.static(path.join(__dirname, '../commons/swagger-ui')));
api.use(bodyParser.json());
api.use(cors());
api.use(function(request, response, next) {
    request.db = db;
    next();
});

/**
 * @swagger
 * definition:
 *   HotelRequest:
 *     required:
 *       - name
 *     properties:
 *       name:
 *         type: string
 *   HotelResponse:
 *     required:
 *       - _id
 *       - name
 *     properties:
 *       _id:
 *         type: string
 *       name:
 *         type: string
 */

/**
 * @swagger
 * /hotels:
 *   get:
 *     tags:
 *       - Hotel management
 *     description: Gets all hotels
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: An array of hotels
 *         schema:
 *           type: array
 *           items:
 *             $ref: '#/definitions/HotelResponse'
 */
api.get('/hotels', function(request, response) {
    console.log("%s Handling request: Get all hotels", HOTEL_PREFIX);

    // https://github.com/Automattic/monk/issues/24
    if (request.db._state === 'closed') {
        console.log("%s Internal Server Error: %s", HOTEL_PREFIX, 'Cannot connect with database...');
        response.statusCode = 500;
        response.end();
        return;
    }
    var collection = request.db.get(HOTELS_COLLECTION);

    collection.find({}, function(err, result) {
        if (err) {
            console.log("%s Internal Server Error: %s", HOTEL_PREFIX, err.message);
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
 * /hotels/{hotelId}:
 *   get:
 *     tags:
 *       - Hotel management
 *     description: Gets a single hotel for the given hotelId
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: hotelId
 *         description: hotel's id
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: A single hotel
 *         schema:
 *           $ref: '#/definitions/HotelResponse'
 *       404:
 *         description: The hotel was not found
 */
api.get('/hotels/:hotelId', function(request, response) {
    var hotelId = request.params.hotelId;
    console.log("%s Handling request: Get hotel by id [%s]", HOTEL_PREFIX, hotelId);

    // https://github.com/Automattic/monk/issues/24
    if (request.db._state === 'closed') {
        console.log("%s Internal Server Error: %s", HOTEL_PREFIX, 'Cannot connect with database...');
        response.statusCode = 500;
        response.end();
        return;
    }

    // http://stackoverflow.com/questions/26453507/argument-passed-in-must-be-a-single-string-of-12-bytes
    try {
        new mongo.ObjectID.createFromHexString(hotelId);
    } catch (e) {
        console.log("%s Hotel with id [%s] not found", HOTEL_PREFIX, hotelId);
        response.statusCode = 404;
        response.end();
        return;
    }

    var collection = request.db.get(HOTELS_COLLECTION);

    collection.findOne({
        _id: hotelId
    }, function(err, result) {
        if (err) {
            console.log("%s Internal Server Error: %s", HOTEL_PREFIX, err.message);
            response.statusCode = 500;
            response.end();
            return;
        }

        if (result !== null) {
            response.set('Content-Type', 'application/json');
            response.end(JSON.stringify(result));
        } else {
            console.log("%s Hotel with id [%s] not found", HOTEL_PREFIX, hotelId);
            response.statusCode = 404;
            response.end();
        }
    });
});

/**
 * @swagger
 * /hotels:
 *   post:
 *     tags:
 *       - Hotel management
 *     description: Creates a new hotel
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: hotel
 *         description: hotel object representation
 *         in: body
 *         required: true
 *         schema:
 *           $ref: '#/definitions/HotelRequest'
 *     responses:
 *       200:
 *         description: Successfully created
 *         schema:
 *           $ref: '#/definitions/HotelResponse'
 */
api.post('/hotels', function(request, response) {
    console.log("%s Handling request: Create a new hotel", HOTEL_PREFIX);
    var newHotel = request.body;

    // https://github.com/Automattic/monk/issues/24
    if (request.db._state === 'closed') {
        console.log("%s Internal Server Error: %s", HOTEL_PREFIX, 'Cannot connect with database...');
        response.statusCode = 500;
        response.end();
        return;
    }
    var collection = request.db.get(HOTELS_COLLECTION);

    collection.insert(newHotel, function(err, result) {
        if (err) {
            console.log("%s Internal Server Error: %s", HOTEL_PREFIX, err.message);
            response.statusCode = 500;
            response.end();
            return;
        }

        console.log("%s Hotel with id [%s] is saved", HOTEL_PREFIX, result._id);
        response.set('Content-Type', 'application/json');
        response.end(JSON.stringify(result));
    });
});

var server = api.listen(8081, function() {
    var host = server.address().address;
    var port = server.address().port;

    console.log("Starting %s listening at http://%s:%s", HOTEL_PREFIX, host, port);
});

var swaggerDefinition = {
    info: {
        title: 'Hotel Service API',
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