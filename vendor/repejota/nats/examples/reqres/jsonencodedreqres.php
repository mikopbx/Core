<?php

use Nats\ConnectionOptions;
use Nats\EncodedConnection;
use Nats\Encoders\JSONEncoder;

require_once __DIR__.'/../../vendor/autoload.php';

$encoder = new JSONEncoder();
$options = new ConnectionOptions();
$client  = new EncodedConnection($options, $encoder);
$client->connect();

// Request Response.
// Responding to requests.
$sid = $client->subscribe(
    'sayhello',
    function ($message) {
        $message->reply('Reply: Hello, '.$message->getBody()[1].' !!!');
    }
);

// Request.
$client->request(
    'sayhello',
    [
     'Marty',
     'McFly',
    ],
    function ($message) {
        echo $message->getBody();
    }
);
