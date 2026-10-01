<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Core\Asterisk\Configs;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\Asterisk\Configs\IVRConf;
use Phalcon\Cache\Adapter\Redis as RedisCache;
use Phalcon\Config\Config;
use Phalcon\Db\Adapter\Pdo\Sqlite;
use Phalcon\Di\Di;
use Phalcon\Di\DiInterface;
use Phalcon\Di\FactoryDefault;
use Phalcon\Storage\SerializerFactory;
use PHPUnit\Framework\TestCase;

/** Exercises real ORM lookups; MIKOPBX_TEST_REDIS_HOST must point to test Redis. */
class IVRConfTest extends TestCase
{
    private ?DiInterface $previousDi = null;
    private ?Sqlite $db = null;
    private ?\Redis $redis = null;
    private string $directory = '';

    protected function setUp(): void
    {
        parent::setUp();
        $this->previousDi = Di::getDefault();
        $host = getenv('MIKOPBX_TEST_REDIS_HOST');
        if (!$host) {
            self::markTestSkipped('Set MIKOPBX_TEST_REDIS_HOST to a disposable Redis instance.');
        }

        $di = new FactoryDefault();
        Di::setDefault($di);
        $cache = new RedisCache(new SerializerFactory(), ['host' => $host, 'persistent' => false]);
        $this->redis = $cache->getAdapter();
        $this->redis->setOption(\Redis::OPT_PREFIX, 'ivr-test-' . bin2hex(random_bytes(8)) . ':');
        $this->redis->select(4);
        $this->redis->hSet('PbxSettings', PbxSettings::DISABLE_ALL_MODULES, '1');
        $di->setShared('managedCache', $cache);
        $di->setShared('config', new Config());

        $this->db = new Sqlite(['dbname' => ':memory:']);
        $di->setShared('db', $this->db);
        // Direct SQL avoids model-save events and never touches a running PBX database.
        $this->db->execute('CREATE TABLE m_Sip (id INTEGER PRIMARY KEY, extension TEXT, type TEXT, disabled TEXT)');
        $this->db->execute('CREATE TABLE m_SoundFiles (id INTEGER PRIMARY KEY, name TEXT, path TEXT,
            category TEXT, description TEXT)');
        $this->db->execute('CREATE TABLE m_IvrMenu (id INTEGER PRIMARY KEY, uniqid TEXT, extension TEXT,
            audio_message_id TEXT, name TEXT, timeout INTEGER, timeout_extension TEXT,
            allow_enter_any_internal_extension TEXT, number_of_repeat INTEGER, description TEXT)');
        $this->db->execute('CREATE TABLE m_IvrMenuActions (id INTEGER PRIMARY KEY, ivr_menu_id TEXT,
            digits TEXT, extension TEXT)');

        $this->directory = sys_get_temp_dir() . '/ivr-audio-' . bin2hex(random_bytes(8));
        self::assertTrue(mkdir($this->directory));
        // Valid mono 8 kHz PCM WAV fixtures, also usable for a runtime playback check.
        $pcm = str_repeat("\0", 1600);
        $wav = 'RIFF' . pack('V', 36 + strlen($pcm)) . 'WAVEfmt '
            . pack('VvvVVvv', 16, 1, 1, 8000, 16000, 2, 16) . 'data' . pack('V', strlen($pcm)) . $pcm;
        foreach (['first', 'selected', 'legacy'] as $name) {
            file_put_contents($this->directory . '/' . $name . '.wav', $wav);
        }
        foreach ([1 => 'first.wav', 2 => 'selected.wav', 3 => 'missing.wav', 4 => 'legacy.mp3'] as $id => $file) {
            $this->db->execute('INSERT INTO m_SoundFiles (id, path) VALUES (?, ?)', [
                $id, $this->directory . '/' . $file,
            ]);
        }
    }

    protected function tearDown(): void
    {
        try {
            if ($this->redis !== null) {
                $this->redis->select(4);
                $this->redis->del('PbxSettings');
                $this->redis->close();
            }
            $this->db?->close();
            if ($this->directory !== '') {
                foreach (glob($this->directory . '/*') ?: [] as $file) {
                    unlink($file);
                }
                rmdir($this->directory);
            }
        } finally {
            Di::reset();
            if ($this->previousDi !== null) {
                Di::setDefault($this->previousDi);
            }
            parent::tearDown();
        }
    }

    /** @dataProvider greetingProvider */
    public function testGreetingSelection(?string $soundId, string $expected): void
    {
        $this->db->execute('INSERT INTO m_IvrMenu VALUES (1, ?, ?, ?, ?, 7, ?, ?, 3, ?)', [
            'IVR-TEST', '2200102', $soundId, 'Test IVR', '203', '0', '',
        ]);
        $conf = (new IVRConf())->extensionGenContexts();
        $path = $expected === 'vm-enter-num-to-call' ? $expected : $this->directory . '/' . $expected;
        self::assertStringContainsString('Background(' . $path . ')', $conf);
        self::assertStringNotContainsString('Background(' . $this->directory . '/first)', $conf);
    }

    public static function greetingProvider(): array
    {
        return [
            'empty selection' => ['', 'vm-enter-num-to-call'],
            'null selection' => [null, 'vm-enter-num-to-call'],
            'explicit second recording' => ['2', 'selected'],
            'missing record' => ['999', 'vm-enter-num-to-call'],
            'missing audio file' => ['3', 'vm-enter-num-to-call'],
            'legacy mp3 with surviving wav' => ['4', 'legacy'],
        ];
    }
}
