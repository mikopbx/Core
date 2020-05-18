<?php
require_once __DIR__.'/../../vendor/autoload.php';

$client = new \Nats\Connection();
$client->connect();

// Request Response.
// Responding to requests.
$sid = $client->subscribe(
    'sayhello',
    function ($message) {
        $message->reply('Reply: Hello, '.$message->getBody().' !!!');
    }
);

// Request.
$client->request(
    'sayhello',
    'Marty McFly',
    function ($message) {
        echo $message->getBody();
    }
);
