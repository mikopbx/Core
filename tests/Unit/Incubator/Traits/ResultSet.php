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

use Phalcon\Mvc\Model\Resultset as phResultset;

/**
 * Trait ResultSet. Adds Ability To Mock DB ResultSet (Without Actual Connection To DB)
 *
 * The resulting mock is only intended to mock the basic functions of a resultset.
 */
trait ResultSet
{
    /**
     * @param array $dataSet Mock Data Set To Use
     * @param string $className ResultSet Class To Mimic (Defaults To Abstract ResultSet)
     *
     * @return \PHPUnit\Framework\MockObject\MockObject|\Phalcon\Mvc\Model\Resultset|\Phalcon\Mvc\Model\ResultsetInterface
     */
    public function mockResultSet(array $dataSet, $className = phResultset::class)
    {
        /** @var \PHPUnit\Framework\TestCase $this */
        /** @var \PHPUnit\Framework\MockObject\MockObject $mockResultSet */


        $mockResultSet = $this->getMockBuilder($className)
            ->disableOriginalConstructor()
            ->setMethods(
                [
                    'valid',
                //                    'current', //Disable due to final restriction
                    'key',
                    'next',
                    'toArray',
                    'getFirst',
                    'getLast',
                    'serialize',
                    'unserialize'
                ]
            )->getMockForAbstractClass();

        //Work Around For Final Count Method
        $reflectionMethod = new \ReflectionProperty('\Phalcon\Mvc\Model\Resultset', 'count');
        $reflectionMethod->setAccessible(true);
        $reflectionMethod->setValue($mockResultSet, count($dataSet));

        //Work Around For Final Seek
        $reflectionProperty = new \ReflectionProperty('\Phalcon\Mvc\Model\Resultset', 'rows');
        $reflectionProperty->setAccessible(true);
        $reflectionProperty->setValue($mockResultSet, $dataSet);

        $sharedData = new \stdClass();
        $sharedData->pos = 0;
        $sharedData->data = $dataSet;

        $mockResultSet->method('getFirst')
            ->willReturnCallback(function () use ($sharedData) {
                if (empty($sharedData->data)) {
                    return null;
                }

                $arrayKeys = array_keys($sharedData->data);
                return $sharedData->data[$arrayKeys[0]];
            });

        $mockResultSet->method('getLast')
            ->willReturnCallback(function () use ($sharedData) {
                if (empty($sharedData->data)) {
                    return null;
                }

                return array_reverse($sharedData->data)[0];
            });

        $mockResultSet->method('valid')
            ->willReturnCallback(
                function () use ($sharedData) {
                    return $sharedData->pos < count($sharedData->data);
                }
            );

        $mockResultSet->method('key')
            ->willReturnCallback(
                function () use ($sharedData) {
                    return array_keys($sharedData->data)[$sharedData->pos];
                }
            );

        $mockResultSet->method('next')
            ->willReturnCallback(
                function () use ($sharedData) {
                    $sharedData->pos++;
                }
            );

        $mockResultSet->method('toArray')
            ->willReturn($dataSet);

        return $mockResultSet;
    }
}
