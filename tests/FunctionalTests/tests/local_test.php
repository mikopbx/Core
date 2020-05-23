<?php
require 'vendor/autoload.php';

class LocalTest extends BrowserStackTest {

    public function testLocal() {
      self::$driver->get("http://bs-local.com:45691/check");
      $this->assertContains('Up and running', self::$driver->getPageSource(), '', true);
    }

}
