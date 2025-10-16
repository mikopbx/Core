# MikoPBX Email Template Documentation

## Overview

This is a universal, responsive HTML email template system designed for MikoPBX transactional emails. The template follows modern email development best practices and is compatible with all major email clients.

## Features

- **Universal Template**: Single template for all notification types
- **Responsive Design**: Adapts to mobile and desktop screens
- **Inline Styles**: All CSS is inline for maximum compatibility
- **Multi-language Support**: Template variables support localization
- **Dark Mode Friendly**: Works with email clients' dark mode
- **Accessibility**: Proper semantic HTML and ARIA attributes
- **MSO Compatibility**: Special handling for Outlook clients

## Template Structure

### Main Components

1. **Header Section**
   - Gradient background (customizable colors)
   - Notification icon (emoji or Unicode symbol)
   - Email title

2. **Server Identification Bar**
   - Server name display
   - Timestamp
   - Visual separator from content

3. **Content Area**
   - Main message
   - Dynamic content blocks
   - Information boxes
   - Data tables
   - Call-to-action buttons

4. **Footer Section**
   - Footer message
   - Unsubscribe link (optional)
   - Powered by attribution (optional)

## Template Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `EMAIL_SUBJECT` | Email subject line | "Disk Space Warning" |
| `EMAIL_TITLE` | Header title | "Critical Alert" |
| `SERVER_NAME` | Server identification | "pbx.company.com" |
| `TIMESTAMP` | Current time | "2024-01-15 14:30:00" |
| `MAIN_MESSAGE` | Primary message content | "Your server needs attention" |

### Style Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `HEADER_COLOR_START` | Gradient start color | "#4834d4" |
| `HEADER_COLOR_END` | Gradient end color | "#686de0" |
| `NOTIFICATION_ICON` | Header icon (emoji) | "📧" |
| `INFO_BOX_COLOR` | Info box accent color | "#007bff" |
| `CTA_COLOR` | Button color | "#007bff" |

### Conditional Sections

Use these boolean flags to show/hide sections:

- `IF_INFO_BOX` - Show information box
- `IF_DATA_TABLE` - Show data table
- `IF_CTA_BUTTON` - Show call-to-action button
- `IF_HELP_TEXT` - Show help text
- `IF_UNSUBSCRIBE` - Show unsubscribe link
- `IF_POWERED_BY` - Show powered by attribution

## Usage Examples

### 1. Disk Space Warning

```php
$template = file_get_contents('mikopbx-email-template.html');

// Replace variables for disk warning
$variables = [
    'HEADER_COLOR_START' => '#ff6b6b',
    'HEADER_COLOR_END' => '#ee5a24',
    'NOTIFICATION_ICON' => '⚠️',
    'EMAIL_TITLE' => 'Disk Space Warning',
    'MAIN_MESSAGE' => 'Your server is running low on disk space.',
    // ... other variables
];

foreach ($variables as $key => $value) {
    $template = str_replace('{{' . $key . '}}', $value, $template);
}

// Remove conditional blocks that are not needed
$template = preg_replace('/{{#IF_UNSUBSCRIBE}}.*?{{\/IF_UNSUBSCRIBE}}/s', '', $template);
```

### 2. Color Schemes by Notification Type

| Notification Type | Start Color | End Color | Icon |
|------------------|-------------|-----------|------|
| Critical/Warning | #ff6b6b | #ee5a24 | ⚠️ |
| Security | #ffa502 | #ff6348 | 🔐 |
| Information | #4834d4 | #686de0 | ℹ️ |
| Success | #20bf6b | #26de81 | ✅ |
| Updates | #6c5ce7 | #a29bfe | 🔄 |
| Communication | #00d2d3 | #01a3a4 | 📞 |

## Localization

The template supports multiple languages through variable substitution:

```php
// Language strings array
$lang = [
    'en' => [
        'server_label' => 'Server',
        'footer_message' => 'This is an automated notification',
    ],
    'ru' => [
        'server_label' => 'Сервер',
        'footer_message' => 'Это автоматическое уведомление',
    ],
    'es' => [
        'server_label' => 'Servidor',
        'footer_message' => 'Esta es una notificación automática',
    ]
];

// Use appropriate language
$userLang = 'ru';
$template = str_replace('{{SERVER_LABEL}}', $lang[$userLang]['server_label'], $template);
```

## Best Practices

### 1. Image Handling
- Use emoji/Unicode symbols instead of images when possible
- If images are necessary, host them on HTTPS URLs
- Include alt text for all images
- Keep images under 50KB each

### 2. Content Guidelines
- Keep subject lines under 50 characters
- Main message should be clear and concise
- Use bullet points for lists (in dynamic content)
- Include clear call-to-action when needed

### 3. Testing
- Test with Litmus or Email on Acid
- Check rendering in:
  - Gmail (web, iOS, Android)
  - Outlook (2016, 2019, 365)
  - Apple Mail
  - Yahoo Mail
  - Mobile clients

### 4. Spam Prevention
- Maintain good text-to-image ratio
- Avoid spam trigger words
- Include unsubscribe links where appropriate
- Use authenticated sending (SPF, DKIM, DMARC)

## Dynamic Content Examples

### Data Table Rows
```html
<tr>
    <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #6c757d; padding: 8px 0;">
        Parameter:
    </td>
    <td style="font-family: 'SF Mono', Monaco, 'Courier New', monospace; font-size: 14px; color: #212529; padding: 8px 0; padding-left: 20px;">
        <strong>Value</strong>
    </td>
</tr>
```

### Progress Bar (for disk usage)
```html
<div style="background-color: #f1f3f5; border-radius: 8px; padding: 4px;">
    <div style="background-color: #ff6b6b; width: 85%; height: 30px; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
        85%
    </div>
</div>
```

### Alert Box
```html
<div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 15px; margin: 20px 0;">
    <strong style="color: #856404;">Warning:</strong>
    <span style="color: #856404;">This action requires your attention.</span>
</div>
```

## Integration with MikoPBX

### Email Service Class Example

```php
<?php

namespace MikoPBX\Services;

class EmailService
{
    private string $templatePath = '/path/to/mikopbx-email-template.html';
    
    /**
     * Send notification email
     */
    public function sendNotification(string $type, array $data): bool
    {
        // Load template
        $template = file_get_contents($this->templatePath);
        
        // Get variables based on notification type
        $variables = $this->getVariablesByType($type, $data);
        
        // Replace all variables
        foreach ($variables as $key => $value) {
            if (is_bool($value)) {
                // Handle conditional blocks
                if ($value) {
                    // Keep the block, remove markers
                    $template = str_replace('{{#' . $key . '}}', '', $template);
                    $template = str_replace('{{/' . $key . '}}', '', $template);
                } else {
                    // Remove entire block
                    $pattern = '/{{#' . $key . '}}.*?{{\/' . $key . '}}/s';
                    $template = preg_replace($pattern, '', $template);
                }
            } else {
                // Replace simple variables
                $template = str_replace('{{' . $key . '}}', $value, $template);
            }
        }
        
        // Clean up any remaining variables
        $template = preg_replace('/{{.*?}}/', '', $template);
        
        // Send email
        return $this->send($data['to'], $variables['EMAIL_SUBJECT'], $template);
    }
}
```

## Troubleshooting

### Common Issues

1. **Broken Layout in Outlook**
   - Ensure all widths are specified in pixels
   - Use MSO conditional comments for Outlook-specific fixes
   - Avoid margin and use padding instead

2. **Images Not Displaying**
   - Check that images are hosted on HTTPS
   - Verify image URLs are absolute, not relative
   - Include alt text for when images are blocked

3. **Mobile Responsiveness Issues**
   - Test media queries support
   - Use fluid widths with max-width constraints
   - Ensure touch targets are at least 44x44 pixels

4. **Text Cutoff in Gmail**
   - Keep email size under 102KB
   - Minimize inline CSS repetition
   - Consider linking to full content if needed

## Server Identification

Always include server identification in emails to help users:
- Identify the source of notifications
- Distinguish between multiple PBX systems
- Provide context for support requests

## Security Considerations

1. **Sensitive Data**
   - Never include passwords in plain text
   - Use secure links with tokens for actions
   - Implement email encryption if possible

2. **Phishing Prevention**
   - Always show the server name clearly
   - Use consistent sender addresses
   - Include security notices for sensitive operations

3. **Data Protection**
   - Follow GDPR/privacy regulations
   - Include unsubscribe options where required
   - Log email sending for audit purposes

## Performance Tips

1. Keep total email size under 100KB
2. Minimize HTTP requests (prefer inline styles)
3. Optimize images before embedding
4. Use system fonts for better rendering
5. Preheader text should be 90-150 characters

## Support

For issues or questions about the email template:
- Check email client compatibility guides
- Test with email testing services
- Validate HTML with W3C validator
- Review server mail logs for delivery issues
