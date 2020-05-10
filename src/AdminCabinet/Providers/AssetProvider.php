<?php

declare(strict_types=1);
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */
namespace MikoPBX\AdminCabinet\Providers;

use Phalcon\Assets\Manager;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use Phalcon\Text;

class AssetProvider implements ServiceProviderInterface
{
    /**
     * Register dispatcher service provider
     *
     * @param \Phalcon\Di\DiInterface $di
     */
    public function register(DiInterface $di): void
    {
        $appConfig = $di->getShared('config')->get('adminApplication');

        $di->set(
            'assets',
            function () use ($appConfig) {
                $manager    = new Manager();
                $dispatcher = $this->get('dispatcher');
                $session    = $this->get('session');
                $controller = $dispatcher->getControllerName();
                $action     = $dispatcher->getActionName();
                if ($action === null) {
                    $action = 'index';
                }
                $headerCollectionJSForExtensions = $manager->collection('headerJS');
                $footerCollectionJSForExtensions = $manager->collection('footerJS');
                $headerCollectionJS              = $manager->collection('headerPBXJS');
                $headerCollectionCSS             = $manager->collection('headerCSS');
                $footerCollectionJS              = $manager->collection('footerPBXJS');
                $headerCollectionSentryJS        = $manager->collection('headerSentryJS');
                $semanticCollectionCSS           = $manager->collection('SemanticUICSS');
                $semanticCollectionJS            = $manager->collection('SemanticUIJS');
                $footerCollectionACE             = $manager->collection('footerACE');
                $footerCollectionLoc             = $manager->collection('footerLoc');

                $semanticCollectionCSS->setPrefix('public/assets/');
                $headerCollectionCSS->setPrefix('public/assets/');
                $semanticCollectionJS->setPrefix('public/assets/');
                $headerCollectionJS->setPrefix('public/assets/');
                $footerCollectionJS->setPrefix('public/assets/');
                $footerCollectionACE->setPrefix('public/assets/');
                $footerCollectionLoc->setPrefix('public/assets/');

                $cssCacheDir = $appConfig->cssCacheDir;
                $jsCacheDir  = $appConfig->jsCacheDir;

                if ($session !== null && $session->has('versionHash')) {
                    $version = $session->get('versionHash');
                } else {
                    $version = str_replace(PHP_EOL, '', file_get_contents('/etc/version'));
                }
                if (file_exists('/tmp/sendmetrics')) {
                    $headerCollectionSentryJS->addjs(
                        '//browser.sentry-cdn.com/5.6.1/bundle.min.js',
                        false,
                        false,
                        [
                            'crossorigin' => 'anonymous',
                            'integrity'   => 'sha384-pGTFmbQfua2KiaV2+ZLlfowPdd5VMT2xU4zCBcuJr7TVQozMO+I1FmPuVHY3u8KB',
                        ]
                    );
                    $headerCollectionSentryJS->addJs(
                        "public/assets/js/pbx/main/sentry-error-logger.js?v={$version}",
                        true
                    );
                }


                $semanticCollectionCSS
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

                $headerCollectionJS
                    ->addJs('js/pbx/main/header.js', true)
                    ->addJs('js/vendor/jquery.min.js', true);

                $footerCollectionJS
                    ->addJs('js/pbx/main/language-select.js', true);

                $semanticCollectionJS
                    ->addJs('js/vendor/semantic/form.min.js', true)
                    ->addJs('js/vendor/semantic/api.min.js', true)
                    ->addJs('js/vendor/semantic/site.min.js', true)
                    ->addJs('js/vendor/semantic/popup.min.js', true)
                    ->addJs('js/vendor/semantic/dropdown.min.js', true)
                    ->addJs('js/vendor/semantic/transition.min.js', true);

                // Если пользователь залогинился, сформируем необходимые CSS кеши
                if ($session && $session->has('auth')) {
                    $semanticCollectionCSS
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

                    $semanticCollectionJS
                        ->addJs('js/vendor/semantic/accordion.min.js', true)
                        ->addJs('js/vendor/semantic/dimmer.min.js', true)
                        ->addJs('js/vendor/semantic/sidebar.min.js', true)
                        ->addJs('js/vendor/semantic/checkbox.min.js', true)
                        ->addJs('js/vendor/semantic/toast.min.js', true)
                        ->addJs('js/vendor/semantic/tab.min.js', true);

                    $footerCollectionJS
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
                            'js/pbx/PbxExtensionModules/pbx-extension-menu-addition.js',
                            true
                        )
                        ->addJs(
                            'js/pbx/TopMenuSearch/top-menu-search.js',
                            true
                        );

                    if ($dispatcher->getModuleName() === 'PBXExtension') {
                        $footerCollectionJS->addJs(
                            'js/pbx/PbxExtensionModules/pbx-extension-module-status.js',
                            true
                        );
                    }
                }
                switch ($controller) {
                    case 'AsteriskManagers':
                        if ($action === 'index') {
                            $footerCollectionJS->addJs('js/pbx/AsteriskManagers/managers-index.js', true);
                        } elseif ($action === 'modify') {
                            $footerCollectionJS
                                ->addJs('js/pbx/main/form.js', true)
                                ->addJs('js/pbx/AsteriskManagers/manager-modify.js', true);
                        }
                        break;
                    case 'Backup':
                        if ($action === 'index') {
                            $semanticCollectionCSS->addCss('css/vendor/semantic/progress.min.css', true);
                            $semanticCollectionJS->addJs('js/vendor/semantic/progress.min.js', true);
                            $footerCollectionJS->addJs('js/vendor/resumableumable.js', true);
                            $footerCollectionJS->addJs('js/pbx/Backup/backup-index.js', true);
                        } elseif ($action === 'create') {
                            $semanticCollectionCSS->addCss('css/vendor/semantic/progress.min.css', true);
                            $semanticCollectionJS->addJs('js/vendor/semantic/progress.min.js', true);
                            $footerCollectionJS
                                ->addJs('js/pbx/main/form.js', true)
                                ->addJs('js/pbx/Backup/backup-create.js', true);
                        } elseif ($action === 'restore') {
                            $semanticCollectionCSS
                                ->addCss('css/vendor/semantic/progress.min.css', true)
                                ->addCss('css/vendor/semantic/modal.min.css', true);

                            $semanticCollectionJS
                                ->addJs('js/vendor/semantic/progress.min.js', true)
                                ->addJs('js/vendor/semantic/modal.min.js', true);

                            $footerCollectionJS
                                ->addJs('js/pbx/main/form.js', true)
                                ->addJs('js/pbx/Backup/backup-restore.js', true);
                        } elseif ($action === 'automatic') {
                            $semanticCollectionCSS->addCss('css/vendor/semantic/calendar.min.css', true);
                            $semanticCollectionJS->addJs('js/vendor/semantic/calendar.min.js', true);
                            $footerCollectionJS
                                ->addJs('js/pbx/main/form.js', true)
                                ->addJs('js/pbx/Backup/backup-automatic.js', true);
                        }
                        break;
                    case 'CallDetailRecords':
                        if ($action === 'index') {
                            $semanticCollectionJS->addJs('js/vendor/semantic/progress.min.js', true);

                            $semanticCollectionCSS
                                ->addCss('css/vendor/range/range.min.css', true)
                                ->addCss('css/vendor/datatable/scroller.dataTables.min.css', true)
                                ->addCss('css/vendor/datepicker/daterangepicker.css', true)
                                ->addCss('css/vendor/datatable/dataTables.semanticui.min.css', true);

                            $semanticCollectionJS
                                ->addJs('js/vendor/datatable/dataTables.semanticui.js', true)
                                ->addJs('js/vendor/datatable/dataTables.scroller.min.js', true)
                                ->addJs('js/vendor/datatable/scroller.semanticui.js', true)
                                //->addJs('js/vendor/datatable/dataTables.pageResize.min.js', TRUE)
                                ->addJs('js/vendor/range/range.min.js', true)
                                ->addJS('js/vendor/datepicker/moment.min.js', true)
                                ->addJS('js/vendor/datepicker/daterangepicker.js', true);

                            $footerCollectionJS
                                ->addJs('js/pbx/Extensions/extensions.js', true)
                                ->addJs(
                                    'js/pbx/CallDetailRecords/call-detail-records-index.js',
                                    true
                                );
                        }
                        break;
                    case 'CallQueues':
                        if ($action === 'index') {
                            $headerCollectionCSS
                                ->addCss('css/vendor/datatable/dataTables.semanticui.css', true);
                            $footerCollectionJS
                                ->addJs('js/vendor/datatable/dataTables.semanticui.js', true)
                                ->addJs('js/pbx/CallQueues/callqueues-index.js', true);
                        } elseif ($action === 'modify') {
                            $footerCollectionJS
                                ->addJs('js/vendor/jquery.debounce-1.0.5.js', true)
                                ->addJs('js/vendor/jquery.tablednd.js', true)
                                ->addJs('js/pbx/main/form.js', true)
                                ->addJs('js/pbx/Extensions/extensions.js', true)
                                ->addJs('js/pbx/CallQueues/callqueue-modify.js', true)
                                ->addJs('js/pbx/SoundFiles/one-button-sound-player.js', true);
                        }
                        break;
                    case 'ConferenceRooms':
                        if ($action === 'index') {
                            $footerCollectionJS
                                ->addJs('js/pbx/ConferenceRooms/conference-rooms-index.js', true);
                        } elseif ($action === 'modify') {
                            $footerCollectionJS
                                ->addJs('js/pbx/main/form.js', true)
                                ->addJs('js/pbx/Extensions/extensions.js', true)
                                ->addJs('js/pbx/ConferenceRooms/conference-room-modify.js', true);
                        }
                        break;
                    case 'CustomFiles':
                        if ($action === 'index') {
                            $headerCollectionCSS
                                ->addCss('css/vendor/datatable/dataTables.semanticui.css', true);
                            $footerCollectionJS
                                ->addJs('js/vendor/datatable/dataTables.semanticui.js', true)
                                ->addJs('js/pbx/CustomFiles/custom-files-index.js', true);
                        } elseif ($action === 'modify') {
                            $footerCollectionJS
                                ->addJs('js/pbx/main/form.js', true)
                                ->addJs('js/pbx/CustomFiles/custom-files-modify.js', true);
                            $footerCollectionACE
                                ->addJs('js/vendor/ace/ace.js', true)
                                ->addJs('js/vendor/ace/mode-julia.js', true);
                        }
                        break;
                    case 'DialplanApplications':
                        if ($action === 'index') {
                            $headerCollectionCSS
                                ->addCss('css/vendor/datatable/dataTables.semanticui.css', true);
                            $footerCollectionJS
                                ->addJs('js/vendor/datatable/dataTables.semanticui.js', true)
                                ->addJs('js/pbx/DialplanApplications/dialplan-applications-index.js', true);
                        } elseif ($action === 'modify') {
                            $footerCollectionACE
                                ->addJs('js/vendor/ace/ace.js', true)
                                ->addJs('js/vendor/ace/mode-php.js', true)
                                ->addJs('js/vendor/ace/mode-julia.js', true);
                            $footerCollectionJS
                                ->addJs('js/pbx/main/form.js', true)
                                ->addJs('js/pbx/Extensions/extensions.js', true)
                                ->addJs('js/pbx/DialplanApplications/dialplan-applications-modify.js', true);
                        }
                        break;
                    case 'Extensions':
                        if ($action === 'index') {
                            $headerCollectionCSS->addCss('css/vendor/datatable/dataTables.semanticui.min.css', true);

                            $footerCollectionJS
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
                            $semanticCollectionCSS->addCss('css/vendor/semantic/card.min.css', true);
                            $footerCollectionJS
                                ->addJs('js/vendor/inputmask/inputmask.js', true)
                                ->addJs('js/vendor/inputmask/jquery.inputmask.js', true)
                                ->addJs('js/vendor/inputmask/jquery.inputmask-multi.js', true)
                                ->addJs('js/vendor/inputmask/bindings/inputmask.binding.js', true)
                                ->addJs('js/vendor/inputmask/init.js', true)
                                ->addJs('js/pbx/Extensions/input-mask-patterns.js', true)
                                ->addJs('js/pbx/Extensions/extensions.js', true)
                                ->addJs('js/pbx/main/form.js', true)
                                ->addJs('js/pbx/main/debugger-info.js', true)
                                ->addJs('js/pbx/Extensions/extension-modify.js', true);
                        }
                        break;
                    case 'Fail2Ban':
                        if ($action === 'index') {
                            $footerCollectionJS
                                ->addJs('js/pbx/main/form.js', true)
                                ->addJs('js/pbx/Fail2Ban/fail-to-ban-index.js', true);
                        }
                        break;
                    case 'Firewall':
                        if ($action === 'index') {
                            $footerCollectionJS
                                ->addJs('js/pbx/Firewall/firewall-index.js', true);
                        } elseif ($action === 'modify') {
                            $footerCollectionJS
                                ->addJs('js/pbx/main/form.js', true)
                                ->addJs('js/pbx/Firewall/firewall-modify.js', true);
                        }
                        break;
                    case 'GeneralSettings':
                        if ($action === 'modify') {
                            $semanticCollectionCSS->addCss('css/vendor/semantic/progress.min.css', true);
                            $semanticCollectionJS->addJs('js/vendor/semantic/progress.min.js', true);
                            $footerCollectionJS
                                ->addJs('js/vendor/jquery.address.min.js', true)
                                ->addJs('js/pbx/main/form.js', true)
                                ->addJs('js/pbx/main/password-score.js', true)
                                ->addJs(
                                    'js/pbx/GeneralSettings/general-settings-modify.js',
                                    true
                                );
                        }
                        break;
                    case 'IncomingRoutes':
                        if ($action === 'index') {
                            $footerCollectionJS->addJs('js/vendor/jquery.tablednd.js', true)
                                ->addJs('js/pbx/main/form.js', true)
                                ->addJs('js/pbx/Extensions/extensions.js', true)
                                ->addJs('js/pbx/IncomingRoutes/incoming-route-index.js', true);
                        } elseif ($action === 'modify') {
                            $footerCollectionJS->addJs('js/pbx/main/form.js', true)
                                ->addJs('js/pbx/Extensions/extensions.js', true)
                                ->addJs('js/pbx/IncomingRoutes/incoming-route-modify.js', true);
                        }
                        break;
                    case 'IvrMenu':
                        if ($action === 'index') {
                            $headerCollectionCSS
                                ->addCss('css/vendor/datatable/dataTables.semanticui.css', true);
                            $footerCollectionJS
                                ->addJs('js/vendor/datatable/dataTables.semanticui.js', true)
                                ->addJs('js/pbx/IvrMenu/ivrmenu-index.js', true);
                        } elseif ($action === 'modify') {
                            $footerCollectionJS->addJs('js/pbx/main/form.js', true)
                                ->addJs('js/pbx/Extensions/extensions.js', true)
                                ->addJs('js/pbx/SoundFiles/one-button-sound-player.js', true)
                                ->addJs('js/pbx/IvrMenu/ivrmenu-modify.js', true);
                        }
                        break;
                    case 'Licensing':
                        if ($action === 'modify') {
                            $footerCollectionJS
                                ->addJs('js/vendor/inputmask/inputmask.js', true)
                                ->addJs('js/vendor/inputmask/jquery.inputmask.js', true)
                                ->addJs('js/vendor/inputmask/bindings/inputmask.binding.js', true)
                                ->addJs('js/vendor/jquery.address.min.js', true)
                                // ->addJs( 'js/vendor/inputmask/inputmask.extensions.js',TRUE )
                                ->addJs('js/vendor/inputmask/init.js', true)
                                ->addJs('js/pbx/main/form.js', true)
                                ->addJs('js/pbx/Licensing/licensing-modify.js', true);
                        }
                        break;
                    case 'MailSettings':
                        if ($action === 'modify') {
                            $footerCollectionJS
                                ->addJs('js/pbx/main/form.js', true)
                                ->addJs('js/pbx/MailSettings/mail-settings-modify.js', true);
                        }
                        break;
                    case 'Network':
                        if ($action === 'modify') {
                            $footerCollectionJS
                                ->addJs('js/pbx/main/form.js', true)
                                ->addJs('js/pbx/Network/network-modify.js', true);
                        }
                        break;
                    case 'OutboundRoutes':
                        if ($action === 'index') {
                            $footerCollectionJS
                                ->addJs('js/vendor/jquery.tablednd.min.js', true)
                                ->addJs('js/pbx/OutboundRoutes/outbound-routes-index.js', true);
                        } elseif ($action === 'modify') {
                            $footerCollectionJS->addJs('js/pbx/main/form.js', true)
                                ->addJs('js/pbx/OutboundRoutes/outbound-route-modify.js', true);
                        }
                        break;
                    case 'OutOffWorkTime':
                        if ($action === 'index') {
                            $footerCollectionJS
                                ->addJs('js/pbx/OutOffWorkTime/out-of-work-times-index.js', true);
                        } elseif ($action === 'modify') {
                            $semanticCollectionCSS->addCss('css/vendor/semantic/calendar.min.css', true);
                            $semanticCollectionJS->addJs('js/vendor/semantic/calendar.min.js', true);
                            $footerCollectionJS
                                ->addJs('js/pbx/main/form.js', true)
                                ->addJs('js/pbx/Extensions/extensions.js', true)
                                ->addJs('js/pbx/OutOffWorkTime/out-of-work-time-modify.js', true)
                                ->addJs('js/pbx/SoundFiles/one-button-sound-player.js', true);
                        }
                        break;
                    case 'PbxExtensionModules':
                        if ($action === 'index') {
                            $semanticCollectionJS->addJs('js/vendor/semantic/modal.min.js', true);
                            $footerCollectionJS
                                ->addJs('js/pbx/Update/update-api.js', true)
                                ->addJs('js/vendor/datatable/dataTables.semanticui.js', true)
                                ->addJs('js/pbx/PbxExtensionModules/pbx-extension-module-licensing.js', true)
                                ->addJs(
                                    'js/pbx/PbxExtensionModules/pbx-extension-module-upgrade-status-worker.js',
                                    true
                                )
                                ->addJs('js/pbx/PbxExtensionModules/pbx-extension-module-status.js', true)
                                ->addJs('js/pbx/PbxExtensionModules/pbx-extension-modules-index.js', true)
                                ->addJs('js/vendor/semantic/progress.min.js', true)
                                ->addJs('js/pbx/PbxExtensionModules/pbx-extension-module-add-new.js', true);
                            $semanticCollectionCSS
                                ->addCss('css/vendor/datatable/dataTables.semanticui.min.css', true)
                                ->addCss('css/vendor/semantic/modal.min.css', true)
                                ->addCss('css/vendor/semantic/progress.min.css', true);
                        } elseif ($action === 'modify') {
                            $footerCollectionJS
                                ->addJs('js/pbx/main/form.js', true)
                                ->addJs('js/pbx/PbxExtensionModules/pbx-extension-module-modify.js', true);
                        }
                        break;

                    case 'Providers':
                        if ($action === 'index') {
                            $semanticCollectionCSS
                                ->addCss('css/vendor/datatable/dataTables.semanticui.css', true)
                                ->addCss('css/vendor/semantic/modal.min.css', true);

                            $semanticCollectionJS
                                ->addJs('js/vendor/semantic/modal.min.js', true);
                            $footerCollectionJS
                                ->addJs('js/pbx/main/debugger-info.js', true)
                                ->addJs('js/vendor/datatable/dataTables.semanticui.js', true)
                                ->addJs('js/pbx/Providers/providers-index.js', true);
                        } elseif ($action === 'modifysip' || $action === 'modifyiax') {
                            $footerCollectionJS
                                ->addJs('js/pbx/main/form.js', true)
                                ->addJs('js/pbx/main/debugger-info.js', true)
                                ->addJs('js/pbx/Providers/provider-modify.js', true);
                        }

                        break;
                    case 'Restart':
                        if ($action === 'index') {
                            $footerCollectionJS
                                ->addJs('js/pbx/Extensions/extensions.js', true)
                                ->addJs('js/pbx/Restart/restart-index.js', true);
                        }
                        break;
                    case 'Session':
                        if ($action === 'index') {
                            $footerCollectionJS
                                ->addJs('js/pbx/main/form.js', true)
                                ->addJs('js/pbx/Session/login-form.js', true);
                        }
                        break;
                    case 'SoundFiles':
                        if ($action === 'index') {
                            $headerCollectionCSS
                                ->addCss('css/vendor/range/range.css')
                                ->addCss(
                                    'css/vendor/datatable/dataTables.semanticui.css',
                                    true
                                );
                            $footerCollectionJS->addJs('js/vendor/datatable/dataTables.semanticui.js', true)
                                ->addJs('js/vendor/range/range.min.js', true)
                                ->addJs('js/pbx/SoundFiles/sound-files-index.js', true);
                        } elseif ($action === 'modify') {
                            $headerCollectionCSS->addCss('css/vendor/range/range.css');

                            $headerCollectionJS
                                ->addJs(
                                    'js/vendor/webrtc//MediaStreamRecorder.min.js',
                                    true
                                )
                                ->addJs('js/vendor/webrtc/adapter-latest.min.js', true);

                            $footerCollectionJS
                                ->addJs('js/vendor/range/range.min.js', true)
                                ->addJs('js/pbx/main/form.js', true)
                                ->addJs('js/pbx/SoundFiles/sound-file-modify.js', true);
                        }
                        break;
                    case 'SystemDiagnostic':
                        if ($action === 'index') {
                            $footerCollectionJS
                                ->addJs('js/pbx/main/form.js', true)
                                ->addJs('js/pbx/SystemDiagnostic/system-diagnostic-index.js', true);
                        }
                        break;
                    case 'TimeSettings':
                        if ($action === 'modify') {
                            $semanticCollectionCSS->addCss('css/vendor/semantic/calendar.min.css', true);
                            $semanticCollectionJS->addJs('js/vendor/semantic/calendar.min.js', true);
                            $footerCollectionJS
                                ->addJs('js/pbx/main/form.js', true)
                                ->addJs('js/pbx/TimeSettings/time-settings-modify.js', true);
                        }
                        break;
                    case 'Update':
                        if ($action === 'index') {
                            $footerCollectionJS
                                ->addJs('js/pbx/main/form.js', true)
                                ->addJs('js/vendor/showdown/showdown.min.js', true)
                                ->addJs('js/pbx/Update/update-index.js', true);
                            $semanticCollectionCSS
                                ->addCss('css/vendor/semantic/progress.min.css', true)
                                ->addCss('css/vendor/semantic/modal.min.css', true);

                            $semanticCollectionJS
                                ->addJs('js/vendor/semantic/progress.min.js', true)
                                ->addJs('js/vendor/semantic/modal.min.js', true);
                        }
                        break;
                    default:
                        break;
                }
                $headerCollectionCSS
                    ->addCss('css/custom.css', true);

                $footerCollectionJS->addJs(
                    'js/pbx/main/footer.js',
                    true
                );


                // Сохраним перевод в файл если его еще нет
                $language   = $this->get('language');
                $langJSFile = "js/cache/localization-{$language}-{$version}.min.js";
                if ( ! file_exists($langJSFile)) {
                    $arrStr = [];
                    foreach ($this->get('messages') as $key => $value) {
                        $arrStr[$key] = str_replace(
                            "'",
                            "\\'",
                            str_replace(["\n", '  '], '', $value)
                        );
                    }

                    $fileName    = "{$jsCacheDir}/localization-{$language}-{$version}.min.js";
                    $scriptArray = json_encode($arrStr);
                    file_put_contents($fileName, "globalTranslate = {$scriptArray}");
                }


                $footerCollectionLoc->addJs($langJSFile, true);


                // Название получаемого файла
                $resultCombinedName = Text::uncamelize(ucfirst($controller) . ucfirst($action), '-');
                $resultCombinedName = strlen($resultCombinedName) !== '' ? $resultCombinedName . '-' : '';


                foreach ($headerCollectionJS as $resource) {
                    $resource->setPath($resource->getPath() . '?v=' . $version);
                }
                foreach ($footerCollectionJS as $resource) {
                    $resource->setPath($resource->getPath() . '?v=' . $version);
                }
                foreach ($semanticCollectionJS as $resource) {
                    $resource->setPath($resource->getPath() . '?v=' . $version);
                }
                foreach ($semanticCollectionCSS as $resource) {
                    $resource->setPath($resource->getPath() . '?v=' . $version);
                }
                foreach ($footerCollectionACE as $resource) {
                    $resource->setPath($resource->getPath() . '?v=' . $version);
                }


                $headerCollectionCSS->join(true);
                $headerCollectionCSS->setTargetPath("{$cssCacheDir}/{$resultCombinedName}header.min.css");
                $headerCollectionCSS->setTargetUri("css/cache/{$resultCombinedName}header.min.css?v={$version}");


                $headerCollectionJSForExtensions->join(true);
                $headerCollectionJSForExtensions->setTargetPath("{$jsCacheDir}/{$resultCombinedName}header.min.js");
                $headerCollectionJSForExtensions->setTargetUri(
                    "public/assets/js/cache/{$resultCombinedName}header.min.js?v={$version}"
                );


                $footerCollectionJSForExtensions->join(true);
                $footerCollectionJSForExtensions->setTargetPath("{$jsCacheDir}/{$resultCombinedName}footer.min.js");
                $footerCollectionJSForExtensions->setTargetUri(
                    "public/assets/js/cache/{$resultCombinedName}footer.min.js?v={$version}"
                );


                return $manager;
            }
        );
    }
}