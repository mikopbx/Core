<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Common\Providers;

use MikoPBX\Common\Providers\LanguageProvider;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Tests\Unit\AbstractUnitTest;
use Phalcon\Di\Di;

/**
 * #1207: WorkerApiCommands switches the translation services to the caller's JWT
 * language for one job and back to WEB_ADMIN_LANGUAGE for jobs without one.
 */
final class LanguageProviderRequestLanguageTest extends AbstractUnitTest
{
    private const string KEY = 'AdvancedOptions';
    private const string RU = 'Расширенные настройки';
    private const string EN = 'Advanced settings';

    public function testRequestLanguageIsUsedAndDoesNotLeakToTheNextRequest(): void
    {
        $di = Di::getDefault();
        $systemText = TranslationProvider::translate(self::KEY);

        LanguageProvider::useRequestLanguage($di, 'ru');
        $this->assertSame('ru', $di->getShared(LanguageProvider::SERVICE_NAME));
        $this->assertSame(self::RU, TranslationProvider::translate(self::KEY));

        // API key or localhost: no language in the envelope, back to the system language
        LanguageProvider::useRequestLanguage($di, null);
        $this->assertFalse($di->has(LanguageProvider::REQUEST_LANGUAGE));
        $this->assertSame($systemText, TranslationProvider::translate(self::KEY));

        LanguageProvider::useRequestLanguage($di, 'en');
        $this->assertSame(self::EN, TranslationProvider::translate(self::KEY));
    }

    public function testUnknownRequestLanguageFallsBackToEnglish(): void
    {
        $di = Di::getDefault();

        // Same normalisation as the web side: a removed language such as en_GB becomes en
        LanguageProvider::useRequestLanguage($di, 'en_GB');

        $this->assertSame('en', $di->getShared(LanguageProvider::SERVICE_NAME));
        $this->assertSame(self::EN, TranslationProvider::translate(self::KEY));
    }
}
