var express = require('express');

var api = express();
var HOTEL_PREFIX = '[HOTEL_SERVICE]'
var hotels = ['5', '6', '7'];

api.get('/hotels/:hotelId', function (request, response) {
    var hotelId = request.params.hotelId;
    console.log("%s Handling request: Get hotel by id [%s]", HOTEL_PREFIX, hotelId);

    for(var i=0; i<hotels.length; i++) {
        if(hotels[i] == hotelId) {
            response.statusCode = 200;
            response.end();
            return;
        }
    }
    console.log("%s Hotel with id [%s] not found", HOTEL_PREFIX, hotelId);
    response.statusCode = 404;
    response.end();
});

var server = api.listen(8081, function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log("Starting %s listening at http://%s:%s", HOTEL_PREFIX, host, port);
});
