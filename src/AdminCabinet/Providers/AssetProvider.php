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

namespace MikoPBX\AdminCabinet\Providers;

use MikoPBX\AdminCabinet\Controllers\SessionController;
use MikoPBX\AdminCabinet\Plugins\AssetManager as Manager;
use MikoPBX\Common\Providers\LanguageProvider;
use MikoPBX\Common\Providers\MessagesProvider;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Common\Providers\SessionProvider;
use MikoPBX\Core\System\Configs\SentryConf;
use MikoPBX\Core\System\Network;
use MikoPBX\Modules\Config\WebUIConfigInterface;
use Phalcon\Assets\Collection;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use Phalcon\Mvc\Dispatcher;
use function MikoPBX\Common\Config\appPath;

/**
 * Prepares list of CSS and JS files according to called controller/action
 *
 * @package MikoPBX\AdminCabinet\Providers
 */
class AssetProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'assets';

    public const HEADER_JS = 'headerJS';
    public const HEADER_CSS = 'headerCSS';
    public const HEADER_PBX_JS = 'headerPBXJS';
    public const HEADER_SENTRY_JS = 'headerSentryJS';
    public const SEMANTIC_UI_CSS = 'SemanticUICSS';
    public const SEMANTIC_UI_JS = 'SemanticUIJS';
    public const FOOTER_ACE = 'footerACE';
    public const FOOTER_LOC = 'footerLoc';
    public const FOOTER_JS = 'footerJS';
    public const FOOTER_PBX_JS = 'footerPBXJS';

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
    private string $jsCacheDir;
    private Manager $manager;

    /**
     * Registers assets service provider
     *
     * @param DiInterface $di The DI container.
     */
    public function register(DiInterface $di): void
    {
        $di->set(
            self::SERVICE_NAME,
            function () use ($di) {

                $session = $di->get(SessionProvider::SERVICE_NAME);

                $assets = new AssetProvider();

                // Module and PBX version caching for proper PBX operation when installing modules.
                $version = PBXConfModulesProvider::getVersionsHash();
                $assets->initializeClassVariables($version);
                $dispatcher = $di->get(DispatcherProvider::SERVICE_NAME);
                $controller = $dispatcher->getControllerName();
                $action = $dispatcher->getActionName();

                if ($action === null) {
                    $action = 'index';
                }

                $assets->makeSentryAssets();
                $assets->makeHeaderAssets($session, $dispatcher);

                // Generates Controllers assets
                $method_name = "make{$controller}Assets";
                if (method_exists($assets, $method_name)) {
                    $assets->$method_name($action);
                }

                $assets->makeFooterAssets();
                $assets->makeLocalizationAssets($di, $version);

                $assetsManager = $assets->manager;

                // Register additional assets from external enabled modules
                PBXConfModulesProvider::hookModulesMethod(WebUIConfigInterface::ON_AFTER_ASSETS_PREPARED, [$assetsManager, $dispatcher]);

                return $assetsManager;
            }
        );
    }

    /**
     * Initialize class variables
     */
    public function initializeClassVariables(string $version)
    {
        $this->manager = new Manager();
        $this->manager->setVersion($version);

        $this->jsCacheDir = appPath('sites/admin-cabinet/assets/js/cache');

        $this->headerCollectionJSForExtensions = $this->manager->collection(self::HEADER_JS);
        $this->headerCollectionJSForExtensions->setPrefix('assets/');

        $this->footerCollectionJSForExtensions = $this->manager->collection(self::FOOTER_JS);
        $this->footerCollectionJSForExtensions->setPrefix('assets/');
        $this->headerCollectionJS = $this->manager->collection(self::HEADER_PBX_JS);
        $this->headerCollectionJS->setPrefix('assets/');
        $this->headerCollectionCSS = $this->manager->collection(self::HEADER_CSS);
        $this->headerCollectionCSS->setPrefix('assets/');
        $this->footerCollectionJS = $this->manager->collection(self::FOOTER_PBX_JS);
        $this->footerCollectionJS->setPrefix('assets/');
        $this->headerCollectionSentryJS = $this->manager->collection(self::HEADER_SENTRY_JS);
        $this->semanticCollectionCSS = $this->manager->collection(self::SEMANTIC_UI_CSS);
        $this->semanticCollectionCSS->setPrefix('assets/');
        $this->semanticCollectionJS = $this->manager->collection(self::SEMANTIC_UI_JS);
        $this->semanticCollectionJS->setPrefix('assets/');
        $this->footerCollectionACE = $this->manager->collection(self::FOOTER_ACE);
        $this->footerCollectionACE->setPrefix('assets/');
        $this->footerCollectionLoc = $this->manager->collection(self::FOOTER_LOC);
        $this->footerCollectionLoc->setPrefix('assets/');
    }

    /**
     * Makes assets for the Sentry error logger
     *
     */
    private function makeSentryAssets(): void
    {
        if (file_exists(SentryConf::CONF_FILE) && file_exists(Network::INTERNET_FLAG_FILE)){
            $this->headerCollectionSentryJS->addjs(
                'assets/js/vendor/sentry/bundle.min.js',
                true
            );
            $this->headerCollectionSentryJS->addJs(
                "assets/js/pbx/main/sentry-error-logger.js",
                true
            );
        }
    }

    /**
     * Makes assets for all controllers. Base set of scripts and styles
     *
     * @param $session
     * @param Dispatcher $dispatcher
     */
    private function makeHeaderAssets($session, Dispatcher $dispatcher): void
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
            ->addCss('css/vendor/semantic/dropdown.min.css', true)
            ->addCss('css/vendor/semantic/checkbox.min.css', true);

        $this->headerCollectionJS
            //->addJs('js/vendor/requirejs.org/require.min.js', true,true,['data-main'=>'/admin-cabinet/assets/js/pbx/main/header.js'])
            ->addJs('js/pbx/main/header.js', true)
            ->addJs('js/vendor/jquery.min.js', true);

        $this->footerCollectionJS
            ->addJs('js/pbx/Language/language-select.js', true);

        $this->semanticCollectionJS
            ->addJs('js/vendor/semantic/form.min.js', true)
            ->addJs('js/vendor/semantic/api.min.js', true)
            ->addJs('js/vendor/semantic/site.min.js', true)
            ->addJs('js/vendor/semantic/popup.min.js', true)
            ->addJs('js/vendor/semantic/dropdown.min.js', true)
            ->addJs('js/vendor/semantic/transition.min.js', true)
            ->addJs('js/vendor/semantic/checkbox.min.js', true);

        // If the user is logged in, let's generate the required CSS caches.
        if ($session->has(SessionController::SESSION_ID)) {
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
                ->addCss('css/vendor/semantic/popup.min.css', true)
                ->addCss('css/vendor/semantic/toast.min.css', true);

            $this->semanticCollectionJS
                ->addJs('js/vendor/semantic/accordion.min.js', true)
                ->addJs('js/vendor/semantic/dimmer.min.js', true)
                ->addJs('js/vendor/semantic/sidebar.min.js', true)
                ->addJs('js/vendor/semantic/toast.min.js', true)
                ->addJs('js/vendor/semantic/tab.min.js', true);

            $this->footerCollectionJS
                ->addJs('js/pbx/main/config.js', true)
                ->addJs('js/pbx/PbxAPI/pbxapi.js', true)
                ->addJs('js/pbx/PbxAPI/extensionsAPI.js', true)
                ->addJs('js/pbx/main/connection-check-worker.js', true)
                ->addJs('js/pbx/main/semantic-localization.js', true)
                ->addJs('js/pbx/Advice/advice-worker.js', true)
                ->addJs('js/pbx/Security/check-passwords.js', true)
                ->addJs('js/pbx/SendMetrics/send-metrics-index.js', true)
                ->addJs('js/pbx/main/ssh-console.js', true)
                ->addJs('js/pbx/main/delete-something.js', true)
                ->addJs('js/pbx/main/user-message.js', true)
                ->addJs('js/pbx/main/sidebar-menu-show-active.js', true)
                ->addJs('js/pbx/TopMenuSearch/top-menu-search.js', true)
                ->addJs('js/pbx/WikiLinksReplacement/wiki-links-replacement-worker.js', true);

            // We can disable module status toggle from module controller, using the showModuleStatusToggle variable
            $isExternalModulePage = str_starts_with($dispatcher->getNamespaceName(), 'Modules');

            if ($isExternalModulePage) {
                $currentControllerObject = $dispatcher->getActiveController();
                $showModuleStatusToggle = property_exists($currentControllerObject, 'showModuleStatusToggle')
                    ? $currentControllerObject->showModuleStatusToggle
                    : true;

                if ($showModuleStatusToggle) {
                    $this->footerCollectionJS->addJs('js/pbx/PbxExtensionModules/pbx-extension-module-status.js', true);
                }
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
     * @param DiInterface $di The DI container.
     * @param string $version
     */
    private function makeLocalizationAssets(DiInterface $di, string $version): void
    {
        $language = $di->getShared(LanguageProvider::SERVICE_NAME);
        $fileName = "{$this->jsCacheDir}/localization-{$language}-{$version}.min.js";
        if (!file_exists($fileName)) {
            $arrStr = [];
            foreach ($di->getShared(MessagesProvider::SERVICE_NAME) as $key => $value) {
                $arrStr[$key] = str_replace(
                    "'",
                    "\\'",
                    str_replace(["\n", '  '], '', $value)
                );
            }
            $scriptArray = json_encode($arrStr);
            $proxyCode = "
                const globalTranslateArray = {$scriptArray};
                
                globalTranslate = new Proxy(globalTranslateArray, {
                    get: function(target, prop, receiver) {
                    // Check if the property exists in the target
                    if (prop in target) {
                        return target[prop];
                    }
                    // Return the key itself if no translation is found
                    return prop;
                    }
                });
                ";
            file_put_contents($fileName, $proxyCode);
        }

        $langJSFile = "js/cache/localization-{$language}-{$version}.min.js";
        $this->footerCollectionLoc->addJs($langJSFile, true);
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
                ->addJs('js/pbx/PbxAPI/callQueuesAPI.js', true)
                ->addJs('js/pbx/CallQueues/callqueues-index.js', true);
        } elseif ($action === 'modify') {
            $this->footerCollectionJS
                ->addJs('js/vendor/jquery.debounce-1.0.5.js', true)
                ->addJs('js/vendor/jquery.tablednd.js', true)
                ->addJs('js/pbx/main/form.js', true)
                ->addJs('js/pbx/CallQueues/callqueue-modify.js', true)
                ->addJs('js/pbx/SoundFiles/sound-files-selector.js', true)
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
                ->addJs('js/pbx/PbxAPI/conferenceRoomsAPI.js', true)
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
                ->addJs('js/pbx/SystemDiagnostic/system-diagnostic-index-showlogs-worker.js', true)
                ->addJs('js/pbx/SystemDiagnostic/system-diagnostic-index-showlogs.js', true)
                ->addJs('js/pbx/SystemDiagnostic/system-diagnostic-index-sysinfo.js', true)
                ->addJs('js/pbx/SystemDiagnostic/system-diagnostic-index-logscapture-worker.js', true)
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
                ->addJs('js/vendor/moment/moment-with-locales.min.js', true)
                ->addJs('js/vendor/moment-timezone/moment-timezone-with-data.min.js', true)
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
                ->addJs('js/pbx/main/version-compare.js', true)
                ->addJs('js/pbx/main/form.js', true)
                ->addJs('js/vendor/resumable.js', true)
                ->addJs('js/vendor/showdown/showdown.min.js', true)
                ->addJs('js/pbx/Update/update-status-worker.js', true)
                ->addJs('js/pbx/Update/update-merging-worker.js', true)
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
        } elseif ($action === 'end') {
            $this->footerCollectionJS
                ->addJs('js/pbx/Session/session-end.js', true);
        }
    }

    /**
     * Makes assets for the Restart controller
     *
     * @param string $action
     */
    private function makeRestartAssets(string $action): void
    {
        if ($action === 'manage') {
            $this->footerCollectionJS
                ->addJs('js/pbx/Restart/restart-manage.js', true)
                ->addJs('js/pbx/Restart/current-calls-worker.js', true);
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
                ->addJs('js/pbx/Providers/providers-index.js', true)
                ->addJs('js/pbx/Providers/providers-status-worker.js', true);
        } elseif ($action === 'modifysip' || $action === 'modifyiax') {
            $this->footerCollectionJS
                ->addJs('js/pbx/main/form.js', true)
                ->addJs('js/pbx/main/debugger-info.js', true)
                ->addJs('js/vendor/clipboard/clipboard.js', true)
                ->addJs('js/pbx/Providers/provider-modify-status-worker.js', true)
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
        $this->semanticCollectionCSS->addCss('css/PbxExtensionModules/index.css', true);

        if ($action === 'index') {
            $this->semanticCollectionJS->addJs('js/vendor/semantic/modal.min.js', true);
            $this->footerCollectionJS
                ->addJs('js/vendor/datatable/dataTables.semanticui.js', true)
                ->addJs('js/vendor/resumable.js', true)
                ->addJs('js/vendor/jquery.address.min.js', true)
                ->addJs('js/vendor/semantic/progress.min.js', true)
                ->addJs('js/pbx/PbxExtensionModules/pbx-extension-module-status.js', true)
                ->addJs('js/pbx/PbxExtensionModules/pbx-extension-module-index.js', true)
                ->addJs('js/pbx/PbxExtensionModules/pbx-extension-module-detail.js', true)
                ->addJs('js/pbx/PbxExtensionModules/pbx-extension-module-delete.js', true)
                ->addJs('js/pbx/PbxExtensionModules/pbx-extension-module-install-status-worker.js', true)
                ->addJs('js/pbx/PbxExtensionModules/pbx-extension-module-install-from-repo.js', true)
                ->addJs('js/pbx/PbxExtensionModules/pbx-extension-module-install-from-zip.js', true)
                ->addJs('js/pbx/PbxExtensionModules/pbx-extension-module-ping-lic-worker.js', true)
                ->addJs('js/pbx/PbxExtensionModules/pbx-extension-module-marketplace.js', true)
                ->addJs('js/vendor/inputmask/jquery.inputmask.min.js', true)
                ->addJs('js/vendor/inputmask/bindings/inputmask.binding.js', true)
                ->addJs('js/vendor/inputmask/init.js', true)
                ->addJs('js/pbx/main/form.js', true)
                ->addJs('js/pbx/PbxExtensionModules/pbx-extension-module-keycheck.js', true);

            $this->semanticCollectionCSS
                ->addCss('css/vendor/datatable/dataTables.semanticui.min.css', true)
                ->addCss('css/vendor/semantic/modal.min.css', true)
                ->addCss('css/vendor/semantic/progress.min.css', true)
                ->addCss('css/PbxExtensionModules/slides.css', true);

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
            $this->headerCollectionCSS->addCss('css/vendor/datatable/dataTables.semanticui.min.css', true);
            $this->footerCollectionJS
                ->addJs('js/vendor/datatable/dataTables.semanticui.js', true)
                ->addJs('js/vendor/jquery.tablednd.js', true)
                ->addJs('js/pbx/OutOffWorkTime/out-of-work-times-index.js', true);
        } elseif ($action === 'modify') {
            $this->semanticCollectionCSS->addCss('css/vendor/semantic/calendar.min.css', true);
            $this->semanticCollectionJS->addJs('js/vendor/semantic/calendar.min.js', true);
            $this->footerCollectionJS
                ->addJs('js/pbx/main/form.js', true)
                ->addJs('js/pbx/OutOffWorkTime/out-of-work-time-modify.js', true)
                ->addJs('js/pbx/SoundFiles/sound-files-selector.js', true)
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
                //->addJs('js/vendor/inputmask/inputmask.js', true)
                ->addJs('js/vendor/inputmask/jquery.inputmask.min.js', true)
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
                ->addJs('js/pbx/PbxAPI/ivrMenuAPI.js', true)
                ->addJs('js/pbx/IvrMenu/ivrmenu-index.js', true);
        } elseif ($action === 'modify') {
            $this->footerCollectionJS->addJs('js/pbx/main/form.js', true)
                ->addJs('js/pbx/SoundFiles/sound-files-selector.js', true)
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
                ->addJs('js/pbx/SoundFiles/sound-files-selector.js', true)
                ->addJs('js/pbx/SoundFiles/one-button-sound-player.js', true)
                ->addJs('js/pbx/IncomingRoutes/incoming-route-index.js', true);
        } elseif ($action === 'modify') {
            $this->footerCollectionJS->addJs('js/pbx/main/form.js', true)
                ->addJs('js/pbx/SoundFiles/sound-files-selector.js', true)
                ->addJs('js/pbx/SoundFiles/one-button-sound-player.js', true)
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
            $this->semanticCollectionCSS
                ->addCss('css/vendor/semantic/slider.min.css', true)
                ->addCss('css/vendor/semantic/progress.min.css', true);
            $this->semanticCollectionJS
                ->addJs('js/vendor/semantic/slider.min.js', true)
                ->addJs('js/vendor/semantic/progress.min.js', true);

            $this->footerCollectionJS
                ->addJs('js/vendor/jquery.address.min.js', true)
                ->addJs('js/vendor/jquery.tablednd.js', true)
                ->addJs('js/pbx/SoundFiles/sound-files-selector.js', true)
                ->addJs('js/pbx/SoundFiles/one-button-sound-player.js', true)
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
            $this->headerCollectionCSS->addCss('css/vendor/datatable/dataTables.semanticui.min.css', true)
                ->addCss('css/vendor/datatable/responsive/responsive.semanticui.min.css', true);

            $this->footerCollectionJS
                ->addJs('js/vendor/datatable/dataTables.semanticui.js', true)
                ->addJs('js/vendor/datatable/responsive/dataTables.responsive.min.js', true)
                ->addJs('js/vendor/datatable/responsive/responsive.semanticui.min.js', true)
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
            $this->headerCollectionCSS
                ->addCss('css/vendor/datatable/dataTables.semanticui.min.css', true)
                ->addCss('css/vendor/datatable/responsive/responsive.semanticui.min.css', true);

            $this->footerCollectionJS
                ->addJs('js/vendor/datatable/dataTables.semanticui.js', true)
                ->addJs('js/vendor/datatable/responsive/dataTables.responsive.min.js', true)
                ->addJs('js/vendor/datatable/responsive/responsive.semanticui.min.js', true)
                ->addJs('js/vendor/inputmask/jquery.inputmask.min.js', true)
                ->addJs('js/vendor/inputmask/jquery.inputmask-multi.js', true)
                ->addJs('js/vendor/inputmask/bindings/inputmask.binding.js', true)
                ->addJs('js/vendor/inputmask/init.js', true)
                ->addJs('js/pbx/Extensions/input-mask-patterns.js', true)
                ->addJs('js/pbx/PbxAPI/sipAPI.js', true)
                ->addJs('js/pbx/Extensions/extensions-index.js', true)
                ->addJs('js/pbx/Extensions/extensions-index-status-worker.js', true)
                ->addJs('js/pbx/main/debugger-info.js', true);
        } elseif ($action === 'modify') {
            $this->semanticCollectionCSS->addCss('css/vendor/semantic/card.min.css', true);
            $this->footerCollectionJS
                //->addJs('js/vendor/inputmask/inputmask.js', true)
                ->addJs('js/vendor/inputmask/jquery.inputmask.min.js', true)
                ->addJs('js/vendor/inputmask/jquery.inputmask-multi.js', true)
                ->addJs('js/vendor/inputmask/bindings/inputmask.binding.js', true)
                ->addJs('js/vendor/inputmask/init.js', true)
                ->addJs('js/pbx/PbxAPI/usersAPI.js', true)
                ->addJs('js/pbx/Extensions/input-mask-patterns.js', true)
                ->addJs('js/pbx/main/form.js', true)
                ->addJs('js/pbx/main/debugger-info.js', true)
                ->addJs('js/pbx/Extensions/extension-modify-avatar.js', true)
                ->addJs('js/pbx/Extensions/extension-modify-status-worker.js', true)
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
                ->addJs('js/pbx/PbxAPI/dialplanApplicationsAPI.js', true)
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
                ->addJs('js/vendor/jquery.address.min.js', true)
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
                ->addJS('js/vendor/moment/moment.min.js', true)
                ->addJS('js/vendor/datepicker/daterangepicker.js', true);

            $this->footerCollectionJS
                ->addJs(
                    'js/pbx/CallDetailRecords/call-detail-records-player.js',
                    true
                )
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

            $this->semanticCollectionCSS->addCss('css/AsteriskManagers/manager-modify.css', true);
        }
    }

}