var express = require('express');
var bodyParser = require('body-parser');
var mongo = require('mongodb');
var monk = require('monk');

//FIXME: set timeout on mongodb connection (when mongo instance is down)
var db = monk('localhost:27017/hotel');
var api = express();
var HOTEL_PREFIX = '[HOTEL_SERVICE]';
var HOTELS_COLLECTION = 'hotels';

api.use(bodyParser.json());
api.use(function(request, response, next) {
    request.db = db;
    next();
});

api.get('/hotels', function(request, response) {
    console.log("%s Handling request: Get all hotels", HOTEL_PREFIX);

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

api.get('/hotels/:hotelId', function(request, response) {
    //FIXME: http://stackoverflow.com/questions/26453507/argument-passed-in-must-be-a-single-string-of-12-bytes
    var hotelId = request.params.hotelId;
    console.log("%s Handling request: Get hotel by id [%s]", HOTEL_PREFIX, hotelId);

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

api.post('/hotels', function(request, response) {
    console.log("%s Handling request: Create a new hotel", HOTEL_PREFIX);

    var newHotel = request.body;
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