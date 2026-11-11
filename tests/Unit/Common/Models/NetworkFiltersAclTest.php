<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Common\Models;

use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\Tests\Unit\AbstractUnitTest;
use Phalcon\Mvc\Model\Relation;

/**
 * A record bound to a deleted network filter used to get an empty permit/deny pair, which every
 * consumer (acl.conf, manager.conf, iax.conf, API keys) renders as "no restriction".
 */
class NetworkFiltersAclTest extends AbstractUnitTest
{
    /**
     * @return array<string, array{string|null}>
     */
    public static function unrestrictedProvider(): array
    {
        return [
            'null' => [null],
            'empty' => [''],
            'zero (providers)' => ['0'],
            'none (REST)' => ['none'],
        ];
    }

    /**
     * @dataProvider unrestrictedProvider
     */
    public function testNoFilterMeansNoRestriction(?string $filterId): void
    {
        $this->assertSame(['permit' => '', 'deny' => ''], NetworkFilters::getAclByFilterId($filterId, 'test'));
    }

    public function testMissingFilterIsLimitedToLocalhost(): void
    {
        $missingId = (string)((int)(NetworkFilters::maximum(['column' => 'id']) ?? 0) + 1000);

        $this->assertSame(
            [
                'permit' => NetworkFilters::ACL_LOCALHOST,
                'deny' => NetworkFilters::ACL_ANY,
            ],
            NetworkFilters::getAclByFilterId($missingId, 'test')
        );
    }

    public function testLocalhostFilter(): void
    {
        $this->assertSame(
            ['permit' => NetworkFilters::ACL_LOCALHOST, 'deny' => NetworkFilters::ACL_ANY],
            NetworkFilters::getAclByFilterId(NetworkFilters::LOCALHOST_FILTER_ID, 'test')
        );
    }

    public function testRestrictedRecordsBlockFilterDeletion(): void
    {
        $relations = (new NetworkFilters())->getModelsManager()->getHasMany(new NetworkFilters());
        $actions = [];
        foreach ($relations as $relation) {
            $actions[$relation->getOptions()['alias']] = $relation->getForeignKey()['action'] ?? null;
        }

        foreach (['Sip', 'Iax', 'AsteriskManagerUsers', 'ApiKeys'] as $alias) {
            $this->assertSame(Relation::ACTION_RESTRICT, $actions[$alias] ?? null, $alias);
        }
    }
}
