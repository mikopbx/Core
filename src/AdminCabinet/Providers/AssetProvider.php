<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\AdminCabinet\Providers;

use Phalcon\Assets\Collection;
use Phalcon\Assets\Manager;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use Phalcon\Text;

use function MikoPBX\Common\Config\appPath;

class AssetProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'assets';

    private Collection $headerCollectionJSForExtensions;
    private Collection $footerCollectionJSForExtensions;
    private Collection $headerCollectionJS;
    private Collection $headerCollectionCSS;
    private Collection $footerCollectionJS;
    private Collection $semanticCollectionCSS;
    private Collection $semanticCollectionJS;
    private Collection $footerCollectionACE;
    private Collection $footerCollectionLoc;
    private Collection $headerCollectionSentryJS;
    private string $cssCacheDir;
    private string $jsCacheDir;
    private Manager $manager;

    /**
     * Registers assets service provider
     *
     * @param \Phalcon\Di\DiInterface $di
     */
    public function register(DiInterface $di): void
    {
        $di->set(
            self::SERVICE_NAME,
            function () use ($di) {
                $assets = new AssetProvider();
                $assets->initializeClassVariables();
                $dispatcher = $di->get('dispatcher');
                $session    = $di->get('session');
                $controller = $dispatcher->getControllerName();
                $action     = $dispatcher->getActionName();
                $moduleName = $dispatcher->getModuleName();

                if ($action === null) {
                    $action = 'index';
                }
                if ($session !== null && $session->has('versionHash')) {
                    $version = (string)$session->get('versionHash');
                } else {
                    $version = str_replace(PHP_EOL, '', file_get_contents('/etc/version'));
                }

                $assets->makeSentryAssets($version);
                $assets->makeHeaderAssets($session, $moduleName);

                // Generates Controllers assets
                $method_name = "make{$controller}Assets";
                if (method_exists($assets, $method_name)) {
                    $assets->$method_name($action);
                }

                $assets->makeFooterAssets();
                $assets->makeLocalizationAssets($di, $version);
                $assets->generateFilesAndLinks($controller, $action, $version);

                return $assets->manager;
            }
        );
    }

    /**
     * Initialize class variables
     */
    public function initializeClassVariables()
    {
        $this->manager = new Manager();

        $this->cssCacheDir = appPath('sites/admin-cabinet/assets/css/cache');
        $this->jsCacheDir  = appPath('sites/admin-cabinet/assets/js/cache');

        $this->headerCollectionJSForExtensions = $this->manager->collection('headerJS');
        $this->headerCollectionJSForExtensions->setPrefix('assets/');
        $this->footerCollectionJSForExtensions = $this->manager->collection('footerJS');
        $this->footerCollectionJSForExtensions->setPrefix('assets/');
        $this->headerCollectionJS = $this->manager->collection('headerPBXJS');
        $this->headerCollectionJS->setPrefix('assets/');
        $this->headerCollectionCSS = $this->manager->collection('headerCSS');
        $this->headerCollectionCSS->setPrefix('assets/');
        $this->footerCollectionJS = $this->manager->collection('footerPBXJS');
        $this->footerCollectionJS->setPrefix('assets/');
        $this->headerCollectionSentryJS = $this->manager->collection('headerSentryJS');
        $this->semanticCollectionCSS    = $this->manager->collection('SemanticUICSS');
        $this->semanticCollectionCSS->setPrefix('assets/');
        $this->semanticCollectionJS = $this->manager->collection('SemanticUIJS');
        $this->semanticCollectionJS->setPrefix('assets/');
        $this->footerCollectionACE = $this->manager->collection('footerACE');
        $this->footerCollectionACE->setPrefix('assets/');
        $this->footerCollectionLoc = $this->manager->collection('footerLoc');
        $this->footerCollectionLoc->setPrefix('assets/');
    }

    /**
     * Makes assets for the Sentry error logger
     *
     * @param string $version
     */
    private function makeSentryAssets(string $version): void
    {
        if (file_exists('/tmp/sendmetrics')) {
            $this->headerCollectionSentryJS->addjs(
                'assets/js/vendor/sentry/bundle.min.js',
                true
            );
            $this->headerCollectionSentryJS->addJs(
                "assets/js/pbx/main/sentry-error-logger.js?v={$version}",
                true
            );
        }
    }

    /**
     * Makes assets for all controllers. Base set of scripts and styles
     *
     * @param $session
     * @param $moduleName
     */
    private function makeHeaderAssets($session, $moduleName): void
    {
        $this->semanticCollectionCSS
            ->addCss('css/vendor/semantic/grid.min.css', true)
            ->addCss('css/vendor/semantic/divider.min.css', true)
            ->addCss('css/vendor/semantic/container.min.css', true)
            ->addCss('css/vendor/semantic/header.min.css', true)
            ->addCss('css/vendor/semantic/button.min.css', true)
            ->addCss('css/vendor/semantic/form.min.css', true)
            ->addCss('css/vendor/semantic/icon.min.css', true)
            ->addCss('css/vendor/semantic/flag.min.css', true)
            ->addCss('css/vendor/semantic/image.min.css', true)
            ->addCss('css/vendor/semantic/input.min.css', true)
            ->addCss('css/vendor/semantic/message.min.css', true)
            ->addCss('css/vendor/semantic/segment.min.css', true)
            ->addCss('css/vendor/semantic/site.min.css', true)
            ->addCss('css/vendor/semantic/reset.min.css', true)
            ->addCss('css/vendor/semantic/transition.min.css', true)
            ->addCss('css/vendor/semantic/dropdown.min.css', true);

        $this->headerCollectionJS
            ->addJs('js/pbx/main/header.js', true)
            ->addJs('js/vendor/jquery.min.js', true);

        $this->footerCollectionJS
            ->addJs('js/pbx/main/language-select.js', true);

        $this->semanticCollectionJS
            ->addJs('js/vendor/semantic/form.min.js', true)
            ->addJs('js/vendor/semantic/api.min.js', true)
            ->addJs('js/vendor/semantic/site.min.js', true)
            ->addJs('js/vendor/semantic/popup.min.js', true)
            ->addJs('js/vendor/semantic/dropdown.min.js', true)
            ->addJs('js/vendor/semantic/transition.min.js', true);

        // Если пользователь залогинился, сформируем необходимые CSS кеши
        if ($session && $session->has('auth')) {
            $this->semanticCollectionCSS
                ->addCss('css/vendor/semantic/menu.min.css', true)
                ->addCss('css/vendor/semantic/sidebar.min.css', true)
                ->addCss('css/vendor/semantic/table.min.css', true)
                ->addCss('css/vendor/semantic/loader.min.css', true)
                ->addCss('css/vendor/semantic/label.min.css', true)
                ->addCss('css/vendor/semantic/dimmer.min.css', true)
                ->addCss('css/vendor/semantic/accordion.min.css', true)
                ->addCss('css/vendor/semantic/placeholder.min.css', true)
                ->addCss('css/vendor/semantic/item.min.css', true)
                ->addCss('css/vendor/semantic/tab.min.css', true)
                ->addCss('css/vendor/semantic/checkbox.min.css', true)
                ->addCss('css/vendor/semantic/popup.min.css', true)
                ->addCss('css/vendor/semantic/toast.min.css', true);

            $this->semanticCollectionJS
                ->addJs('js/vendor/semantic/accordion.min.js', true)
                ->addJs('js/vendor/semantic/dimmer.min.js', true)
                ->addJs('js/vendor/semantic/sidebar.min.js', true)
                ->addJs('js/vendor/semantic/checkbox.min.js', true)
                ->addJs('js/vendor/semantic/toast.min.js', true)
                ->addJs('js/vendor/semantic/tab.min.js', true);

            $this->footerCollectionJS
                ->addJs(
                    'js/pbx/main/config.js',
                    true
                )
                ->addJs(
                    'js/pbx/main/pbxapi.js',
                    true
                )
                ->addJs(
                    'js/pbx/main/connection-check-worker.js',
                    true
                )
                ->addJs(
                    'js/pbx/main/semantic-localization.js',
                    true
                )
                ->addJs(
                    'js/pbx/Advices/advices-worker.js',
                    true
                )
                ->addJs(
                    'js/pbx/SendMetrics/send-metrics-index.js',
                    true
                )
                ->addJs(
                    'js/pbx/main/ssh-console.js',
                    true
                )
                ->addJs(
                    'js/pbx/main/delete-something.js',
                    true
                )
                ->addJs(
                    'js/pbx/main/user-message.js',
                    true
                )
                ->addJs(
                    'js/pbx/Extensions/extensions.js',
                    true
                )
                ->addJs(
                    'js/pbx/PbxExtensionModules/pbx-extension-menu-addition.js',
                    true
                )
                ->addJs(
                    'js/pbx/TopMenuSearch/top-menu-search.js',
                    true
                );

            if ($moduleName === 'PBXExtension') {
                $this->footerCollectionJS->addJs(
                    'js/pbx/PbxExtensionModules/pbx-extension-module-status.js',
                    true
                );
            }
        }
    }

    /**
     * Makes footer assets
     */
    private function makeFooterAssets(): void
    {
        $this->headerCollectionCSS
            ->addCss('css/custom.css', true);

        $this->footerCollectionJS->addJs(
            'js/pbx/main/footer.js',
            true
        );
    }

    /**
     * Makes Language cache for browser JS scripts
     *
     * @param \Phalcon\Di\DiInterface $di
     * @param string                  $version
     */
    private function makeLocalizationAssets(DiInterface $di, string $version): void
    {
        $language   = $di->getShared('language');
        $langJSFile = "js/cache/localization-{$language}-{$version}.min.js";
        if ( ! file_exists($langJSFile)) {
            $arrStr = [];
            foreach ($di->getShared('messages') as $key => $value) {
                $arrStr[$key] = str_replace(
                    "'",
                    "\\'",
                    str_replace(["\n", '  '], '', $value)
                );
            }

            $fileName    = "{$this->jsCacheDir}/localization-{$language}-{$version}.min.js";
            $scriptArray = json_encode($arrStr);
            file_put_contents($fileName, "globalTranslate = {$scriptArray}");
        }


        $this->footerCollectionLoc->addJs($langJSFile, true);
    }

    /**
     * Makes caches and versioned links for scripts and styles
     *
     * @param        $controller
     * @param string $action
     * @param string $version
     */
    private function generateFilesAndLinks($controller, string $action, string $version): void
    {
        $resultCombinedName = Text::uncamelize(ucfirst($controller) . ucfirst($action), '-');
        $resultCombinedName = strlen($resultCombinedName) !== '' ? $resultCombinedName . '-' : '';


        foreach ($this->headerCollectionJS as $resource) {
            $resource->setPath($resource->getPath() . '?v=' . $version);
        }
        foreach ($this->footerCollectionJS as $resource) {
            $resource->setPath($resource->getPath() . '?v=' . $version);
        }
        foreach ($this->semanticCollectionJS as $resource) {
            $resource->setPath($resource->getPath() . '?v=' . $version);
        }
        foreach ($this->semanticCollectionCSS as $resource) {
            $resource->setPath($resource->getPath() . '?v=' . $version);
        }
        foreach ($this->footerCollectionACE as $resource) {
            $resource->setPath($resource->getPath() . '?v=' . $version);
        }


        $this->headerCollectionCSS->join(true);
        $this->headerCollectionCSS->setTargetPath("{$this->cssCacheDir}/{$resultCombinedName}header.min.css");
        $this->headerCollectionCSS->setTargetUri("css/cache/{$resultCombinedName}header.min.css?v={$version}");


        $this->headerCollectionJSForExtensions->join(true);
        $this->headerCollectionJSForExtensions->setTargetPath("{$this->jsCacheDir}/{$resultCombinedName}header.min.js");
        $this->headerCollectionJSForExtensions->setTargetUri(
            "js/cache/{$resultCombinedName}header.min.js?v={$version}"
        );


        $this->footerCollectionJSForExtensions->join(true);
        $this->footerCollectionJSForExtensions->setTargetPath("{$this->jsCacheDir}/{$resultCombinedName}footer.min.js");
        $this->footerCollectionJSForExtensions->setTargetUri(
            "js/cache/{$resultCombinedName}footer.min.js?v={$version}"
        );
    }

    /**
     * Makes assets for the CallQueues controller
     *
     * @param string $action
     */
    private function makeCallQueuesAssets(string $action)
    {
        if ($action === 'index') {
            $this->headerCollectionCSS
                ->addCss('css/vendor/datatable/dataTables.semanticui.css', true);
            $this->footerCollectionJS
                ->addJs('js/vendor/datatable/dataTables.semanticui.js', true)
                ->addJs('js/pbx/CallQueues/callqueues-index.js', true);
        } elseif ($action === 'modify') {
            $this->footerCollectionJS
                ->addJs('js/vendor/jquery.debounce-1.0.5.js', true)
                ->addJs('js/vendor/jquery.tablednd.js', true)
                ->addJs('js/pbx/main/form.js', true)
                ->addJs('js/pbx/CallQueues/callqueue-modify.js', true)
                ->addJs('js/pbx/SoundFiles/one-button-sound-player.js', true);
        }
    }

    /**
     * Makes assets for the ConferenceRooms controller
     *
     * @param string $action
     */
    private function makeConferenceRoomsAssets(string $action)
    {
        if ($action === 'index') {
            $this->footerCollectionJS
                ->addJs('js/pbx/ConferenceRooms/conference-rooms-index.js', true);
        } elseif ($action === 'modify') {
            $this->footerCollectionJS
                ->addJs('js/pbx/main/form.js', true)
                ->addJs('js/pbx/ConferenceRooms/conference-room-modify.js', true);
        }
    }

    /**
     * Makes assets for the SystemDiagnostic controller
     *
     * @param string $action
     */
    private function makeSystemDiagnosticAssets(string $action): void
    {
        if ($action === 'index') {
            $this->footerCollectionJS
                ->addJs('js/vendor/semantic/popup.min.js', true)
                ->addJs('js/vendor/semantic/dropdown.min.js', true)
                ->addJs('js/pbx/main/form.js', true)
                ->addJs('js/pbx/SystemDiagnostic/system-diagnostic-index.js', true)
                ->addJs('js/pbx/SystemDiagnostic/system-diagnostic-index-showlogs.js', true)
                ->addJs('js/pbx/SystemDiagnostic/system-diagnostic-index-sysinfo.js', true)
                ->addJs('js/pbx/SystemDiagnostic/system-diagnostic-index-logcapture.js', true);
            $this->footerCollectionACE
                ->addJs('js/vendor/ace/ace.js', true)
                ->addJs('js/vendor/ace/mode-julia.js', true);
        }
    }

    /**
     * Makes assets for the SoundFiles controller
     *
     * @param string $action
     */
    private function makeSoundFilesAssets(string $action): void
    {
        if ($action === 'index') {
            $this->headerCollectionCSS
                ->addCss('css/vendor/range/range.css')
                ->addCss(
                    'css/vendor/datatable/dataTables.semanticui.css',
                    true
                );
            $this->footerCollectionJS->addJs('js/vendor/datatable/dataTables.semanticui.js', true)
                ->addJs('js/vendor/range/range.min.js', true)
                ->addJs('js/vendor/jquery.address.min.js', true)
                ->addJs('js/pbx/SoundFiles/sound-files-index-player.js', true)
                ->addJs('js/pbx/SoundFiles/sound-files-index.js', true);
        } elseif ($action === 'modify') {
            $this->headerCollectionCSS->addCss('css/vendor/range/range.css');

            $this->headerCollectionJS
                ->addJs(
                    'js/vendor/webrtc/MediaStreamRecorder.min.js',
                    true
                )
                ->addJs('js/vendor/webrtc/adapter-latest.min.js', true);

            $this->footerCollectionJS
                ->addJs('js/vendor/range/range.min.js', true)
                ->addJs('js/pbx/main/form.js', true)
                ->addJs('js/vendor/resumable.js', true)
                ->addJs('js/pbx/SoundFiles/sound-file-modify-player.js', true)
                ->addJs('js/pbx/SoundFiles/sound-file-modify-upload-worker.js', true)
                ->addJs('js/pbx/SoundFiles/sound-file-modify-webkit-recorder.js', true)
                ->addJs('js/pbx/SoundFiles/sound-file-modify.js', true);
        }
    }

    /**
     * Makes assets for the TimeSettings controller
     *
     * @param string $action
     */
    private function makeTimeSettingsAssets(string $action): void
    {
        if ($action === 'modify') {
            $this->footerCollectionJS
                ->addJs('js/pbx/main/form.js', true)
                ->addJs('js/pbx/TimeSettings/time-settings-worker.js', true)
                ->addJs('js/pbx/TimeSettings/time-settings-modify.js', true);
        }
    }

    /**
     * Makes assets for the Update controller
     *
     * @param string $action
     */
    private function makeUpdateAssets(string $action): void
    {
        if ($action === 'index') {
            $this->footerCollectionJS
                ->addJs('js/pbx/main/form.js', true)
                ->addJs('js/vendor/resumable.js', true)
                ->addJs('js/vendor/showdown/showdown.min.js', true)
                ->addJs('js/pbx/Update/update-index.js', true);
            $this->semanticCollectionCSS
                ->addCss('css/vendor/semantic/progress.min.css', true)
                ->addCss('css/vendor/semantic/modal.min.css', true);

            $this->semanticCollectionJS
                ->addJs('js/vendor/semantic/progress.min.js', true)
                ->addJs('js/vendor/semantic/modal.min.js', true);
        }
    }

    /**
     * Makes assets for the Session controller
     *
     * @param string $action
     */
    private function makeSessionAssets(string $action): void
    {
        if ($action === 'index') {
            $this->footerCollectionJS
                ->addJs('js/pbx/main/form.js', true)
                ->addJs('js/pbx/Session/login-form.js', true);
        }
    }

    /**
     * Makes assets for the Restart controller
     *
     * @param string $action
     */
    private function makeRestartAssets(string $action): void
    {
        if ($action === 'index') {
            $this->footerCollectionJS
                ->addJs('js/pbx/Restart/restart-index.js', true);
        }
    }

    /**
     * Makes assets for the Providers controller
     *
     * @param string $action
     */
    private function makeProvidersAssets(string $action): void
    {
        if ($action === 'index') {
            $this->semanticCollectionCSS
                ->addCss('css/vendor/datatable/dataTables.semanticui.css', true)
                ->addCss('css/vendor/semantic/modal.min.css', true);

            $this->semanticCollectionJS
                ->addJs('js/vendor/semantic/modal.min.js', true);
            $this->footerCollectionJS
                ->addJs('js/pbx/main/debugger-info.js', true)
                ->addJs('js/vendor/datatable/dataTables.semanticui.js', true)
                ->addJs('js/pbx/Providers/providers-index.js', true);
        } elseif ($action === 'modifysip' || $action === 'modifyiax') {
            $this->footerCollectionJS
                ->addJs('js/pbx/main/form.js', true)
                ->addJs('js/pbx/main/debugger-info.js', true)
                ->addJs('js/pbx/Providers/provider-modify.js', true);
        }
    }

    /**
     *  Makes assets for the PbxExtensionModules controller
     *
     * @param string $action
     */
    private function makePbxExtensionModulesAssets(string $action): void
    {
        if ($action === 'index') {
            $this->semanticCollectionJS->addJs('js/vendor/semantic/modal.min.js', true);
            $this->footerCollectionJS
                ->addJs('js/pbx/Update/update-api.js', true)
                ->addJs('js/vendor/datatable/dataTables.semanticui.js', true)
                ->addJs('js/vendor/resumable.js', true)
                ->addJs(
                    'js/pbx/PbxExtensionModules/pbx-extension-module-upgrade-status-worker.js',
                    true
                )
                ->addJs('js/pbx/PbxExtensionModules/pbx-extension-module-status.js', true)
                ->addJs('js/pbx/PbxExtensionModules/pbx-extension-modules-index.js', true)
                ->addJs('js/vendor/semantic/progress.min.js', true)
                ->addJs('js/pbx/PbxExtensionModules/pbx-extension-module-add-new.js', true);
            $this->semanticCollectionCSS
                ->addCss('css/vendor/datatable/dataTables.semanticui.min.css', true)
                ->addCss('css/vendor/semantic/modal.min.css', true)
                ->addCss('css/vendor/semantic/progress.min.css', true);
        } elseif ($action === 'modify') {
            $this->footerCollectionJS
                ->addJs('js/pbx/main/form.js', true)
                ->addJs('js/pbx/PbxExtensionModules/pbx-extension-module-modify.js', true);
        }
    }

    /**
     * Makes assets for the OutOffWorkTime controller
     *
     * @param string $action
     */
    private function makeOutOffWorkTimeAssets(string $action): void
    {
        if ($action === 'index') {
            $this->footerCollectionJS
                ->addJs('js/pbx/OutOffWorkTime/out-of-work-times-index.js', true);
        } elseif ($action === 'modify') {
            $this->semanticCollectionCSS->addCss('css/vendor/semantic/calendar.min.css', true);
            $this->semanticCollectionJS->addJs('js/vendor/semantic/calendar.min.js', true);
            $this->footerCollectionJS
                ->addJs('js/pbx/main/form.js', true)
                ->addJs('js/pbx/OutOffWorkTime/out-of-work-time-modify.js', true)
                ->addJs('js/pbx/SoundFiles/one-button-sound-player.js', true);
        }
    }

    /**
     * Makes assets for the OutboundRoutes controller
     *
     * @param string $action
     */
    private function makeOutboundRoutesAssets(string $action): void
    {
        if ($action === 'index') {
            $this->footerCollectionJS
                ->addJs('js/vendor/jquery.tablednd.min.js', true)
                ->addJs('js/pbx/OutboundRoutes/outbound-routes-index.js', true);
        } elseif ($action === 'modify') {
            $this->footerCollectionJS->addJs('js/pbx/main/form.js', true)
                ->addJs('js/pbx/OutboundRoutes/outbound-route-modify.js', true);
        }
    }

    /**
     * Makes assets for the Network controller
     *
     * @param string $action
     */
    private function makeNetworkAssets(string $action): void
    {
        if ($action === 'modify') {
            $this->footerCollectionJS
                ->addJs('js/vendor/inputmask/inputmask.js', true)
                ->addJs('js/vendor/inputmask/jquery.inputmask.js', true)
                ->addJs('js/vendor/inputmask/bindings/inputmask.binding.js', true)
                ->addJs('js/vendor/inputmask/init.js', true)
                ->addJs('js/pbx/main/form.js', true)
                ->addJs('js/pbx/Network/network-modify.js', true);
        }
    }

    /**
     * Makes assets for the MailSettings controller
     *
     * @param string $action
     */
    private function makeMailSettingsAssets(string $action): void
    {
        if ($action === 'modify') {
            $this->footerCollectionJS
                ->addJs('js/pbx/main/form.js', true)
                ->addJs('js/pbx/MailSettings/mail-settings-modify.js', true);
        }
    }

    /**
     * Makes assets for the Licensing controller
     *
     * @param string $action
     */
    private function makeLicensingAssets(string $action): void
    {
        if ($action === 'modify') {
            $this->footerCollectionJS
                ->addJs('js/vendor/inputmask/inputmask.js', true)
                ->addJs('js/vendor/inputmask/jquery.inputmask.js', true)
                ->addJs('js/vendor/inputmask/bindings/inputmask.binding.js', true)
                ->addJs('js/vendor/inputmask/init.js', true)
                ->addJs('js/pbx/main/form.js', true)
                ->addJs('js/pbx/Licensing/licensing-modify.js', true);
        }
    }

    /**
     * Makes assets for the IvrMenu controller
     *
     * @param string $action
     */
    private function makeIvrMenuAssets(string $action): void
    {
        if ($action === 'index') {
            $this->headerCollectionCSS
                ->addCss('css/vendor/datatable/dataTables.semanticui.css', true);
            $this->footerCollectionJS
                ->addJs('js/vendor/datatable/dataTables.semanticui.js', true)
                ->addJs('js/pbx/IvrMenu/ivrmenu-index.js', true);
        } elseif ($action === 'modify') {
            $this->footerCollectionJS->addJs('js/pbx/main/form.js', true)
                ->addJs('js/pbx/SoundFiles/one-button-sound-player.js', true)
                ->addJs('js/pbx/IvrMenu/ivrmenu-modify.js', true);
        }
    }

    /**
     * Makes assets for the IncomingRoutes controller
     *
     * @param string $action
     */
    private function makeIncomingRoutesAssets(string $action): void
    {
        if ($action === 'index') {
            $this->footerCollectionJS->addJs('js/vendor/jquery.tablednd.js', true)
                ->addJs('js/pbx/main/form.js', true)
                ->addJs('js/pbx/IncomingRoutes/incoming-route-index.js', true);
        } elseif ($action === 'modify') {
            $this->footerCollectionJS->addJs('js/pbx/main/form.js', true)
                ->addJs('js/pbx/IncomingRoutes/incoming-route-modify.js', true);
        }
    }

    /**
     * Makes assets for the GeneralSettings controller
     *
     * @param string $action
     */
    private function makeGeneralSettingsAssets(string $action): void
    {
        if ($action === 'modify') {
            $this->semanticCollectionCSS->addCss('css/vendor/semantic/progress.min.css', true);
            $this->semanticCollectionJS->addJs('js/vendor/semantic/progress.min.js', true);
            $this->footerCollectionJS
                ->addJs('js/vendor/jquery.address.min.js', true)
                ->addJs('js/vendor/jquery.tablednd.js', true)
                ->addJs('js/pbx/main/form.js', true)
                ->addJs('js/pbx/main/password-score.js', true)
                ->addJs(
                    'js/pbx/GeneralSettings/general-settings-modify.js',
                    true
                );
        }
    }

    /**
     * Makes assets for the Firewall controller
     *
     * @param string $action
     */
    private function makeFirewallAssets(string $action): void
    {
        if ($action === 'index') {
            $this->footerCollectionJS
                ->addJs('js/pbx/Firewall/firewall-index.js', true);
        } elseif ($action === 'modify') {
            $this->footerCollectionJS
                ->addJs('js/pbx/main/form.js', true)
                ->addJs('js/pbx/Firewall/firewall-modify.js', true);
        }
    }

    /**
     * Makes assets for the Fail2Ban controller
     *
     * @param string $action
     */
    private function makeFail2BanAssets(string $action): void
    {
        if ($action === 'index') {
            $this->footerCollectionJS
                ->addJs('js/pbx/main/form.js', true)
                ->addJs('js/pbx/Fail2Ban/fail-to-ban-index.js', true);
        }
    }

    /**
     * Makes assets for the Extensions controller
     *
     * @param string $action
     */
    private function makeExtensionsAssets(string $action): void
    {
        if ($action === 'index') {
            $this->headerCollectionCSS->addCss('css/vendor/datatable/dataTables.semanticui.min.css', true);

            $this->footerCollectionJS
                ->addJs('js/vendor/datatable/dataTables.semanticui.js', true)
                ->addJs('js/vendor/inputmask/inputmask.js', true)
                ->addJs('js/vendor/inputmask/jquery.inputmask.js', true)
                ->addJs('js/vendor/inputmask/jquery.inputmask-multi.js', true)
                ->addJs('js/vendor/inputmask/bindings/inputmask.binding.js', true)
                ->addJs('js/vendor/inputmask/init.js', true)
                ->addJs('js/pbx/Extensions/input-mask-patterns.js', true)
                ->addJs('js/pbx/Extensions/extensions-index.js', true)
                ->addJs('js/pbx/main/debugger-info.js', true)
                ->addJs('js/vendor/clipboard/clipboard.js', true);
        } elseif ($action === 'modify') {
            $this->semanticCollectionCSS->addCss('css/vendor/semantic/card.min.css', true);
            $this->footerCollectionJS
                ->addJs('js/vendor/inputmask/inputmask.js', true)
                ->addJs('js/vendor/inputmask/jquery.inputmask.js', true)
                ->addJs('js/vendor/inputmask/jquery.inputmask-multi.js', true)
                ->addJs('js/vendor/inputmask/bindings/inputmask.binding.js', true)
                ->addJs('js/vendor/inputmask/init.js', true)
                ->addJs('js/pbx/Extensions/input-mask-patterns.js', true)
                ->addJs('js/pbx/main/form.js', true)
                ->addJs('js/pbx/main/debugger-info.js', true)
                ->addJs('js/pbx/Extensions/extension-modify.js', true);
        }
    }

    /**
     *  Makes assets for the DialplanApplications controller
     *
     * @param string $action
     */
    private function makeDialplanApplicationsAssets(string $action): void
    {
        if ($action === 'index') {
            $this->headerCollectionCSS
                ->addCss('css/vendor/datatable/dataTables.semanticui.css', true);
            $this->footerCollectionJS
                ->addJs('js/vendor/datatable/dataTables.semanticui.js', true)
                ->addJs('js/pbx/DialplanApplications/dialplan-applications-index.js', true);
        } elseif ($action === 'modify') {
            $this->footerCollectionACE
                ->addJs('js/vendor/ace/ace.js', true)
                ->addJs('js/vendor/ace/mode-php.js', true)
                ->addJs('js/vendor/ace/mode-julia.js', true);
            $this->footerCollectionJS
                ->addJs('js/pbx/main/form.js', true)
                ->addJs('js/pbx/DialplanApplications/dialplan-applications-modify.js', true);
        }
    }

    /**
     * Makes assets for the CustomFiles controller
     *
     * @param string $action
     */
    private function makeCustomFilesAssets(string $action): void
    {
        if ($action === 'index') {
            $this->headerCollectionCSS
                ->addCss('css/vendor/datatable/dataTables.semanticui.css', true);
            $this->footerCollectionJS
                ->addJs('js/vendor/datatable/dataTables.semanticui.js', true)
                ->addJs('js/pbx/CustomFiles/custom-files-index.js', true);
        } elseif ($action === 'modify') {
            $this->footerCollectionJS
                ->addJs('js/pbx/main/form.js', true)
                ->addJs('js/pbx/CustomFiles/custom-files-modify.js', true);
            $this->footerCollectionACE
                ->addJs('js/vendor/ace/ace.js', true)
                ->addJs('js/vendor/ace/mode-julia.js', true);
        }
    }

    /**
     * Makes assets for the CallDetailRecords controller
     *
     * @param string $action
     */
    private function makeCallDetailRecordsAssets(string $action): void
    {
        if ($action === 'index') {
            $this->semanticCollectionJS->addJs('js/vendor/semantic/progress.min.js', true);

            $this->semanticCollectionCSS
                ->addCss('css/vendor/range/range.min.css', true)
                ->addCss('css/vendor/datatable/scroller.dataTables.min.css', true)
                ->addCss('css/vendor/datepicker/daterangepicker.css', true)
                ->addCss('css/vendor/datatable/dataTables.semanticui.min.css', true);

            $this->semanticCollectionJS
                ->addJs('js/vendor/datatable/dataTables.semanticui.js', true)
                ->addJs('js/vendor/datatable/dataTables.scroller.min.js', true)
                ->addJs('js/vendor/datatable/scroller.semanticui.js', true)
                //->addJs('js/vendor/datatable/dataTables.pageResize.min.js', TRUE)
                ->addJs('js/vendor/range/range.min.js', true)
                ->addJS('js/vendor/datepicker/moment.min.js', true)
                ->addJS('js/vendor/datepicker/daterangepicker.js', true);

            $this->footerCollectionJS
                ->addJs(
                    'js/pbx/CallDetailRecords/call-detail-records-index.js',
                    true
                );
        }
    }

    /**
     * Makes assets for the AsteriskManagers controller
     *
     * @param string $action
     */
    private function makeAsteriskManagersAssets(string $action): void
    {
        if ($action === 'index') {
            $this->footerCollectionJS->addJs('js/pbx/AsteriskManagers/managers-index.js', true);
        } elseif ($action === 'modify') {
            $this->footerCollectionJS
                ->addJs('js/pbx/main/form.js', true)
                ->addJs('js/pbx/AsteriskManagers/manager-modify.js', true);
        }
    }


}