<?php
require_once __DIR__.'/../../vendor/autoload.php';

$client = new \Nats\Connection();
$client->connect();

// Simple Publisher.
$client->publish('foo', 'bar');
$client->close();
