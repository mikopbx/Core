<?php

/**
 * This file is part of the Phalcon Incubator Test.
 *
 * (c) Phalcon Team <team@phalcon.io>
 *
 * For the full copyright and license information, please view
 * the LICENSE file that was distributed with this source code.
 */

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Incubator\Traits;

use Phalcon\Config\Config;
use Phalcon\Di\Di;
use Phalcon\Di\DiInterface;
use Phalcon\Html\Escaper;
use Phalcon\Mvc\Url;

trait UnitTestCase
{
    use ResultSet;

    /**
     * Holds the configuration variables and other stuff
     * I can use the DI container but for tests like the Translate
     * we do not need the overhead
     *
     * @var Config|null
     */
    protected $config;

    /**
     * @var DiInterface
     */
    protected $di;

    /**
     * This method is called before a test is executed.
     */
    protected function setUpPhalcon()
    {
        $this->checkExtension('phalcon');

        // Reset the DI container
        Di::reset();

        // Instantiate a new DI container
        $di = new Di();

        // Set the URL
        $di->set(
            'url',
            function () {
                $url = new Url();
                $url->setBaseUri('/');

                return $url;
            }
        );

        $di->set(
            'escaper',
            function () {
                return new Escaper();
            }
        );

        $this->di = $di;
    }

    protected function tearDownPhalcon()
    {
        Di::reset();
    }

    /**
     * Checks if a particular extension is loaded and if not it marks
     * the tests skipped
     *
     * @param mixed $extension
     */
    public function checkExtension($extension)
    {
        $message = function ($ext) {
            sprintf('Warning: %s extension is not loaded', $ext);
        };

        if (is_array($extension)) {
            foreach ($extension as $ext) {
                if (!extension_loaded($ext)) {
                    $this->markTestSkipped($message($ext));
                    break;
                }
            }
        } elseif (!extension_loaded($extension)) {
            $this->markTestSkipped($message($extension));
        }
    }

    /**
     * Returns a unique file name
     *
     * @param  string $prefix A prefix for the file
     * @param  string $suffix A suffix for the file
     * @return string
     */
    protected function getFileName($prefix = '', $suffix = 'log')
    {
        $prefix = ($prefix) ? $prefix . '_' : '';
        $suffix = ($suffix) ? $suffix : 'log';

        return uniqid($prefix, true) . '.' . $suffix;
    }

    /**
     * Removes a file from the system
     *
     * @param string $path
     * @param string $fileName
     */
    protected function cleanFile($path, $fileName)
    {
        $file = (substr($path, -1, 1) != "/") ? ($path . '/') : $path;
        $file .= $fileName;

        $actual = file_exists($file);

        if ($actual) {
            unlink($file);
        }
    }

    /**
     * Sets the Config object.
     *
     * @param Config $config
     * @return $this
     */
    public function setConfig(Config $config)
    {
        $this->config = $config;

        return $this;
    }

    /**
     * Returns the Config object if any.
     *
     * @return null|Config
     */
    public function getConfig()
    {
        if (!$this->config instanceof Config && $this->getDI()->has('config')) {
            return $this->getDI()->get('config');
        }

        return $this->config;
    }

    /**
     * Sets the Dependency Injector.
     *
     * @see    Injectable::setDI
     * @param  DiInterface $di
     * @return void
     */
    public function setDI(DiInterface $di): void
    {
        $this->di = $di;
    }

    /**
     * Returns the internal Dependency Injector.
     *
     * @see    Injectable::getDI
     * @return DiInterface
     */
    public function getDI(): DiInterface
    {
        if (!$this->di instanceof DiInterface) {
            return Di::getDefault();
        }

        return $this->di;
    }
}
