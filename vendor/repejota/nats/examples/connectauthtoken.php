<?php
require_once __DIR__.'/../vendor/autoload.php';

$connectionOptions = new \Nats\ConnectionOptions();
$connectionOptions->setHost('localhost')->setPort(4222)->setToken('supersecrettoken');
$c = new Nats\Connection($connectionOptions);
$c->connect();
$c->close();
