<?php
require_once __DIR__.'/../../vendor/autoload.php';

$encoder = new \Nats\Encoders\JSONEncoder();
$options = new \Nats\ConnectionOptions();
$client  = new \Nats\EncodedConnection($options, $encoder);
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
