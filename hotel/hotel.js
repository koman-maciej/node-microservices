var express = require('express');
var bodyParser = require('body-parser');
var uuid = require('node-uuid');
var fs = require('fs');

var api = express();
var HOTEL_PREFIX = '[HOTEL_SERVICE]';

api.use(bodyParser.json());

api.get('/hotels', function(request, response) {
    console.log("%s Handling request: Get all hotels", HOTEL_PREFIX);

    fs.readFile(__dirname + '/hotels.json', 'utf8', function(e, data) {
        if (e) {
            console.log("%s Internal Server Error: %s", HOTEL_PREFIX, e.message);
            response.statusCode = 500;
            response.end();
            return;
        }

        response.set('Content-Type', 'application/json');
        response.end(data);
    });
});

api.get('/hotels/:hotelId', function(request, response) {
    var hotelId = request.params.hotelId;
    console.log("%s Handling request: Get hotel by id [%s]", HOTEL_PREFIX, hotelId);

    fs.readFile(__dirname + '/hotels.json', 'utf8', function(e, data) {
        if (e) {
            console.log("%s Internal Server Error: %s", HOTEL_PREFIX, e.message);
            response.statusCode = 500;
            response.end();
            return;
        }

        data = JSON.parse(data);

        for (var i = 0; i < data.length; i++) {
            if (data[i].id == hotelId) {
                response.set('Content-Type', 'application/json');
                response.end(JSON.stringify(data[i]));
                return;
            }
        }

        console.log("%s Hotel with id [%s] not found", HOTEL_PREFIX, hotelId);
        response.statusCode = 404;
        response.end();
    });
});

api.post('/hotel', function(request, response) {
    var newHotel = request.body;
    console.log("%s Handling request: Create a new hotel", HOTEL_PREFIX);

    fs.readFile(__dirname + '/hotels.json', 'utf8', function(e, data) {
        if (e) {
            console.log("%s Internal Server Error: %s", HOTEL_PREFIX, e.message);
            response.statusCode = 500;
            response.end();
            return;
        }

        newHotel.id = uuid.v1();
        data = JSON.parse(data);
        data[data.length] = newHotel;

        fs.writeFile(__dirname + '/hotels.json', JSON.stringify(data, null, 2), function(e) {
            if (e) {
                console.log("%s Internal Server Error: %s", HOTEL_PREFIX, e.message);
                response.statusCode = 500;
                response.end();
                return;
            }

            console.log("%s Hotel with id [%s] is saved", HOTEL_PREFIX, newHotel.id);
        });

        response.set('Content-Type', 'application/json');
        response.end(JSON.stringify(newHotel));
    });
});

var server = api.listen(8081, function() {
    var host = server.address().address;
    var port = server.address().port;

    console.log("Starting %s listening at http://%s:%s", HOTEL_PREFIX, host, port);
});
