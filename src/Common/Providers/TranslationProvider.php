<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

declare(strict_types=1);

namespace MikoPBX\Common\Providers;


use Phalcon\Di\Di;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use Phalcon\Translate\InterpolatorFactory;
use Phalcon\Translate\TranslateFactory;

/**
 * Localization service.
 * @method string _(string $translateKey, array $placeholders = [])
 *
 * @package MikoPBX\Common\Providers
 */
class TranslationProvider implements ServiceProviderInterface
{
    public const string SERVICE_NAME = 'translation';

    /**
     * Register the translation service provider.
     *
     * @param DiInterface $di The DI container.
     */
    public function register(DiInterface $di): void
    {
        $di->setShared(
            self::SERVICE_NAME,
            function () use ($di) {
                $interpolator = new InterpolatorFactory();
                $factory      = new TranslateFactory($interpolator);

                // Return a translation object
                return $factory->newInstance(
                    'array',
                    [
                        'content' => $di->getShared(MessagesProvider::SERVICE_NAME),
                    ]
                );
            }
        );
    }

    /**
     * Static method to translate a string using the default DI container
     * This method provides a cleaner alternative to Util::translate without the Scanner issues
     * 
     * @param string $translateKey The translation key to look up
     * @param array $placeholders Array of placeholder values for interpolation
     * @return string The translated text with placeholders replaced
     */
    public static function translate(string $translateKey, array $placeholders = []): string
    {
        $di = Di::getDefault();
        if ($di === null) {
            // Fallback if DI is not available
            return $translateKey;
        }

        try {
            $translation = $di->get(self::SERVICE_NAME);
            return $translation->_($translateKey, $placeholders);
        } catch (\Exception $e) {
            // Fallback on any error
            return $translateKey;
        }
    }
}