<?php

namespace MikoPBX\Tests\AdminCabinet\Tests;

use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;
use MikoPBX\Tests\AdminCabinet\Tests\Traits\FirewallRulesTrait;

abstract class CreateFirewallRuleTest extends MikoPBXTestsBase
{
    use FirewallRulesTrait;
    private static bool $isTableCleared = false;

    protected function setUp(): void
    {
        parent::setUp();

        if (!self::$isTableCleared) {
            $this->clearFirewallRules();
            self::$isTableCleared = true;
        }

        $data = $this->getRuleData();
        $this->setSessionName("Test: Create Firewall Rule - " . $data['description']);
    }

    /**
     * Clear firewall rules table
     */
    protected function clearFirewallRules(): void
    {
        $this->clickSidebarMenuItemByHref("/admin-cabinet/firewall/index/");
        $this->deleteAllRecordsOnTable('firewall-table');
    }

    /**
     * Get rule data
     */
    abstract protected function getRuleData(): array;

    /**
     * Test creating firewall rule
     */
    public function testCreateFirewallRule(): void
    {
        $params = $this->getRuleData();
        self::annotate("Creating firewall rule: " . $this->getRuleDescription($params));

        try {
            $this->createRule($params);
            $this->verifyRule($params);
            self::annotate("Successfully created firewall rule", 'success');
        } catch (\Exception $e) {
            self::annotate("Failed to create firewall rule", 'error');
            throw $e;
        }
    }

    /**
     * Create firewall rule
     */
    protected function createRule(array $params): void
    {
        $this->clickSidebarMenuItemByHref("/admin-cabinet/firewall/index/");
        $this->clickButtonByHref('/admin-cabinet/firewall/modify');

        $this->fillBasicInfo($params);
        $this->configureRules($params['rules']);
        $this->configureOptions($params);

        $this->submitForm('firewall-form');
    }

    /**
     * Fill basic rule information
     */
    protected function fillBasicInfo(array $params): void
    {
        $this->changeInputField('id', $params['id']);
        $this->changeInputField('description', $params['description']);
        $this->changeInputField('network', $params['network']);
        $this->selectDropdownItem('subnet', $params['subnet']);
    }

    /**
     * Configure additional options
     */
    protected function configureOptions(array $params): void
    {
        $this->changeCheckBoxState('local_network', $params['local_network']);
        $this->changeCheckBoxState('newer_block_ip', $params['newer_block_ip']);
    }

    /**
     * Verify firewall rule
     */
    protected function verifyRule(array $params): void
    {
        $id = $this->getCurrentRecordID();

        $this->clickSidebarMenuItemByHref('/admin-cabinet/firewall/index/');
        $this->clickModifyButtonOnRowWithID($id);

        $this->verifyBasicInfo($params);
        $this->verifyRules($params['rules']);
        $this->verifyOptions($params);
    }

    /**
     * Verify basic rule information
     */
    protected function verifyBasicInfo(array $params): void
    {
        $this->assertInputFieldValueEqual('id', $params['id']);
        $this->assertInputFieldValueEqual('description', $params['description']);
        $this->assertInputFieldValueEqual('network', $params['network']);
        $this->assertMenuItemSelected('subnet', $params['subnet']);
    }

    /**
     * Verify additional options
     */
    protected function verifyOptions(array $params): void
    {
        $this->assertCheckBoxStageIsEqual('local_network', $params['local_network']);
        $this->assertCheckBoxStageIsEqual('newer_block_ip', $params['newer_block_ip']);
    }
}