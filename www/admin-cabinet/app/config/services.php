<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

use Phalcon\Cache\Backend\File;
use Phalcon\Cache\Frontend\Output;
use Phalcon\Mvc\Model\Metadata\Files;
use Phalcon\Mvc\View;
use Phalcon\DI\FactoryDefault;
use Phalcon\Mvc\Dispatcher;
use Phalcon\Mvc\Url as UrlProvider;
use Phalcon\Mvc\View\Engine\Volt as VoltEngine;
use Phalcon\Session\Adapter\Files as SessionAdapter;
use Phalcon\Flash\Session as DirectSession;
use Phalcon\Events\Manager as EventsManager;
use Phalcon\Translate\Adapter\NativeArray as NativeArray;
use \Phalcon\Logger;
use \Phalcon\Logger\Adapter\File as FileLogger;
use Phalcon\Cache\Frontend\Data as FrontendData;
use Phalcon\Text;
use Phalcon\Events\Event;
/**
 * The FactoryDefault Dependency Injector automatically register the right services providing a full stack framework
 */
$di = new FactoryDefault();



/**
 * Register config
 */
$di->setShared( 'config', function () use ( $config ) {
	return $config;
});


/**
 * We register the events manager
 */
$di->setShared( 'dispatcher', function () use ($config ) {
	$eventsManager = new EventsManager;

	/**
	 * Camelize Controller name
	 */
	$eventsManager->attach('dispatch:beforeDispatch', new NormalizeControllerNamePlugin);

	/**
	 * Check if the user is allowed to access certain action using the SecurityPlugin
	 */
	$eventsManager->attach( 'dispatch:beforeDispatch', new SecurityPlugin );

	/**
	 * Handle exceptions and not-found exceptions using NotFoundPlugin
	 */
	if (!$config->application->debugMode) {
		$eventsManager->attach( 'dispatch:beforeException',
			new NotFoundPlugin );
	}
	$dispatcher = new Dispatcher;
	$dispatcher->setEventsManager($eventsManager);
	return $dispatcher;
});
/**
 * The URL component is used to generate all kind of urls in the application
 */
$di->set('url', function() use ($config){
	$url = new UrlProvider();
	$url->setBaseUri('/admin-cabinet/');
	return $url;
});

$di->set('view', function() use ($config) {
	$view = new View();
	$view->setViewsDir($config->application->viewsDir);
	$view->registerEngines(array(
		".volt" => 'volt'
	));
	return $view;
});
/**
 * Setting up volt
 */
$di->set('volt', function($view, $di) use ($config){
	$volt = new VoltEngine($view, $di);
	$volt->setOptions(array(
		"compiledPath" => $config->application->cacheDir
	));
	$compiler = $volt->getCompiler();
	$compiler->addFunction( 'in_array', 'in_array' );

	if ( $config->application->debugMode == TRUE ) {
		array_map( 'unlink',
			glob( $config->application->cacheDir . 'volt/*.php' ) );
		$volt->setOptions( [
			'compileAlways' => TRUE,
		] );
	}

	return $volt;
}, true);


$di->set(
	'viewCache', function () use ( $config ) {

	//Cache for one day
	$frontCache = new Output( [
		"lifetime" => $config->application->debugMode ? 1 : 86400,
	] );

	//Set file cache
	$cache = new File( $frontCache, [
		"cacheDir" => $config->application->cacheDir,
	] );

	return $cache;
}
);
/**
 * Кеш для контроллеров
 */
$di->set(
	'managedCache', function () use ( $config ) {

	//Cache for one day
	$frontCache = new FrontendData( [
		"lifetime" => 3600,
	] );

	//Set file cache
	$cache = new File( $frontCache, [
		"cacheDir" => $config->application->cacheDir,
	] );

	return $cache;
}
);


/**
 * If the configuration specify the use of metadata adapter use it or use memory otherwise
 */
if (!$config->application->debugMode) {
	$di->set('modelsMetadata', function () use ( $config ) {
		$metaData = new Files( [
			'metaDataDir' => $config->application->metacacheDir,
			"lifetime"    => 86400,
			"prefix"      => "metacache_key",
		] );

		return $metaData;
	} );
}


// Set the models cache service
$di->set('modelsCache', function () use ($config){

	// Cache data for one day by default
	$frontCache = new FrontendData(
		[
			"lifetime" => 86400,
		]
	);

	//Set file cache
	$cache = new File( $frontCache, [
		"cacheDir" => $config->application->modelscacheDir,
	] );

	return $cache;
} );


/**
 * Database connection is created based in the parameters defined in the configuration file
 */
$di->set('db', function() use ($config) {

	$dbclass = 'Phalcon\Db\Adapter\Pdo\\' . $config->database->adapter;
	$connection = new $dbclass( array(
		"dbname" => $config->database->dbfile,
	) );

	if ( $config->application->debugMode) {
		$logpath	= $config->application->logDir.'query-debug.log';

		$logger = new FileLogger($logpath);

		$eventsManager = new EventsManager();
		// Слушаем все события базы данных
		$eventsManager->attach('db', function ($event, $connection) use ($logger) {
			if ($event->getType() == 'beforeQuery') {
				$logger->log($connection->getSQLStatement(), Logger::SPECIAL);
			}
		});

		// Назначаем EventsManager экземпляру адаптера базы данных
		$connection->setEventsManager($eventsManager);
	}
	return $connection;
});

/**
 * Asterisk CDR Database connection
 */
$di->set('dbCDR', function() use ($config) {


	$dbclass = 'Phalcon\Db\Adapter\Pdo\\' . $config->cdrdatabase->adapter;
	$connection = new $dbclass( [
		"dbname" => $config->cdrdatabase->dbfile,
	] );

	if ( $config->application->debugMode ) {
		$logpath = $config->application->logDir . 'query-debug-cdr.log';

		$logger = new FileLogger( $logpath );

		$eventsManager = new EventsManager();
		// Слушаем все события базы данных
		$eventsManager->attach( 'db',
			function ( $event, $connection ) use ( $logger ) {
				if ( $event->getType() == 'beforeQuery' ) {
					$logger->log( $connection->getSQLStatement(),
						Logger::SPECIAL );
				}
			} );

		// Назначаем EventsManager экземпляру адаптера базы данных
		$connection->setEventsManager( $eventsManager );
	}

	return $connection;
} );


/**
 * Start the session the first time some component request the session service
 */
$di->setShared( 'session', function () {
	$session = new SessionAdapter();
	$session->start();
	return $session;
});

/**
 * Read only session for AJAX requests
 */
$di->setShared( 'sessionRO', function () {
	if (!is_array($_COOKIE) || !array_key_exists(session_name(), $_COOKIE)) {
		return null;
	}
	$session_name = preg_replace('/[^\da-z]/i', '', $_COOKIE[session_name()]);
	$session_file = session_save_path().'/sess_' . $session_name;
	if(!file_exists($session_file)){
		return null;
	}

	$session_data = file_get_contents($session_file);

	$return_data = array();
	$offset = 0;
	while ($offset < strlen($session_data)) {
		if (false === strpos(substr($session_data, $offset), "|")) {
			break;
		}
		$pos = strpos($session_data, "|", $offset);
		$num = $pos - $offset;
		$varname = substr($session_data, $offset, $num);
		$offset += $num + 1;
		$data = unserialize(substr($session_data, $offset),array('allowed_classes' => false));
		$return_data[$varname] = $data;
		$offset += strlen(serialize($data));
	}
	$_SESSION = $return_data;
	return $return_data;
});

/**
 * Register the flash service with custom CSS classes
 */
$di->set('flash', function(){
	$flash = new DirectSession(array(
		'error'   => 'ui negative message',
		'warning' => 'ui warning message',
		'success' => 'ui positive message',
		'notice'  => 'ui info message',
	));

	$flash->setAutoescape(false);
	return $flash;
});

/**
 * Register the translation service
 */
$di->setShared( 'translation', function () use ( $di ) {
	// Return a translation object
	return new NativeArray(
		[
			"content" => $di->getMessages(),
		]
	);
} );

/**
 * Register current language difinition
 */
$di->setShared( 'language', function () {
	$roSession = $this->get( 'sessionRO' );
	if ( $roSession !== null && array_key_exists('auth', $roSession )) {
		$language = $roSession['auth']['lang'];
	} elseif (array_key_exists ( 'HTTP_ACCEPT_LANGUAGE' , $_SERVER )){
		$lang = substr($_SERVER['HTTP_ACCEPT_LANGUAGE'], 0, 2);
		$acceptLang = ['ru', 'en', 'de'];
		$language = in_array($lang, $acceptLang) ? $lang : 'en';
	} else {
		$language = 'en';
	}
	return $language;
} );

/**
 * Register the translation service
 */
$di->setShared( 'messages', function () use ( $config, $di ) {
	$language = $di->getLanguage();
	$messages = [];
	// Заглянем сначала в кеш переводов
	$roSession  = $this->get( 'sessionRO' );
	$cacheKey = false;
	if ( $roSession !== null && array_key_exists('versionHash', $roSession)) {
		$cacheKey = 'LocalisationArray' . $roSession['versionHash'].$language.'.php';
	}
	if ($cacheKey) {
		$translates  = $this->get('managedCache')->get($cacheKey, 3600);
		if (!empty($translates)) {
			return $translates;
		}
	}

	$translates = [];
	// Возьмем английский интерфейс
	$enFilePath= $config->application->backendDir.'messages/en.php';
	if ( file_exists( $enFilePath ) ) {
		$translates    = require $enFilePath;
	}


	if ($language!=='en'){
		$additionalTranslates = [];
		// Check if we have a translation file for that lang
		$langFile = $config->application->backendDir."messages/{$language}.php";
		if ( file_exists( $langFile ) ) {
			$additionalTranslates = require $langFile;
		}
		// Заменим английские переводы на выбранный админом язык
		if ($additionalTranslates!==[[]]) {
			$translates = array_merge($translates, $additionalTranslates);
		}
	}

	// Возьмем английский перевод расширений
	$extensionsTranslates = [[]];
	$results = glob( $config->application->modulesDir
		. '*/{messages}/en.php', GLOB_BRACE );
	foreach ( $results as $path ) {
		$langArr = require $path;
		if (is_array($langArr)){
			$extensionsTranslates[] = $langArr;
		} else {
			$extensionsTranslates[] = $messages; // Поддержка старых модулей
		}
	}
	if ($extensionsTranslates!==[[]]){
		$translates = array_merge($translates, ...$extensionsTranslates);
	}
	if ($language!=='en'){
		$additionalTranslates = [[]];
		$results = glob( $config->application->modulesDir
			. "*/{messages}/{$language}.php", GLOB_BRACE );
		foreach ( $results as $path ) {
			$langArr = require $path;
			if (is_array($langArr)){
				$additionalTranslates[] = $langArr;
			} else {
				$additionalTranslates[] = $messages; // Поддержка старых модулей
			}
		}
		if ($additionalTranslates!==[[]]) {
			$translates = array_merge($translates, ...$additionalTranslates);
		}
	}
	if ($cacheKey) {
		$this->get('managedCache')->save($cacheKey, $translates);
	}
	// Return a translation object
	return $translates;
} );


/**
 * Register a user component
 */
$di->setShared( 'elements', function () {
	return new Elements();
});

/**
 * Регистрация папки для хранения файлов записи
 */
$di->setShared( 'mediaFolder', function () use ( $config ) {
	return $config->application->mediaDir;
} );

/**
 * Регистрация папки для хранения модулей
 */
$di->setShared( 'modulesDir', function () use ( $config ) {
	return $config->application->modulesDir;
} );

/**
 * Сервис работы с лицензированием
 */
$di->setShared( 'licenseWorker', function () use ( $config ) {
	if ( $config->application->debugMode ) {
		$serverUrl = 'http://172.16.32.72:8222';
	} else {
		$serverUrl = 'http://127.0.0.1:8222';
	}

	return new LicenseWorker( $serverUrl );
} );

/**
 * Сервис для работы с JS и CSS файлами
 */
$di->set( 'assets', function () use ( $config ) {
	$manager    = new Phalcon\Assets\Manager();
	$dispatcher = $this->get( 'dispatcher' );
	$roSession  = $this->get( 'sessionRO' );
	$controller = $dispatcher->getControllerName();
	$action     = $dispatcher->getActionName();
	if ( $action === NULL ) {
		$action = "index";
	}
	$headerCollectionJSForExtensions  = $manager->collection( "headerJS" );
	$footerCollectionJSForExtensions  = $manager->collection( "footerJS" );
	$headerCollectionJS  = $manager->collection( "headerPBXJS" );
	$headerCollectionCSS = $manager->collection( "headerCSS" );
	$footerCollectionJS  = $manager->collection( "footerPBXJS" );
	$headerCollectionSentryJS  = $manager->collection( "headerSentryJS" );


	$cssCacheDir = $config->application->cssCacheDir;
	$jsCacheDir	 = $config->application->jsCacheDir;

	if ( $roSession !== null && array_key_exists('versionHash', $roSession)) {
		$version = "v=" . $roSession['versionHash'];
	} else {
		$version = "v=" . str_replace(PHP_EOL, '', file_get_contents('/etc/version'));
	}
	if (file_exists('/tmp/sendmetrics')){
		$headerCollectionSentryJS->addjs('//browser.sentry-cdn.com/5.1.1/bundle.min.js',FALSE,FALSE,['crossorigin'=>'anonymous']);
		$headerCollectionSentryJS->addJs("public/js/pbx/main/sentry-error-logger.js?{$version}",TRUE,FALSE);
	}

	$semanticCollectionCSS = $manager
		->collection( "SemanticUICSS" );
	$semanticCollectionCSS
		->addCss( 'css/semantic/grid.min.css', TRUE, FALSE )
		->addCss( 'css/semantic/divider.min.css', TRUE, FALSE )
		->addCss( 'css/semantic/container.min.css', TRUE, FALSE )
		->addCss( 'css/semantic/header.min.css', TRUE, FALSE )
		->addCss( 'css/semantic/button.min.css', TRUE, FALSE )
		->addCss( 'css/semantic/form.min.css', TRUE, FALSE )
		->addCss( 'css/semantic/icon.min.css', TRUE, FALSE )
		->addCss( 'css/semantic/image.min.css', TRUE, FALSE )
		->addCss( 'css/semantic/input.min.css', TRUE, FALSE )
		->addCss( 'css/semantic/message.min.css', TRUE, FALSE )
		->addCss( 'css/semantic/segment.min.css', TRUE, FALSE )
		->addCss( 'css/semantic/site.min.css', TRUE, FALSE )
		->addCss( 'css/semantic/reset.min.css', TRUE, FALSE )
		->addCss( 'css/semantic/transition.min.css', TRUE, FALSE );

	$footerCollectionACE = $manager
		->collection( "footerACE" );

	$headerCollectionJS
		->addJs( "js/pbx/main/header.js", TRUE )
		->addJs( "js/jquery.min.js", TRUE );

	$semanticCollectionJS = $manager
		->collection( "SemanticUIJS" );
	$semanticCollectionJS
		->addJs('js/semantic/form.min.js', TRUE, FALSE)
		->addJs('js/semantic/api.min.js', TRUE, FALSE)
		->addJs('js/semantic/site.min.js', TRUE, FALSE)
		->addJs('js/semantic/popup.min.js', TRUE, FALSE)
		->addJs('js/semantic/transition.min.js', TRUE, FALSE);

	// Если пользователь залогинился, сформируем необходимые CSS кеши
	if ( is_array($roSession) && array_key_exists('auth', $roSession )) {
		$semanticCollectionCSS
			->addCss( 'css/semantic/menu.min.css', TRUE, FALSE )
			->addCss( 'css/semantic/sidebar.min.css', TRUE, FALSE )
			->addCss( 'css/semantic/table.min.css', TRUE, FALSE )
			->addCss( 'css/semantic/loader.min.css', TRUE, FALSE )
			->addCss( 'css/semantic/label.min.css', TRUE, FALSE )
			->addCss( 'css/semantic/dimmer.min.css', TRUE, FALSE )
			->addCss( 'css/semantic/accordion.min.css', TRUE, FALSE )
			->addCss( 'css/semantic/placeholder.min.css', TRUE, FALSE )
			->addCss( 'css/semantic/item.min.css', TRUE, FALSE )
			->addCss( 'css/semantic/tab.min.css', TRUE, FALSE )
			->addCss( 'css/semantic/checkbox.min.css', TRUE, FALSE )
			->addCss( 'css/semantic/popup.min.css', TRUE, FALSE )
			->addCss( 'css/semantic/dropdown.min.css', TRUE, FALSE );

		$semanticCollectionJS
			->addJs( 'js/semantic/accordion.min.js', TRUE, FALSE )
			->addJs( 'js/semantic/dimmer.min.js', TRUE, FALSE )
			->addJs( 'js/semantic/sidebar.min.js', TRUE, FALSE )
			->addJs( 'js/semantic/dropdown.min.js', TRUE, FALSE )
			->addJs( 'js/semantic/checkbox.min.js', TRUE, FALSE )
			->addJs( 'js/semantic/tab.min.js', TRUE, FALSE );


		$footerCollectionJS
			->addJs( 'js/pbx/main/config.js',
				TRUE,
				TRUE )
			->addJs( 'js/pbx/main/pbxapi.js',
				TRUE,
				TRUE )
			->addJs( 'js/pbx/main/connection-check-worker.js',
				TRUE,
				TRUE )
			->addJs( 'js/pbx/main/pbx-config-worker.js',
				TRUE,
				TRUE )
			->addJs( 'js/pbx/main/semantic-localization.js',
				TRUE,
				TRUE )
			->addJs( 'js/pbx/Advices/advices-worker.js',
				TRUE,
				TRUE );

		if ( $dispatcher->getModuleName() === "PBXExtension" ) {
			$footerCollectionJS->addJs( 'js/pbx/PbxExtensionModules/pbx-extension-module-status.js',
				TRUE,
				TRUE );
		}
	}
		switch ($controller){
			case 'AsteriskManagers':
				if ($action==='index'){
					$footerCollectionJS->addJs( 'js/pbx/AsteriskManagers/managers-index.js',TRUE, TRUE );
				} elseif ($action==='modify'){
					$footerCollectionJS
						->addJs( 'js/pbx/main/form.js',TRUE, TRUE )
						->addJs( 'js/pbx/AsteriskManagers/manager-modify.js',TRUE, TRUE );
				}
				break;
			case 'Backup':
				if ($action==='index'){
					$semanticCollectionCSS->addCss( 'css/semantic/progress.min.css', TRUE, FALSE );
					$semanticCollectionJS->addJs( 'js/semantic/progress.min.js', TRUE, FALSE );
					$footerCollectionJS->addJs( 'js/pbx/Backup/backup-index.js',TRUE, TRUE );
				} elseif ($action==='create'){
					$semanticCollectionCSS->addCss( 'css/semantic/progress.min.css', TRUE, FALSE );
					$semanticCollectionJS->addJs( 'js/semantic/progress.min.js', TRUE, FALSE );
					$footerCollectionJS
						->addJs( 'js/pbx/main/form.js',TRUE, TRUE )
						->addJs( 'js/pbx/Backup/backup-create.js',TRUE, TRUE );
				}elseif ($action==='restore'){
					$semanticCollectionCSS
						->addCss( 'css/semantic/progress.min.css', TRUE, FALSE )
						->addCss( 'css/semantic/modal.min.css', TRUE, FALSE );

					$semanticCollectionJS
						->addJs( 'js/semantic/progress.min.js', TRUE, FALSE )
						->addJs( 'js/semantic/modal.min.js', TRUE, FALSE );

					$footerCollectionJS
						->addJs( 'js/pbx/main/form.js',TRUE, TRUE )
						->addJs( 'js/pbx/Backup/backup-restore.js',TRUE, TRUE );
				} elseif ($action==='automatic'){
					$semanticCollectionCSS->addCss( 'css/semantic/calendar.min.css', TRUE, FALSE );
					$semanticCollectionJS->addJs('js/semantic/calendar.min.js', TRUE, FALSE);
					$footerCollectionJS
						->addJs( 'js/pbx/main/form.js',TRUE, TRUE )
						->addJs( 'js/pbx/Backup/backup-automatic.js',TRUE, TRUE );
				}
				break;
			case 'CallDetailRecords':
				if ($action==='index'){

					$semanticCollectionJS->addJs( 'js/semantic/progress.min.js', TRUE, FALSE );

					$semanticCollectionCSS
						->addCss( 'css/range/range.min.css',TRUE, FALSE)
						->addCss( 'css/datatable/scroller.dataTables.min.css',TRUE, FALSE)
						->addCss( 'css/datepicker/daterangepicker.css',TRUE, FALSE)
						->addCss( 'css/datatable/dataTables.semanticui.min.css',TRUE, FALSE);

					$semanticCollectionJS
						->addJs('js/datatable/dataTables.semanticui.js', TRUE)
						->addJs('js/datatable/dataTables.scroller.min.js', TRUE)
						 ->addJs('js/datatable/scroller.semanticui.js', TRUE)
						//->addJs('js/datatable/dataTables.pageResize.min.js', TRUE)
						->addJs( 'js/range/range.min.js', TRUE )
						->addJS('js/datepicker/moment.min.js',TRUE, TRUE )
						->addJS('js/datepicker/daterangepicker.js',TRUE, TRUE );

					$footerCollectionJS
						->addJs( 'js/pbx/Extensions/extensions.js',TRUE, TRUE )
						->addJs( 'js/pbx/CallDetailRecords/call-detail-records-index.js',
							TRUE )
					;
				}
				break;
			case 'CallQueues':
				if ($action==='index'){
					$footerCollectionJS->addJs('js/pbx/CallQueues/callqueues-index.js', TRUE);
				} elseif ($action==='modify'){
					$footerCollectionJS
						->addJs( 'js/jquery.debounce-1.0.5.js', TRUE )
						->addJs( 'js/jquery.tablednd.js', TRUE )
						->addJs( 'js/pbx/main/form.js', TRUE )
						->addJs( 'js/pbx/Extensions/extensions.js', TRUE )
						->addJs( 'js/pbx/CallQueues/callqueue-modify.js', TRUE )
						->addJs( 'js/pbx/SoundFiles/one-button-sound-player.js', TRUE );
				}
				break;
			case 'ConferenceRooms':
				if ($action==='index'){
					$footerCollectionJS
						->addJs( 'js/pbx/ConferenceRooms/conference-rooms-index.js',TRUE);
				} elseif ($action==='modify'){
					$footerCollectionJS
						->addJs( 'js/pbx/main/form.js', TRUE )
						->addJs( 'js/pbx/Extensions/extensions.js', TRUE )
						->addJs( 'js/pbx/ConferenceRooms/conference-room-modify.js',TRUE );
				}
				break;
			case 'CustomFiles':
				if ($action==='index'){
					$headerCollectionCSS
						->addCss( 'css/datatable/dataTables.semanticui.css',TRUE, TRUE);
					$footerCollectionJS
						->addJs('js/datatable/dataTables.semanticui.js', TRUE)
						->addJs('js/pbx/CustomFiles/custom-files-index.js', TRUE);
				} elseif ($action==='modify'){
					$footerCollectionJS
						->addJs( 'js/pbx/main/form.js', TRUE )
						->addJs( 'js/pbx/CustomFiles/custom-files-modify.js',TRUE );
					$footerCollectionACE
						->addJs( 'public/js/ace/ace.js', TRUE )
						->addJs( 'public/js/ace/mode-julia.js', TRUE );
				}
				break;
			case 'DialplanApplications':
				if ($action==='index'){
					$headerCollectionCSS
						->addCss( 'css/datatable/dataTables.semanticui.css',TRUE, TRUE);
					$footerCollectionJS
						->addJs('js/datatable/dataTables.semanticui.js', TRUE)
						->addJs('js/pbx/DialplanApplications/dialplan-applications-index.js', TRUE);
				} elseif ($action==='modify'){
					$footerCollectionACE
						->addJs( 'public/js/ace/ace.js', TRUE )
					    ->addJs( 'public/js/ace/mode-php.js', TRUE )
						->addJs( 'public/js/ace/mode-julia.js', TRUE );
					$footerCollectionJS
						->addJs( 'js/pbx/main/form.js', TRUE )
						->addJs( 'js/pbx/Extensions/extensions.js', TRUE )
						->addJs( 'js/pbx/DialplanApplications/dialplan-applications-modify.js',TRUE );
				}
				break;
			case 'Extensions':
				if ($action==='index'){
					$headerCollectionCSS->addCss( 'css/datatable/dataTables.semanticui.min.css', TRUE );

					$footerCollectionJS
						->addJs( 'js/datatable/dataTables.semanticui.js',TRUE )
						->addJs( 'js/pbx/Extensions/extensions-index.js',TRUE )
						->addJs( 'js/pbx/main/debugger-info.js', TRUE )
						->addJs( 'js/clipboard/clipboard.js', TRUE );

				} elseif ($action==='modify'){
					$semanticCollectionCSS->addCss( "css/semantic/card.min.css", TRUE, FALSE );
					$footerCollectionJS
						->addJs( 'js/inputmask/inputmask.js', TRUE )
						->addJs( 'js/inputmask/jquery.inputmask.js', TRUE )
						->addJs( 'js/inputmask/jquery.inputmask-multi.js', TRUE )
						->addJs( 'js/inputmask/bindings/inputmask.binding.js',	TRUE )
						->addJs( 'js/inputmask/init.js', TRUE )
						->addJs( 'js/pbx/Extensions/extensions.js', TRUE )
						->addJs( 'js/pbx/main/form.js', TRUE )
						->addJs( 'js/pbx/main/debugger-info.js', TRUE )
						->addJs( 'js/pbx/Extensions/extension-modify.js', TRUE );
				}
				break;
			case 'Fail2Ban':
				if ($action==='index'){
					$footerCollectionJS
						->addJs( 'js/pbx/main/form.js', TRUE )
						->addJs( 'js/pbx/Fail2Ban/fail-to-ban-index.js',TRUE );
				}
				break;
			case 'Firewall':
				if ($action==='index'){
					$footerCollectionJS
						->addJs( 'js/pbx/Firewall/firewall-index.js',TRUE );
				} elseif ($action==='modify'){
					$footerCollectionJS
						->addJs( 'js/pbx/main/form.js', TRUE )
						->addJs( 'js/pbx/Firewall/firewall-modify.js', TRUE );
				}
				break;
			case 'GeneralSettings':
				if ($action==='modify'){
					$semanticCollectionCSS->addCss( 'css/semantic/progress.min.css', TRUE, FALSE );
					$semanticCollectionJS->addJs( 'js/semantic/progress.min.js', TRUE, FALSE );
					$footerCollectionJS
						->addJs( 'js/jquery.address.min.js', TRUE, FALSE )
						->addJs( 'js/pbx/main/form.js', TRUE )
						->addJs( 'js/pbx/main/password-score.js', TRUE )
						->addJs( 'js/pbx/GeneralSettings/general-settings-modify.js',
						TRUE );
				}
				break;
			case 'IncomingRoutes':
				if ($action==='index'){
					$footerCollectionJS->addJs( 'js/jquery.tablednd.js', TRUE )
					                   ->addJs( 'js/pbx/main/form.js', TRUE )
					                   ->addJs( 'js/pbx/Extensions/extensions.js', TRUE )
					                   ->addJs( 'js/pbx/IncomingRoutes/incoming-route-index.js', TRUE );

				} elseif ($action==='modify'){
					$footerCollectionJS->addJs( 'js/pbx/main/form.js', TRUE )
					                   ->addJs( 'js/pbx/Extensions/extensions.js', TRUE )
					                   ->addJs( 'js/pbx/IncomingRoutes/incoming-route-modify.js',TRUE );
				}
				break;
			case 'IvrMenu':
				if ($action==='index'){
					$footerCollectionJS ->addJs( 'js/pbx/IvrMenu/ivrmenu-index.js', TRUE );

				} elseif ($action==='modify'){
					$footerCollectionJS->addJs( 'js/pbx/main/form.js', TRUE )
					                   ->addJs( 'js/pbx/Extensions/extensions.js', TRUE )
					                   ->addJs( 'js/pbx/SoundFiles/one-button-sound-player.js', TRUE )
					                   ->addJs( 'js/pbx/IvrMenu/ivrmenu-modify.js',TRUE );
				}
				break;
			case 'Licensing':
				if ($action==='modify'){
					$footerCollectionJS
						->addJs( 'js/inputmask/inputmask.js', TRUE )
					    ->addJs( 'js/inputmask/jquery.inputmask.js', TRUE )
					    ->addJs( 'js/inputmask/bindings/inputmask.binding.js',	TRUE )
						// ->addJs( 'js/inputmask/inputmask.extensions.js',TRUE )
						->addJs( 'js/inputmask/init.js', TRUE )
						->addJs( 'js/pbx/main/form.js', TRUE )
						->addJs( 'js/pbx/Licensing/licensing-modify.js',TRUE );
				}
				break;
			case 'MailSettings':
				if ($action==='modify'){
					$footerCollectionJS
						->addJs( 'js/pbx/main/form.js', TRUE )
						->addJs( 'js/pbx/MailSettings/mail-settings-modify.js', TRUE );
				}
				break;
			case 'Network':
				if ($action==='modify'){
					$footerCollectionJS
						->addJs( 'js/pbx/main/form.js', TRUE )
						->addJs( 'js/pbx/Network/network-modify.js', TRUE );
				}
				break;
			case 'OutboundRoutes':
				if ($action==='index'){
					$footerCollectionJS
						->addJs( 'js/jquery.tablednd.min.js', TRUE )
						->addJs( 'js/pbx/OutboundRoutes/outbound-routes-index.js', TRUE );

				} elseif ($action==='modify'){
					$footerCollectionJS->addJs( 'js/pbx/main/form.js', TRUE )
					                   ->addJs( 'js/pbx/OutboundRoutes/outbound-route-modify.js', TRUE );
				}
				break;
			case 'OutOffWorkTime':
				if ($action==='index'){
					$footerCollectionJS
						->addJs( 'js/pbx/OutOffWorkTime/out-of-work-times-index.js', TRUE );

				} elseif ($action==='modify'){
					$semanticCollectionCSS->addCss( 'css/semantic/calendar.min.css', TRUE, FALSE );
					$semanticCollectionJS->addJs('js/semantic/calendar.min.js', TRUE, FALSE);
					$footerCollectionJS
						->addJs( 'js/pbx/main/form.js',TRUE, TRUE )
						->addJs( 'js/pbx/Extensions/extensions.js',TRUE, TRUE )
						->addJs( 'js/pbx/OutOffWorkTime/out-of-work-time-modify.js',TRUE, TRUE )
						->addJs( 'js/pbx/SoundFiles/one-button-sound-player.js',TRUE, TRUE );
				}
				break;
			case 'PbxExtensionModules':
				if ($action==='index'){
					$footerCollectionJS
						->addJs( 'js/pbx/PbxExtensionModules/pbx-extension-modules-index.js', TRUE );
				}
				break;

			case 'Providers':
				if ($action==='index'){
					$footerCollectionJS
						->addJs( 'js/pbx/main/debugger-info.js', TRUE )
						->addJs( 'js/pbx/Providers/providers-index.js', TRUE );

				} elseif ($action==='modifysip' || $action==='modifyiax'){
					$footerCollectionJS
						->addJs( 'js/pbx/main/form.js', TRUE )
						->addJs( 'js/pbx/main/debugger-info.js', TRUE )
					    ->addJs( 'js/pbx/Providers/provider-modify.js', TRUE );
				}

				break;
			case 'Restart':
				if ($action==='index'){
					$footerCollectionJS
						->addJs( 'js/pbx/Extensions/extensions.js',TRUE, TRUE )
						->addJs( 'js/pbx/Restart/restart-index.js', TRUE );
				}
				break;
			case 'Session':
				if ($action==='index'){
					$footerCollectionJS
						->addJs( 'js/pbx/main/form.js', TRUE )
						->addJs( 'js/pbx/Session/login-form.js', TRUE );
				}
				break;
			case 'SoundFiles':
				if ($action==='index'){
					$headerCollectionCSS
						->addCss( 'css/range/range.css' )
						->addCss( 'css/datatable/dataTables.semanticui.css',
							TRUE );
					$footerCollectionJS->addJs( 'js/datatable/dataTables.semanticui.js', TRUE )
					                   ->addJs( 'js/range/range.min.js', TRUE )
					                   ->addJs( 'js/pbx/SoundFiles/sound-files-index.js', TRUE );

				} elseif ($action==='modify'){
					$headerCollectionCSS->addCss( 'css/range/range.css' );

					$headerCollectionJS
						->addJs( 'js/webrtc//MediaStreamRecorder.min.js',
						TRUE )
						->addJs( 'js/webrtc/adapter-latest.min.js', TRUE );

					$footerCollectionJS
						->addJs( 'js/range/range.min.js', TRUE )
						->addJs( 'js/pbx/main/form.js', TRUE )
						->addJs( 'js/pbx/SoundFiles/sound-file-modify.js', TRUE );
				}
			case 'SystemDiagnostic':
				if ($action==='index'){
					$footerCollectionJS
						->addJs( 'js/pbx/main/form.js', TRUE )
						->addJs( 'js/pbx/SystemDiagnostic/system-diagnostic-index.js', TRUE );
				}
				break;
			case 'TimeSettings':
				if ($action==='modify'){
					$semanticCollectionCSS->addCss( 'css/semantic/calendar.min.css', TRUE, FALSE );
					$semanticCollectionJS->addJs('js/semantic/calendar.min.js', TRUE, FALSE);
					$footerCollectionJS
						->addJs( 'js/pbx/main/form.js', TRUE )
					    ->addJs( 'js/pbx/TimeSettings/time-settings-modify.js', TRUE );

				}
				break;
			case 'Update':
				if ($action==='index'){
					$footerCollectionJS
						->addJs( 'js/pbx/main/form.js', TRUE )
						->addJs( 'js/pbx/Update/update-index.js', TRUE );
					$semanticCollectionCSS
						->addCss( 'css/semantic/progress.min.css', TRUE, FALSE )
						->addCss( 'css/semantic/modal.min.css', TRUE, FALSE );

					$semanticCollectionJS
						->addJs( 'js/semantic/progress.min.js', TRUE, FALSE )
						->addJs( 'js/semantic/modal.min.js', TRUE, FALSE );

				}
				break;
			default:
				break;
		}
	$headerCollectionCSS
		->addCss( "css/custom.css", TRUE );

	$footerCollectionJS->addJs( 'js/pbx/main/footer.js',
		TRUE,
		TRUE );


	// Сохраним перевод в файл
	$language = $this->get( 'language' );
	$arrStr = [];
	foreach ( $this->get( 'messages' ) as $key => $value ) {
		$arrStr[ $key ] = str_replace( '"', '\\"',
			str_replace( [ "\n", "  " ], '', $value ) );
	}

	$fileName    = "{$jsCacheDir}localization-{$language}.min.js";
	$scriptArray = json_encode( $arrStr );
	file_put_contents( $fileName, "globalTranslate = {$scriptArray}" );

	$footerCollectionLoc = $manager->collection( "footerLoc" );
	$footerCollectionLoc->addJs( "public/js/cache/localization-{$language}.min.js?{$version}", TRUE);


	// Название получаемого файла
	$resultCombinedName = Text::uncamelize( ucfirst( $controller )
	                                        . ucfirst( $action ), '-' );

	$resultCombinedName = strlen( $resultCombinedName ) > 0
		? $resultCombinedName . "-" : '';



	// $semanticCollectionCSS->join( TRUE );
	// $semanticCollectionCSS->setTargetPath( "{$cssCacheDir}{$resultCombinedName}semantic.min.css" );
	// $semanticCollectionCSS->setTargetUri( "public/css/cache/{$resultCombinedName}semantic.min.css?{$version}" );
	// $semanticCollectionCSS->addFilter(
	// 	new Phalcon\Assets\Filters\Cssmin()
	// );

	$headerCollectionCSS->join( TRUE );
	$headerCollectionCSS->setTargetPath( "{$cssCacheDir}{$resultCombinedName}header.min.css" );
	$headerCollectionCSS->setTargetUri( "public/css/cache/{$resultCombinedName}header.min.css?{$version}" );
	$headerCollectionCSS->addFilter(
		new Phalcon\Assets\Filters\Cssmin()
	);

	// $semanticCollectionJS->join( TRUE );
	// $semanticCollectionJS->setTargetPath( "{$jsCacheDir}{$resultCombinedName}semantic.min.js" );
	// $semanticCollectionJS->setTargetUri( "public/js/cache/{$resultCombinedName}semantic.min.js?{$version}" );
	// $semanticCollectionJS->addFilter(
	// 	new Phalcon\Assets\Filters\Jsmin()
	// );
	$semanticCollectionCSS->setPrefix('public/');
	$semanticCollectionJS->setPrefix('public/');
	$headerCollectionJS->setPrefix('public/');
	$footerCollectionJS->setPrefix('public/');
	foreach($headerCollectionJS as $resource){
		$resource->setPath($resource->getPath().'?'.$version);
	}
	foreach($footerCollectionJS as $resource){
		$resource->setPath($resource->getPath().'?'.$version);
	}
	foreach($semanticCollectionJS as $resource){
		$resource->setPath($resource->getPath().'?'.$version);
	}
	foreach($semanticCollectionCSS as $resource){
		$resource->setPath($resource->getPath().'?'.$version);
	}

	$headerCollectionJSForExtensions->join( TRUE );
	$headerCollectionJSForExtensions->setTargetPath( "{$jsCacheDir}{$resultCombinedName}header.min.js" );
	$headerCollectionJSForExtensions->setTargetUri( "public/js/cache/{$resultCombinedName}header.min.js?{$version}" );
	$headerCollectionJSForExtensions->addFilter(
	 	new Phalcon\Assets\Filters\Jsmin()
	);

	$footerCollectionJSForExtensions->join( TRUE );
	$footerCollectionJSForExtensions->setTargetPath( "{$jsCacheDir}{$resultCombinedName}footer.min.js" );
	$footerCollectionJSForExtensions->setTargetUri( "public/js/cache/{$resultCombinedName}footer.min.js?{$version}" );
	$footerCollectionJSForExtensions->addFilter(
		new Phalcon\Assets\Filters\Jsmin()
	);

	return $manager;
} );