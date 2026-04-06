<!DOCTYPE html>
<html lang="en">
<head>
    <title>OAuth2 Callback</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="/admin-cabinet/assets/css/vendor/semantic/semantic.min.css">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            background: #f1f4f5; /* Стандартный фон MikoPBX */
        }

        .oauth-callback-container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 25px rgba(34, 36, 38, 0.15);
            padding: 2.5rem;
            text-align: center;
            min-width: 300px;
            max-width: 450px;
        }

        .oauth-callback-container h2 {
            margin: 1rem 0;
            font-weight: 600;
            font-size: 1.5rem;
        }

        .oauth-callback-container p {
            margin: 1rem 0;
            color: rgba(0, 0, 0, 0.6);
            line-height: 1.4;
        }

        /* Success state */
        .success h2 {
            color: #21ba45; /* Fomantic UI green */
        }

        .success .ui.icon {
            color: #21ba45;
        }

        /* Error state */
        .error h2 {
            color: #db2828; /* Fomantic UI red */
        }

        .error .ui.icon {
            color: #db2828;
        }

        /* Loading spinner */
        .ui.loader:not(.inline):not(.inline.centered),
        .ui.loader:not(.inline):not(.inline.centered):after {
            position: absolute;
            top: 50%;
            left: 50%;
            margin: -1em 0 0 -1em;
        }

        .processing .ui.loader {
            color: #2185d0; /* Fomantic UI blue */
        }

        /* Custom spinner for better visibility */
        .oauth-spinner {
            width: 40px;
            height: 40px;
            margin: 0 auto 1.5rem;
            border: 3px solid #f3f4f6;
            border-top: 3px solid #2185d0;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* Icons */
        .oauth-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
            display: block;
        }

        /* Hide spinner when not processing */
        .success .oauth-spinner,
        .error .oauth-spinner {
            display: none;
        }

        /* Show appropriate icons */
        .processing .oauth-icon {
            display: none;
        }

        .success .oauth-icon:before {
            content: '\2713'; /* Checkmark */
        }

        .error .oauth-icon:before {
            content: '\2717'; /* X mark */
        }

        /* Close button styling */
        .ui.button.close-button {
            margin-top: 1.5rem;
            min-width: 120px;
        }
    </style>
</head>
<body>
    <div class="oauth-callback-container processing" id="oauth-container">
        <!-- Loading spinner -->
        <div class="oauth-spinner"></div>

        <!-- Status icon (hidden initially) -->
        <i class="oauth-icon"></i>

        <!-- Status text -->
        <h2 id="status-text">{{ t._('ms_ProcessingAuthorization') | default('Processing authorization...') }}</h2>

        <!-- Message -->
        <p id="message-text"></p>

        <!-- Close button (hidden initially) -->
        <button class="ui button close-button" id="close-button" onclick="closeWindow()" style="display: none;">
            {{ t._('pr_Close') | default('Закрыть') }}
        </button>
    </div>

    <script>
        // Load translations for standalone page
        const globalTranslate = {
            ms_AuthorizationSuccessful: '{{ t._('ms_AuthorizationSuccessful') }}',
            ms_AuthorizationFailed: '{{ t._('ms_AuthorizationFailed') }}',
            pr_Close: '{{ t._('pr_Close') }}',
            ms_OAuth2AuthorizationSuccess: '{{ t._('ms_OAuth2AuthorizationSuccess') }}',
            ms_OAuth2ProcessingFailed: '{{ t._('ms_OAuth2ProcessingFailed') }}',
            ms_OAuth2MissingParameters: '{{ t._('ms_OAuth2MissingParameters') }}',
            ms_OAuth2AccessDenied: '{{ t._('ms_OAuth2AccessDenied') }}',
            ms_OAuth2InvalidRequest: '{{ t._('ms_OAuth2InvalidRequest') }}',
            ms_OAuth2InvalidClient: '{{ t._('ms_OAuth2InvalidClient') }}',
            ms_OAuth2InvalidGrant: '{{ t._('ms_OAuth2InvalidGrant') }}',
            ms_OAuth2UnauthorizedClient: '{{ t._('ms_OAuth2UnauthorizedClient') }}',
            ms_OAuth2UnsupportedGrantType: '{{ t._('ms_OAuth2UnsupportedGrantType') }}',
            ms_OAuth2InvalidScope: '{{ t._('ms_OAuth2InvalidScope') }}',
            ms_OAuth2ServerError: '{{ t._('ms_OAuth2ServerError') }}',
            ms_OAuth2TemporarilyUnavailable: '{{ t._('ms_OAuth2TemporarilyUnavailable') }}'
        };

        // Get data from controller
        const success = {{ success is defined ? (success ? 'true' : 'false') : 'false' }};
        const messageKey = {{ messageKey is defined ? ('"' ~ messageKey ~ '"') : 'null' }};

        // Get translated message using globalTranslate
        let message = '';
        if (messageKey && typeof globalTranslate !== 'undefined' && globalTranslate[messageKey]) {
            message = globalTranslate[messageKey];
        }

        // Function to close window
        function closeWindow() {
            // Send message to parent window if exists
            if (window.opener) {
                window.opener.postMessage({
                    type: 'oauth2-callback',
                    success: success,
                    message: message
                }, '*');
                window.close();
            } else {
                // If no parent window, redirect to mail settings
                window.location.href = '/admin-cabinet/mail-settings/modify';
            }
        }

        // Update UI based on result
        function updateUI() {
            const container = document.getElementById('oauth-container');
            const statusText = document.getElementById('status-text');
            const messageText = document.getElementById('message-text');
            const closeButton = document.getElementById('close-button');

            // Remove processing state
            container.classList.remove('processing');

            if (success) {
                container.classList.add('success');
                statusText.textContent = globalTranslate.ms_AuthorizationSuccessful;
                closeButton.textContent = globalTranslate.pr_Close;
                closeButton.className = 'ui green button close-button';
            } else {
                container.classList.add('error');
                statusText.textContent = globalTranslate.ms_AuthorizationFailed;
                closeButton.textContent = globalTranslate.pr_Close;
                closeButton.className = 'ui red button close-button';
            }

            if (message) {
                messageText.textContent = message;
            }

            // Show close button
            closeButton.style.display = 'inline-block';
        }

        // Initialize immediately if we have results
        if (success !== undefined) {
            // Small delay to show the processing state briefly
            setTimeout(updateUI, 500);
        } else {
            // Handle URL parameters for direct access
            const urlParams = new URLSearchParams(window.location.search);
            const error = urlParams.get('error');
            const errorDescription = urlParams.get('error_description');

            if (error) {
                // Show error immediately
                setTimeout(() => {
                    document.getElementById('oauth-container').classList.remove('processing');
                    document.getElementById('oauth-container').classList.add('error');
                    document.getElementById('status-text').textContent = globalTranslate.ms_AuthorizationFailed;
                    document.getElementById('message-text').textContent = errorDescription || error;
                    document.getElementById('close-button').style.display = 'inline-block';
                    document.getElementById('close-button').textContent = globalTranslate.pr_Close;
                    document.getElementById('close-button').className = 'ui red button close-button';
                }, 500);
            }
        }
    </script>
</body>
</html>