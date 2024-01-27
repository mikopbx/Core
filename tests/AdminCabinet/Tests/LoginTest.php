<?php
namespace MikoPBX\Tests\AdminCabinet\Tests;

use Facebook\WebDriver\WebDriverBy;
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;

class LoginTest extends MikoPBXTestsBase {
    /**
     * Perform the login operation.
     *
     * @dataProvider loginDataProvider
     *
     * @param array $params The login parameters.
     */
    public function testLogin(array $params): void
    {
        self::$driver->get($GLOBALS['SERVER_PBX']);
        $this->changeInputField('login', $params['login']);
        $this->changeInputField('password', $params['password']);

        $xpath = '//form[@id="login-form"]//ancestor::div[@id="submitbutton"]';

        $button_Submit = self::$driver->findElement(WebDriverBy::xpath($xpath));
        $button_Submit->click();
        $this->waitForAjax();

        $xpath = '//div[contains(@class,"error") and contains(@class,"message")]';
        $errorMessages = self::$driver->findElements(WebDriverBy::xpath($xpath));
        if (count($errorMessages) > 0) {
            foreach ($errorMessages as $errorMessage) {
                if ($errorMessage->isDisplayed()) {
                    $this->changeInputField('password', $params['password2']);
                    $xpath = '//form[@id="login-form"]//ancestor::div[@id="submitbutton"]';
                    $button_Submit = self::$driver->findElement(WebDriverBy::xpath($xpath));
                    $button_Submit->click();
                }
            }
        }

        self::$driver->wait(10, 500)->until(function ($driver) {
            $elements = $driver->findElements(WebDriverBy::id("top-menu-search"));
            return count($elements) > 0;
        });

        $this->assertElementNotFound(WebDriverBy::xpath("//input[@type = 'text' and @id = 'login' and @name = 'login']"));

    }

    /**
     * Provide login data for testing.
     *
     * @return array
     */
    public function loginDataProvider(): array
    {
        $params = [];
        $params[] = [
            [
                'login' => 'admin',
                'password' => '123456789MikoPBX#1',
                'password2' => 'admin',
            ],
        ];

        return $params;
    }
}
