<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\System\Upgrade;

use MikoPBX\Common\Providers\ConfigProvider;
use MikoPBX\Common\Providers\LoggerProvider;
use MikoPBX\Common\Providers\ModelsAnnotationsProvider;
use MikoPBX\Common\Providers\ModelsMetadataProvider;
use MikoPBX\Core\System\Upgrade\UpdateDatabase;
use Phalcon\Annotations\Adapter\Memory as AnnotationsMemory;
use Phalcon\Config\Config;
use Phalcon\Db\Adapter\Pdo\Sqlite;
use Phalcon\Di\Di;
use Phalcon\Logger\Adapter\Noop;
use Phalcon\Logger\Logger;
use Phalcon\Mvc\Model;
use Phalcon\Mvc\Model\Manager as ModelsManager;
use Phalcon\Mvc\Model\MetaData\Memory as MetaDataMemory;
use Phalcon\Mvc\Model\MetaData\Strategy\Annotations as StrategyAnnotations;
use PHPUnit\Framework\TestCase;

/**
 * A failed table migration must leave its connection in the transaction state it found it in,
 * so the next models on that connection still migrate (issue #1231).
 */
final class UpdateDatabaseFailureIsolationTest extends TestCase
{
    private string $dir;
    private Sqlite $db;
    private Sqlite $cdr;
    private ?Di $previousDi;

    protected function setUp(): void
    {
        $this->dir = sys_get_temp_dir() . '/updatedb-' . bin2hex(random_bytes(4));
        mkdir($this->dir);
        $this->db  = new Sqlite(['dbname' => $this->dir . '/main.db']);
        $this->cdr = new Sqlite(['dbname' => $this->dir . '/cdr.db']);
        $this->previousDi = Di::getDefault();
        $this->useTempDir($this->dir);
    }

    protected function tearDown(): void
    {
        $this->db->close();
        $this->cdr->close();
        array_map('unlink', glob($this->dir . '/*') ?: []);
        rmdir($this->dir);
        if ($this->previousDi !== null) {
            Di::setDefault($this->previousDi);
        } else {
            Di::reset();
        }
        ob_end_clean();
    }

    private function useTempDir(string $tempDir): void
    {
        $di = new Di();
        $di->setShared(ConfigProvider::SERVICE_NAME, new Config(['core' => ['tempDir' => $tempDir]]));
        $di->setShared(LoggerProvider::SERVICE_NAME, new Logger('test', ['noop' => new Noop()]));
        $di->setShared(ModelsAnnotationsProvider::SERVICE_NAME, new AnnotationsMemory());
        $di->setShared('modelsManager', new ModelsManager());
        $di->set(ModelsMetadataProvider::SERVICE_NAME, function () {
            $metaData = new MetaDataMemory();
            $metaData->setStrategy(new StrategyAnnotations());
            return $metaData;
        });
        $di->setShared('db', $this->db);
        $di->setShared('dbCDR', $this->cdr);
        Di::setDefault($di);
        ob_start(); // migration progress goes to the console
    }

    private function migrate(string $modelClass): bool
    {
        $updater = new UpdateDatabase();
        $updater->setDI(Di::getDefault());
        return $updater->createUpdateDbTableByAnnotations($modelClass);
    }

    /**
     * A NULL row makes the slow-path copy into the new NOT NULL column throw.
     */
    private function prepareNotNullFailure(): void
    {
        $this->db->execute('CREATE TABLE m_isolation_notnull (id INTEGER PRIMARY KEY AUTOINCREMENT, name INTEGER)');
        $this->db->execute('INSERT INTO m_isolation_notnull (name) VALUES (NULL)');
    }

    public function testSlowPathFailureRollsBackAndNextTableMigrates(): void
    {
        $this->prepareNotNullFailure();

        $this->assertFalse($this->migrate(IsolationNotNullModel::class));
        $this->assertSame(0, $this->db->getTransactionLevel());
        $this->assertFalse($this->db->isUnderTransaction());
        // The rolled-back copy left the original table and its row in place
        $this->assertSame(1, (int) $this->db->fetchColumn('SELECT COUNT(*) FROM m_isolation_notnull'));

        $this->assertTrue($this->migrate(IsolationNextModel::class));
        $this->assertTrue($this->db->tableExists('m_isolation_next'));
        $this->assertSame(0, $this->db->getTransactionLevel());

        // The CDR connection is separate and keeps working
        $this->assertTrue($this->migrate(IsolationCdrModel::class));
        $this->assertTrue($this->cdr->tableExists('m_isolation_cdr'));
    }

    public function testFailureKeepsTheCallersTransaction(): void
    {
        $this->prepareNotNullFailure();
        $this->db->execute('CREATE TABLE m_isolation_outer (v INTEGER)');
        $this->db->begin();
        $this->db->execute('INSERT INTO m_isolation_outer (v) VALUES (1)');

        $this->assertFalse($this->migrate(IsolationNotNullModel::class));
        $this->assertSame(1, $this->db->getTransactionLevel());

        $this->db->commit();
        $this->assertSame(1, (int) $this->db->fetchColumn('SELECT COUNT(*) FROM m_isolation_outer'));
        // Our statements were undone to the savepoint: the copied table and its row survive the commit
        $this->assertSame(1, (int) $this->db->fetchColumn('SELECT COUNT(*) FROM m_isolation_notnull'));
    }

    public function testUnusableTempDirStillMigrates(): void
    {
        ob_end_clean();
        $this->useTempDir($this->dir . '/missing');

        $this->assertTrue($this->migrate(IsolationNextModel::class));
        $this->assertTrue($this->db->tableExists('m_isolation_next'));
        $this->assertSame(0, $this->db->getTransactionLevel());
    }
}

// phpcs:disable PSR1.Classes.ClassDeclaration.MultipleClasses

class IsolationNotNullModel extends Model
{
    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * @Column(type="string", nullable=false)
     */
    public $name;

    public function initialize(): void
    {
        $this->setSource('m_isolation_notnull');
        $this->setConnectionService('db');
    }
}

class IsolationNextModel extends Model
{
    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * @Column(type="string", nullable=true)
     */
    public $name;

    public function initialize(): void
    {
        $this->setSource('m_isolation_next');
        $this->setConnectionService('db');
    }
}

class IsolationCdrModel extends Model
{
    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    public function initialize(): void
    {
        $this->setSource('m_isolation_cdr');
        $this->setConnectionService('dbCDR');
    }
}
