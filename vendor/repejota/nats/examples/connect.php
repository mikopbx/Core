<?php
require_once __DIR__.'/../vendor/autoload.php';

$c = new Nats\Connection();
$c->connect();
$c->close();
