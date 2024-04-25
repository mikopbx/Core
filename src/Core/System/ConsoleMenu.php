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

namespace MikoPBX\Core\System;

use Closure;
use Exception;
use LucidFrame\Console\ConsoleTable;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Common\Models\Storage as StorageModel;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Core\Config\RegisterDIServices;
use MikoPBX\Core\System\{Configs\IptablesConf, Configs\NginxConf};
use MikoPBX\Service\Main;
use Phalcon\Di;
use PhpSchool\CliMenu\Action\GoBackAction;
use PhpSchool\CliMenu\Builder\CliMenuBuilder;
use PhpSchool\CliMenu\CliMenu;
use PhpSchool\CliMenu\Input\InputIO;
use PhpSchool\CliMenu\Input\Text;
use PhpSchool\CliMenu\MenuStyle;
use PhpSchool\CliMenu\Style\SelectableStyle;

class ConsoleMenu
{

    private bool $isLiveCd;
    private bool $isDocker;

    public function __construct()
    {
        $this->isLiveCd = file_exists('/offload/livecd');
        $this->isDocker = Util::isDocker();
    }

    /**
     * Building a network connection setup menu
     * @param CliMenuBuilder $menuBuilder
     * @return void
     */
    public function setupLan(CliMenuBuilder $menuBuilder): void
    {
        $menuBuilder->setTitle(Util::translate('Choose action'))
            ->addItem(
                '[1] ' . Util::translate('Configuring using DHCP'),
                function (CliMenu $menu) {
                    // Action for DHCP configuration
                    echo Util::translate('The LAN interface will now be configured via DHCP...');
                    $network = new Network();
                    $data = [];
                    $data['dhcp'] = 1;
                    $network->updateNetSettings($data);
                    $network->lanConfigure();
                    $nginxConf = new NginxConf();
                    $nginxConf->reStart();
                    sleep(1);
                    if ($parent = $menu->getParent()) {
                        $menu->closeThis();
                        $parent->open();
                    }
                }
            )
            ->addItem(
                '[2] ' . Util::translate('Manual setting'),
                function (CliMenu $menu) {
                    // Action for manual LAN setting
                    $network = new Network();

                    // Set style for input menu
                    $style = (new MenuStyle())
                        ->setBg('white')
                        ->setFg('black');

                    // Validate IP address input
                    $input_ip = new class (new InputIO($menu, $menu->getTerminal()), $style) extends Text {
                        public function validate(string $input): bool
                        {
                            return Verify::isIpAddress($input);
                        }
                    };

                    // Prompt for new LAN IP address
                    $elDialog = $input_ip
                        ->setPromptText(Util::translate('Enter the new LAN IP address: '))
                        ->setValidationFailedText(Util::translate('WARNING'))
                        ->ask();
                    $lanIp = $elDialog->fetch();

                    // Prompt for subnet mask
                    $helloText = Util::translate('Subnet masks are to be entered as bit counts (as in CIDR notation).');
                    $input_bits = new class (new InputIO($menu, $menu->getTerminal()), $style) extends Text {
                        public function validate(string $input): bool
                        {
                            echo $input;
                            return (is_numeric($input) && ($input >= 1) && ($input <= 32));
                        }
                    };
                    $elDialog = $input_bits
                        ->setPromptText($helloText)
                        ->setValidationFailedText('e.g. 32 = 255.255.255.255, 24 = 255.255.255.0')
                        ->ask();
                    $lanBits = $elDialog->fetch();

                    // Prompt for LAN gateway IP address
                    $elDialog = $input_ip
                        ->setPromptText(Util::translate('Enter the LAN gateway IP address: '))
                        ->setValidationFailedText(Util::translate('WARNING'))
                        ->ask();
                    $gwIp = $elDialog->fetch();

                    // Prompt for LAN DNS IP address
                    $elDialog = $input_ip
                        ->setPromptText(Util::translate('Enter the LAN DNS IP address: '))
                        ->setValidationFailedText(Util::translate('WARNING'))
                        ->ask();
                    $dnsip = $elDialog->fetch();

                    // Update network settings and configure LAN
                    $data = [];
                    $data['ipaddr'] = $lanIp;
                    $data['subnet'] = $lanBits;
                    $data['gateway'] = $gwIp;
                    $data['primarydns'] = $dnsip;
                    $data['dhcp'] = '0';

                    echo Util::translate('The LAN interface will now be configured ...');
                    $network->updateNetSettings($data);
                    $network->resolvConfGenerate();
                    $network->lanConfigure();
                    $nginxConf = new NginxConf();
                    $nginxConf->reStart();

                    sleep(1);
                    if ($parent = $menu->getParent()) {
                        $menu->closeThis();
                        $parent->open();
                    }
                }
            )
            ->setWidth(75)
            ->setBackgroundColour('black', 'black')
            ->enableAutoShortcuts()
            ->disableDefaultItems()
            ->addItem('[3] ' . Util::translate('Cancel'), new GoBackAction());
    }

    /**
     * Menu Language Settings
     * @param CliMenuBuilder $menuBuilder
     * @return void
     */
    public function setupLanguage(CliMenuBuilder $menuBuilder): void
    {
        $languages = [
            'en' => Util::translate('ex_English'),
            'ru' => Util::translate('ex_Russian'),
            'de' => Util::translate('ex_Deutsch'),
            'es' => Util::translate('ex_Spanish'),
            'fr' => Util::translate('ex_French'),
            'pt' => Util::translate('ex_Portuguese'),
            'uk' => Util::translate('ex_Ukrainian'),
            'it' => Util::translate('ex_Italian'),
            'da' => Util::translate('ex_Danish'),
            'nl' => Util::translate('ex_Dutch'),
            'pl' => Util::translate('ex_Polish'),
            'sv' => Util::translate('ex_Swedish'),
            'az' => Util::translate('ex_Azerbaijan'),
            'ro' => Util::translate('ex_Romanian'),
            // not able to show in console without additional shell fonts, maybe later we add it
            // 'th' => Util::translate('ex_Thai'),
            // 'el'      => Util::translate('ex_Greek'),
            // 'ka'      => Util::translate('ex_Georgian'),
            // 'cs'      => Util::translate('ex_Czech'),
            // 'tr'      => Util::translate('ex_Turkish'),
            // 'ja'      => Util::translate('ex_Japanese'),
            // 'vi'      => Util::translate('ex_Vietnamese'),
            // 'zh_Hans' => Util::translate('ex_Chinese'),
        ];

        $menuBuilder->setTitle('Choose shell language')
            ->setWidth(75)
            ->setBackgroundColour('black', 'black')
            ->enableAutoShortcuts()
            ->disableDefaultItems();

        // Apply language selection
        $index = 1;
        foreach ($languages as $language => $name) {
            $menuBuilder->addItem(
                "[$index] $name",
                function () use ($language) {
                    $mikoPBXConfig = new MikoPBXConfig();
                    $mikoPBXConfig->setGeneralSettings(PbxSettingsConstants::SSH_LANGUAGE, $language);
                    $di = Di::getDefault();
                    if ($di) {
                        $di->remove(TranslationProvider::SERVICE_NAME);
                    }
                    $this->start();
                }
            );
            $index++;
        }
        $menuBuilder->addItem("[$index] Cancel", new GoBackAction());
    }

    /**
     * Launching the console menu
     * @return void
     */
    public function start(): void
    {
        RegisterDIServices::init();

        // Set Cyrillic font for display
        Util::setCyrillicFont();
        $separator = '-';
        $titleWidth = 75;
        $title = str_repeat($separator, 2) . '  ' . Util::translate("PBX console setup") . '  ';
        $titleSeparator = mb_substr($title . str_repeat($separator, $titleWidth - mb_strlen($title)), 0, $titleWidth);

        $menu = new CliMenuBuilder();
        $menu->setTitle($this->getBannerText())
            ->setTitleSeparator($titleSeparator)
            ->enableAutoShortcuts()
            ->setPadding(0)
            ->setMarginAuto()
            ->setForegroundColour('white', 'white')
            ->setBackgroundColour('black', 'black')
            ->modifySelectableStyle(
                function (SelectableStyle $style) {
                    $style->setSelectedMarker(' ')
                        ->setUnselectedMarker(' ');
                }
            )
            ->setWidth($titleWidth)
            ->addItem(' ', static function (CliMenu $menu) {
            })
            ->addSubMenu('[1] Change language', Closure::fromCallable([$this, 'setupLanguage']));

        if ($this->isDocker) {
            $menu->addSubMenu('[3] ' . Util::translate('Reboot system'), Closure::fromCallable([$this, 'setupReboot']))
                ->addItem('[4] ' . Util::translate('Ping host'), Closure::fromCallable([$this, 'pingAction']))
                ->addItem('[5] ' . Util::translate('Firewall') . $this->firewallWarning(), Closure::fromCallable([$this, 'setupFirewall']))
                ->addItem('[7] ' . Util::translate('Reset admin password'), Closure::fromCallable([$this, 'resetPassword']));
        } elseif ($this->isLiveCd) {
            $menu->addSubMenu('[2] ' . Util::translate('Set up LAN IP address'), Closure::fromCallable([$this, 'setupLan']))
                ->addSubMenu('[3] ' . Util::translate('Reboot system'), Closure::fromCallable([$this, 'setupReboot']))
                ->addItem('[4] ' . Util::translate('Ping host'), Closure::fromCallable([$this, 'pingAction']));
            // Add items for live CD options
            if (file_exists('/conf.recover/conf')) {
                $menu->addItem('[8] ' . Util::translate('Install or recover'), Closure::fromCallable([$this, 'installRecoveryAction']));
            } else {
                $menu->addItem('[8] ' . Util::translate('Install on Hard Drive'), Closure::fromCallable([$this, 'installAction']));
            }
        } else {
            $menu->addSubMenu('[2] ' . Util::translate('Set up LAN IP address'), Closure::fromCallable([$this, 'setupLan']))
                ->addSubMenu('[3] ' . Util::translate('Reboot system'), Closure::fromCallable([$this, 'setupReboot']))
                ->addItem('[4] ' . Util::translate('Ping host'), Closure::fromCallable([$this, 'pingAction']))
                ->addItem('[5] ' . Util::translate('Firewall') . $this->firewallWarning(), Closure::fromCallable([$this, 'setupFirewall']))
                ->addSubMenu('[6] ' . Util::translate('Storage') . $this->storageWarning(), Closure::fromCallable([$this, 'setupStorage']))
                ->addItem('[7] ' . Util::translate('Reset admin password'), Closure::fromCallable([$this, 'resetPassword']));
        }
        $menu->addItem('[9] ' . Util::translate('Console'), Closure::fromCallable([$this, 'consoleAction']))
            ->disableDefaultItems();

        $menuBuilder = $menu->build();
        if ($menuBuilder->getTerminal()->isInteractive()) {
            echo(str_repeat(PHP_EOL, $menu->getTerminal()->getHeight()));
            try {
                $menuBuilder->open();
            } catch (\Throwable $e) {
                Util::sysLogMsg('ConsoleMenu', $e->getMessage());
                sleep(1);
            }
        }
    }

    /**
     * Function to get the banner text
     */
    private function getBannerText(): string
    {
        $network = new Network();

        $liveCdText = '';
        if ($this->isLiveCd) {
            $liveCdText = Util::translate('PBX is running in Live or Recovery mode');
        }

        // Determine version and build time
        if (file_exists('/offload/version')) {
            $version_file = '/offload/version';
        } else {
            $version_file = '/etc/version';
        }

        $version = trim(file_get_contents($version_file));
        $buildtime = trim(file_get_contents('/etc/version.buildtime'));

        // Copyright information
        $copyright_info = 'MikoPBX is Copyright © 2017-2024. All rights reserved.' . PHP_EOL .
            "   \033[01;31m" . $liveCdText . "\033[39m";


        // Get enabled LAN interfaces
        $networks = $network->getEnabledLanInterfaces();
        $id_text = 0;

        $countSpaceIP = 1;
        $ipTable = [];
        $externAddress = '';
        foreach ($networks as $if_data) {
            $if_data['interface_orign'] = $if_data['interface'];
            $if_data['interface'] = ($if_data['vlanid'] > 0) ? "vlan{$if_data['vlanid']}" : $if_data['interface'];
            $interface = $network->getInterface($if_data['interface']);

            // Determine the IP line
            if ($if_data['dhcp'] === '1') {
                $ip_line = 'IP via DHCP';
            } elseif ($if_data['vlanid'] > 0) {
                $ip_line = "VLAN via {$if_data['interface_orign']}";
                $countSpaceIP = Max($countSpaceIP - 11, strlen($ip_line));
            } else {
                $ip_line = 'Static IP  ';
            }

            // Determine the IP info
            $ip_info = 'unassigned';
            if (!empty($interface['ipaddr'])) {
                $ip_info = "\033[01;33m{$interface['ipaddr']}\033[39m";
            }

            if (!empty($interface['mac']) && $id_text < 4) {
                $ipTable[] = ["{$if_data['interface']}:", $ip_line, $ip_info];
                $id_text++;
            }

            if ($if_data['internet'] === '1') {
                if (!empty($if_data['exthostname'])) {
                    $externAddress = $if_data['exthostname'];
                } elseif (!empty($if_data['extipaddr'])) {
                    $externAddress = $if_data['extipaddr'];
                }
            }

        }

        // Check for system integrity
        $broken = static function () {
            if (Util::isT2SdeLinux()) {
                $files = Main::checkForCorruptedFiles();
                if (count($files) !== 0) {
                    return "   \033[01;31m" . Util::translate('The integrity of the system is broken') . "\033[39m";
                }
            } elseif (php_uname('m') === 'x86_64' && Util::isDocker()) {
                $files = Main::checkForCorruptedFiles();
                $result = '    Is Docker';
                if (count($files) !== 0) {
                    $result .= ": \033[01;31m" . Util::translate('The integrity of the system is broken') . "\033[39m";
                }
                return $result;
            } elseif (Util::isDocker()) {
                // ARM and other platform...
                return '    Is Docker';
            } else {
                return '    Is Debian';
            }
            return '';
        };

        // Generate the banner text
        $result = "*** " . Util::translate('this_is') . "\033[01;32mMikoPBX v.$version\033[39m" . PHP_EOL .
            "   built on $buildtime for Generic (x64)" . PHP_EOL .
            "   " . $copyright_info . PHP_EOL;


        // Create and populate the IP table
        $table = new ConsoleTable();
        foreach ($ipTable as $row) {
            $table->addRow($row);
        }

        // Add external address if available
        if (!empty($externAddress)) {
            $table->addRow(['external:', '', $externAddress]);
            $id_text++;
        }

        // Add empty rows if needed
        while ($id_text < 4) {
            $table->addRow([' ', ' ']);
            $id_text++;
        }

        // Append the IP table to the result
        $result .= $table->hideBorder()->getTable() . PHP_EOL;

        // Append system integrity information
        $result .= $broken();
        return $result;
    }

    /**
     * Returns the firewall status text
     * @return string
     */
    public function firewallWarning(): string
    {
        // Check if the firewall is disabled
        if (PbxSettings::getValueByKey(PbxSettingsConstants::PBX_FIREWALL_ENABLED) === '0') {
            return "\033[01;34m (" . Util::translate('Firewall disabled') . ") \033[39m";
        }
        return '';
    }

    /**
     * Returns the text of the storage status
     * @return string
     */
    public function storageWarning(): string
    {
        // Check if storage disk is unmounted and not in livecd mode
        if (!$this->isLiveCd && !Storage::isStorageDiskMounted()) {
            return "    \033[01;31m (" . Util::translate('Storage unmounted') . ") \033[39m";
        }
        return '';
    }

    /**
     * Reboot and Shutdown Settings
     * @param CliMenuBuilder $b
     * @return void
     */
    public function setupReboot(CliMenuBuilder $b): void
    {
        $b->setTitle(Util::translate('Choose action'))
            ->enableAutoShortcuts()
            ->addItem(
                '[1] ' . Util::translate('Reboot'),
                function (CliMenu $menu) {
                    try {
                        $menu->close();
                    } catch (Exception $e) {
                    }
                    sleep(2);
                    System::reboot();
                    exit(0);
                }
            )
            ->addItem(
                '[2] ' . Util::translate('Power off'),
                function (CliMenu $menu) {
                    try {
                        $menu->close();
                    } catch (Exception $e) {
                    }
                    file_put_contents('/tmp/shutdown', '1');
                    exit(0);
                }
            )
            ->setWidth(75)
            ->setForegroundColour('white', 'white')
            ->setBackgroundColour('black', 'black')
            ->disableDefaultItems()
            ->addItem('[3] ' . Util::translate('Cancel'), new GoBackAction());
    }

    /**
     * Ping Command Handler
     * @param CliMenu $menu
     * @return void
     */
    public function pingAction(CliMenu $menu): void
    {
        $style = new MenuStyle();
        $style->setBg('white')
            ->setFg('black');
        $input_ip = new class (new InputIO($menu, $menu->getTerminal()), $style) extends Text {
        };
        $elLanIp = $input_ip
            ->setPromptText(Util::translate('Enter a host name or IP address: (Press ESC to exit)'))
            ->setValidationFailedText(Util::translate('WARNING'))
            ->ask();
        $pingHost = $elLanIp->fetch();
        $pingPath = Util::which('ping');
        $timeoutPath = Util::which('timeout');
        passthru("$timeoutPath 4 $pingPath -c3 " . escapeshellarg($pingHost));
        sleep(2);
        $this->start();
    }

    /**
     * Configuring firewall
     * @param CliMenu $menu
     * @return void
     */
    public function setupFirewall(CliMenu $menu): void
    {
        // Code for firewall optionn
        $firewall_enable = PbxSettings::getValueByKey(PbxSettingsConstants::PBX_FIREWALL_ENABLED);

        if ($firewall_enable === '1') {
            $action = 'disable';
        } else {
            $action = 'enable';
        }

        $helloText = Util::translate("Do you want $action firewall now? (y/n): ");
        $style = (new MenuStyle())
            ->setBg('white')
            ->setFg('black');

        $inputDialog = new class (new InputIO($menu, $menu->getTerminal()), $style) extends Text {
            public function validate(string $input): bool
            {
                return ($input === 'y' || $input === 'n');
            }
        };
        $elDialog = $inputDialog
            ->setPromptText($helloText)
            ->setValidationFailedText(Util::translate('WARNING') . ': y/n')
            ->ask();
        $result = $elDialog->fetch();

        if ($result === 'y') {
            $enable = '0';
            if ('enable' === $action) {
                $enable = '1';
            }
            PbxSettings::setValue(PbxSettingsConstants::PBX_FIREWALL_ENABLED, $enable);
            PbxSettings::setValue(PbxSettingsConstants::PBX_FAIL2BAN_ENABLED, $enable);
            IptablesConf::reloadFirewall();
            echo "Firewall is {$action}d...";
        }
        $this->start();
    }

    /**
     * Setting up a disk for data storage
     * @param CliMenuBuilder $b
     * @return void
     */
    public function setupStorage(CliMenuBuilder $b): void
    {
        $b->setTitle(Util::translate('Choose action'))
            ->addItem(
                '[1] ' . Util::translate('Connect storage'),
                function (CliMenu $menu) {
                    // Code for connecting storage
                    $menu->close();
                    Storage::selectAndConfigureStorageDisk();
                    sleep(1);
                    exit(0);
                }
            )
            ->addItem(
                '[2] ' . Util::translate('Check storage'),
                function (CliMenu $menu) {
                    // Code for checking storage
                    /** @var StorageModel $data */
                    $data = StorageModel::findFirst();
                    if (!$data) {
                        echo "\n " . Util::translate('Valid disks not found...') . " \n";
                        return;
                    }
                    $style = (new MenuStyle())
                        ->setBg('white')
                        ->setFg('black');
                    $input_ip = new class (new InputIO($menu, $menu->getTerminal()), $style) extends Text {
                        public function validate(string $input): bool
                        {
                            return ($input === 'y' || $input === 'n');
                        }
                    };
                    $elDialog = $input_ip
                        ->setPromptText(Util::translate('All processes will be completed. Continue? (y/n):'))
                        ->setValidationFailedText(Util::translate('WARNING') . ': y/n')
                        ->ask();
                    $result = $elDialog->fetch();
                    $menu->close();
                    if ($result !== 'y') {
                        sleep(2);
                        exit(0);
                    }
                    $dev_name = file_exists("{$data->device}4") ? "{$data->device}4" : "{$data->device}1";

                    passthru('/sbin/freestorage');
                    passthru('e2fsck -f -p ' . escapeshellarg($dev_name), $return_var);
                    echo "check return $return_var";
                    sleep(2);
                    system('/sbin/pbx_reboot');
                }
            )
            ->addItem(
                '[3] ' . Util::translate('Resize storage'),
                function (CliMenu $menu) {
                    // Code for resizing storage
                    /** @var StorageModel $data */
                    $data = StorageModel::findFirst();
                    if ($data === null) {
                        echo "\n " . Util::translate('Valid disks not found...') . " \n";
                        return;
                    }
                    $style = (new MenuStyle())
                        ->setBg('white')
                        ->setFg('black');

                    $input_ip = new class (new InputIO($menu, $menu->getTerminal()), $style) extends Text {
                        public function validate(string $input): bool
                        {
                            return ($input === 'y' || $input === 'n');
                        }
                    };
                    $elDialog = $input_ip
                        ->setPromptText(Util::translate('All processes will be completed. Continue? (y/n):'))
                        ->setValidationFailedText(Util::translate('WARNING') . ': y/n')
                        ->ask();
                    $result = $elDialog->fetch();
                    $menu->close();
                    if ($result !== 'y') {
                        sleep(2);
                        exit(0);
                    }
                    passthru('/etc/rc/resize_storage_part ' . escapeshellarg($data->device), $return_var);
                    echo "resize storage return $return_var";
                    sleep(2);
                    if ($return_var === 0) {
                        file_put_contents('/tmp/ejectcd', '');
                        $pbx_rebootPath = Util::which('pbx_reboot');
                        Processes::mwExecBg($pbx_rebootPath);
                    }
                }
            )
            ->setWidth(75)
            ->enableAutoShortcuts()
            ->setForegroundColour('white', 'white')
            ->setBackgroundColour('black', 'black')
            ->disableDefaultItems()
            ->addItem('[4] ' . Util::translate('Cancel'), new GoBackAction());
    }

    /**
     * Reset web password
     * @param CliMenu $menu
     * @return void
     */
    public function resetPassword(CliMenu $menu): void
    {
        // Code for resetting admin password
        $style = (new MenuStyle())
            ->setBg('white')
            ->setFg('black');

        $input_ip = new class (new InputIO($menu, $menu->getTerminal()), $style) extends Text {
            public function validate(string $input): bool
            {
                return ($input === 'y' || $input === 'n');
            }
        };
        $elResetPassword = $input_ip
            ->setPromptText('Do you want reset password? (y/n):')
            ->setValidationFailedText(Util::translate('WARNING') . ': y/n')
            ->ask();
        $result = $elResetPassword->fetch();
        if ($result !== 'y') {
            return;
        }
        try {
            $menu->close();
        } catch (Exception $e) {
        }
        $mikoPBXConfig = new MikoPBXConfig();
        $res_login = $mikoPBXConfig->resetGeneralSettings('WebAdminLogin');
        $res_password = $mikoPBXConfig->resetGeneralSettings('WebAdminPassword');

        if ($res_login === true && $res_password === true) {
            echo Util::translate('Password successfully reset. New login: admin. New password: admin.');
        } else {
            echo Util::translate('Error resetting password.');
        }
        sleep(2);
        $this->start();
    }

    /**
     * System Installation or Recovery action
     * @param CliMenu $menu
     * @return void
     */
    public function installRecoveryAction(CliMenu $menu): void
    {
        echo "\e[?25h";
        try {
            $menu->close();
        } catch (Exception $e) {
        }
        file_put_contents('/tmp/ejectcd', '');
        $recovery = new PBXRecovery();
        $recovery->run();
        exit(0);
    }

    /**
     * System Installation
     * @param CliMenu $menu
     * @return void
     */
    public function installAction(CliMenu $menu): void
    {
        echo "\e[?25h";
        try {
            $menu->close();
        } catch (Exception $e) {
        }
        file_put_contents('/tmp/ejectcd', '');
        $installer = new PBXInstaller();
        $installer->run();
        exit(0);
    }

    /**
     * Console Opening Action
     * @param CliMenu $menu
     * @return void
     */
    public function consoleAction(CliMenu $menu): void
    {
        // Enable cursor
        echo "\e[?25h";
        try {
            $menu->close();
        } catch (Exception $e) {
        }
        file_put_contents('/tmp/start_sh', '');
        exit(0);
    }
}