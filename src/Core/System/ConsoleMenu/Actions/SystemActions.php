<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Core\System\ConsoleMenu\Actions;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\Storage as StorageModel;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Core\Config\RegisterDIServices;
use MikoPBX\Core\System\Configs\Fail2BanConf;
use MikoPBX\Core\System\Configs\IptablesConf;
use MikoPBX\Core\System\ConsoleMenu\Menus\MainMenu;
use MikoPBX\Core\System\ConsoleMenu\Utilities\MenuStyleConfig;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Storage;
use MikoPBX\Core\System\Util;
use MikoPBX\Service\Main;
use Phalcon\Di\Di;
use Phalcon\Translate\Adapter\NativeArray;
use PhpSchool\CliMenu\Builder\CliMenuBuilder;
use PhpSchool\CliMenu\CliMenu;
use PhpSchool\CliMenu\Input\InputIO;
use PhpSchool\CliMenu\Input\Text;

/**
 * System-related actions for console menu
 *
 * Handles:
 * - Language selection
 * - Firewall configuration
 * - Storage management
 * - Password reset
 */
class SystemActions
{
    private NativeArray $translation;
    private MenuStyleConfig $styleConfig;

    public function __construct()
    {
        $di = Di::getDefault();
        $this->translation = $di->getShared(TranslationProvider::SERVICE_NAME);
        $this->styleConfig = new MenuStyleConfig();
    }

    /**
     * Setup console language
     *
     * @return void
     */
    public function setupLanguage(): void
    {
        $languages = [
            'en' => $this->translation->_('ex_English'),
            'ru' => $this->translation->_('ex_Russian'),
            'de' => $this->translation->_('ex_Deutsch'),
            'es' => $this->translation->_('ex_Spanish'),
            'fr' => $this->translation->_('ex_French'),
            'pt' => $this->translation->_('ex_Portuguese'),
            'uk' => $this->translation->_('ex_Ukrainian'),
            'it' => $this->translation->_('ex_Italian'),
            'da' => $this->translation->_('ex_Danish'),
            'nl' => $this->translation->_('ex_Dutch'),
            'pl' => $this->translation->_('ex_Polish'),
            'sv' => $this->translation->_('ex_Swedish'),
            'az' => $this->translation->_('ex_Azerbaijan'),
            'ro' => $this->translation->_('ex_Romanian'),
        ];

        $builder = new CliMenuBuilder();
        $builder->setTitle($this->translation->_('cm_ChooseShellLanguage'))
            ->setWidth($this->styleConfig->getMenuWidth())
            ->setBackgroundColour('black', 'black')
            ->enableAutoShortcuts()
            ->disableDefaultItems();

        $index = 1;
        foreach ($languages as $language => $name) {
            $builder->addItem(
                "[$index] $name",
                function () use ($language) {
                    PbxSettings::setValueByKey(PbxSettings::SSH_LANGUAGE, $language);
                    $di = Di::getDefault();
                    $di?->remove(TranslationProvider::SERVICE_NAME);

                    // Restart menu with new language
                    RegisterDIServices::init();
                    $mainMenu = new MainMenu();
                    $mainMenu->show();
                }
            );
            $index++;
        }

        $builder->addItem("[$index] " . $this->translation->_('cm_Cancel'), function (CliMenu $menu) {
            $menu->close();
            $mainMenu = new MainMenu();
            $mainMenu->show();
        });

        $menu = $builder->build();
        try {
            $menu->open();
        } catch (\Throwable $e) {
            // Log error and continue
        }
    }

    /**
     * Configure firewall (enable/disable)
     *
     * @param CliMenu $menu Current menu
     * @return void
     */
    public function setupFirewall(CliMenu $menu): void
    {
        $firewallEnabled = PbxSettings::getValueByKey(PbxSettings::PBX_FIREWALL_ENABLED);
        $action = $firewallEnabled === '1' ? 'disable' : 'enable';

        $helloText = $this->translation->_('cm_DoYouWantFirewallAction', ['action' => $action]);
        $style = $this->styleConfig->getInputStyle();

        $input = new class (new InputIO($menu, $menu->getTerminal()), $style) extends Text {
            public function validate(string $input): bool
            {
                return ($input === 'y' || $input === 'n');
            }
        };

        $dialog = $input
            ->setPromptText($helloText)
            ->setValidationFailedText($this->translation->_('cm_WarningYesNo'))
            ->ask();
        $result = $dialog->fetch();

        if ($result === 'y') {
            $enable = $action === 'enable' ? '1' : '0';
            PbxSettings::setValueByKey(PbxSettings::PBX_FIREWALL_ENABLED, $enable);
            PbxSettings::setValueByKey(PbxSettings::PBX_FAIL2BAN_ENABLED, $enable);
            IptablesConf::reloadFirewall();

            $fail2ban = new Fail2BanConf();
            $fail2ban->reStart();
            echo "Firewall is {$action}d...";
        }

        // Restart main menu
        $mainMenu = new MainMenu();
        $mainMenu->show();
    }

    /**
     * Toggle HTTP to HTTPS redirect
     *
     * @param CliMenu $menu Current menu
     * @return void
     */
    public function toggleHttpRedirect(CliMenu $menu): void
    {
        $redirectEnabled = PbxSettings::getValueByKey(PbxSettings::REDIRECT_TO_HTTPS);
        $action = $redirectEnabled === '1' ? 'disable' : 'enable';

        $helloText = $this->translation->_('cm_DoYouWantHttpRedirectAction', ['action' => $action]);
        $style = $this->styleConfig->getInputStyle();

        $input = new class (new InputIO($menu, $menu->getTerminal()), $style) extends Text {
            public function validate(string $input): bool
            {
                return ($input === 'y' || $input === 'n');
            }
        };

        $dialog = $input
            ->setPromptText($helloText)
            ->setValidationFailedText($this->translation->_('cm_WarningYesNo'))
            ->ask();
        $result = $dialog->fetch();

        if ($result === 'y') {
            $enable = $action === 'enable' ? '1' : '0';
            PbxSettings::setValueByKey(PbxSettings::REDIRECT_TO_HTTPS, $enable);

            // Reload nginx to apply changes
            $nginxPath = Util::which('nginx');
            if (!empty($nginxPath)) {
                Processes::mwExec("$nginxPath -s reload");
            }
        }

        // Restart main menu
        $mainMenu = new MainMenu();
        $mainMenu->show();
    }

    /**
     * Reset admin password
     *
     * @param CliMenu $menu Current menu
     * @return void
     */
    public function resetPassword(CliMenu $menu): void
    {
        $style = $this->styleConfig->getInputStyle();

        $input = new class (new InputIO($menu, $menu->getTerminal()), $style) extends Text {
            public function validate(string $input): bool
            {
                return ($input === 'y' || $input === 'n');
            }
        };

        $dialog = $input
            ->setPromptText($this->translation->_('cm_DoYouWantResetPassword'))
            ->setValidationFailedText($this->translation->_('cm_WarningYesNo'))
            ->ask();
        $result = $dialog->fetch();

        if ($result !== 'y') {
            return;
        }

        try {
            $menu->close();
        } catch (\Exception $e) {
            // Ignore
        }

        PbxSettings::resetValueToDefault(PbxSettings::WEB_ADMIN_LOGIN);
        PbxSettings::resetValueToDefault(PbxSettings::WEB_ADMIN_PASSWORD);

        $newLogin = PbxSettings::getValueByKey(PbxSettings::WEB_ADMIN_LOGIN);
        $newPassword = PbxSettings::getValueByKey(PbxSettings::WEB_ADMIN_PASSWORD);
        echo $this->translation->_('cm_PasswordSuccessfullyReset', ['login' => $newLogin, 'password' => $newPassword]);
        sleep(2);

        // Restart main menu
        $mainMenu = new MainMenu();
        $mainMenu->show();
    }

    /**
     * Connect storage disk
     *
     * @param CliMenu $menu Current menu
     * @return void
     */
    public function connectStorage(CliMenu $menu): void
    {
        $menu->close();
        Storage::selectAndConfigureStorageDisk();
        sleep(1);
        exit(0);
    }

    /**
     * Check storage filesystem
     *
     * @param CliMenu $menu Current menu
     * @return void
     */
    public function checkStorage(CliMenu $menu): void
    {
        /** @var StorageModel|null $data */
        $data = StorageModel::findFirst();
        if ($data === null) {
            echo "\n " . $this->translation->_('cm_ValidDisksNotFound') . " \n";
            return;
        }

        $style = $this->styleConfig->getInputStyle();
        $input = new class (new InputIO($menu, $menu->getTerminal()), $style) extends Text {
            public function validate(string $input): bool
            {
                return ($input === 'y' || $input === 'n');
            }
        };

        $dialog = $input
            ->setPromptText($this->translation->_('cm_AllProcessesWillBeCompleted'))
            ->setValidationFailedText($this->translation->_('cm_WarningYesNo'))
            ->ask();
        $result = $dialog->fetch();

        $menu->close();

        if ($result !== 'y') {
            sleep(2);
            exit(0);
        }

        $devName = file_exists("{$data->device}4") ? "{$data->device}4" : "{$data->device}1";

        passthru('/sbin/freestorage');
        passthru('e2fsck -f -p ' . escapeshellarg($devName), $returnVar);
        echo "check return $returnVar";
        sleep(2);
        system('/sbin/pbx_reboot');
    }

    /**
     * Resize storage partition
     *
     * @param CliMenu $menu Current menu
     * @return void
     */
    public function resizeStorage(CliMenu $menu): void
    {
        /** @var StorageModel $data */
        $data = StorageModel::findFirst();
        if ($data === null) {
            echo "\n " . $this->translation->_('cm_ValidDisksNotFound') . " \n";
            return;
        }

        $style = $this->styleConfig->getInputStyle();
        $input = new class (new InputIO($menu, $menu->getTerminal()), $style) extends Text {
            public function validate(string $input): bool
            {
                return ($input === 'y' || $input === 'n');
            }
        };

        $dialog = $input
            ->setPromptText($this->translation->_('cm_AllProcessesWillBeCompleted'))
            ->setValidationFailedText($this->translation->_('cm_WarningYesNo'))
            ->ask();
        $result = $dialog->fetch();

        $menu->close();

        if ($result !== 'y') {
            sleep(2);
            exit(0);
        }

        passthru('/etc/rc/resize_storage_part ' . escapeshellarg($data->device), $returnVar);
        echo "resize storage return $returnVar";
        sleep(2);

        if ($returnVar === 0) {
            file_put_contents('/tmp/ejectcd', '');
            $pbxRebootPath = Util::which('pbx_reboot');
            Processes::mwExecBg($pbxRebootPath);
        }
    }

    /**
     * Show corrupted/modified system files
     *
     * Displays list of files that have been modified from their original state.
     * Uses non-silent mode to also log to syslog.
     *
     * @param CliMenu $menu Current menu
     * @return void
     */
    public function showCorruptedFiles(CliMenu $menu): void
    {
        $menu->close();

        echo "\n";
        echo MenuStyleConfig::colorize(
            $this->translation->_('cm_CheckSystemIntegrity'),
            MenuStyleConfig::COLOR_CYAN
        );
        echo "\n\n";

        // Use silent mode to avoid duplicate output (LOG_PERROR in syslog)
        $files = Main::checkForCorruptedFiles(true);

        if (empty($files)) {
            echo MenuStyleConfig::colorize(
                $this->translation->_('cm_NoCorruptedFiles'),
                MenuStyleConfig::COLOR_GREEN
            );
            echo "\n";
        } else {
            echo MenuStyleConfig::colorize(
                $this->translation->_('cm_CorruptedFilesFound'),
                MenuStyleConfig::COLOR_YELLOW
            );
            echo "\n\n";

            foreach ($files as $file) {
                echo "  • $file\n";
            }
        }

        echo "\n";
        echo $this->translation->_('cm_PressEnterToContinue');
        fgets(STDIN);

        // Return to main menu
        $mainMenu = new MainMenu();
        $mainMenu->show();
    }
}
