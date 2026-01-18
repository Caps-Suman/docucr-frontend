# Settings Component

## Overview
The Settings component provides configuration options for the docucr application. Currently, it includes the Document Listing View configuration.

## Features

### Document Listing View Configuration
- **Column Management**: Configure which columns to display in the document listing page
- **Drag & Drop Reordering**: Change the order of columns by dragging and dropping
- **System Fields**: Built-in document fields (Name, Type, Size, Upload Date, Status, Actions)
- **Form Fields**: Dynamic fields from active forms can be added as columns
- **Visibility Toggle**: Show/hide columns with a simple toggle
- **Preview**: Real-time preview of how the table will look
- **Persistence**: Configuration is saved to localStorage

## Usage

### Accessing Settings
Navigate to `/settings` in the application. The Settings tab should be available in the sidebar if the user has appropriate permissions.

### Configuring Document Listing
1. Go to Settings > Document Listing View
2. Use the eye icon to toggle column visibility
3. Drag columns using the grip handle to reorder
4. Preview changes in the preview section
5. Click "Save Changes" to persist configuration
6. Use "Reset to Default" to restore original settings

## Technical Details

### Components
- `Settings.tsx` - Main settings container with tab navigation
- `DocumentListingView.tsx` - Document listing configuration component

### Data Storage
- Configuration is stored in `localStorage` under the key `documentListingColumns`
- Automatically loads form fields from active forms as additional column options

### Column Types
- **System Columns**: Built-in fields that are always available
- **Form Columns**: Dynamic fields from document forms (when available)

### Integration
The configuration will be used by the DocumentList component to customize the table display based on user preferences.

## Future Enhancements
- Backend API integration for user-specific settings
- Additional configuration options (filters, sorting preferences)
- Export/import configuration
- Role-based column permissions