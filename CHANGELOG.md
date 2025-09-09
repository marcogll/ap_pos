# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.4] - 2025-09-09

### Added
- **Visual clear form tip**: Added visible tip in interface showing correct keyboard shortcut
  - Automatically detects Mac vs Windows/Linux operating system
  - Shows 'Cmd + Shift + R' on Mac systems
  - Shows 'Ctrl + Shift + R' on Windows/Linux systems
  - Clean, non-intrusive design with blue accent border
  - Positioned below 'Generar Venta' button for easy visibility

### Technical
- JavaScript OS detection using `navigator.platform`
- Dynamic content update based on detected operating system
- CSS styling for `.clear-form-tip` class with responsive design
- Updated cache-busting version for immediate loading

## [1.5.3] - 2025-09-08

### Fixed
- **Date formatting bug**: Resolved critical bug showing "undefined" in ticket receipts
- **esc() function**: Fixed regex pattern that was corrupting date slashes
- **Date validation**: Improved robust date handling throughout the system

### Improved
- **Ticket layout**: All ticket content now left-aligned for better readability
- **Interface compactness**: Reduced product card spacing for less scrolling
- **Auto-collapse**: Product categories automatically collapse after adding items
- **User experience**: Streamlined workflow and cleaner interface

### Removed
- **Clear form button**: Removed problematic clear button per user feedback

### Added
- **Favicon integration**: Complete favicon support across all pages
  - Apple Touch Icon (180x180) for iOS devices
  - Standard favicons (16x16, 32x32) for browsers
  - High-resolution icons (192x192, 512x512) for PWA support
  - Web manifest for progressive web app installation
  - Professional branding across all device types

## [1.5.0] - 2025-09-07

### Added
- **Dashboard reorganization**: New sub-tab structure in sales section
  - "💰 Ventas" sub-tab for active sales operations
  - "🎫 Tickets" sub-tab for sales history and reports
- **Advanced anticipos system**: 
  - Manual anticipo application for unregistered payments
  - Security checkbox confirmation for manual anticipos
  - Automatic integration with discount system
  - Duplication prevention controls

### Improved
- **Client management**: 
  - "Público General" automatic system for anonymous sales
  - Optional client field (no longer mandatory)
  - Generic ticket support for walk-in customers
- **Visual enhancements**:
  - Solid black header replacing gradient design
  - Improved price alignment with grid layout
  - Consistent color scheme and styling
  - Logical service ordering: Clean Girl → Elegant → Mystery → Seduction

### Technical
- Enhanced database schema with `sort_order` field
- Functional sub-tab navigation with JavaScript
- Reinforced form validation and data controls
- Performance optimizations and code refactoring

## [1.4.1] - 2025-09-06

### Fixed
- Production environment issues in VPS deployment
- Database connection stability improvements
- Error handling enhancements

## [1.4.0] - 2025-09-05

### Added
- Product import functionality with CSV support
- Multiple payment method options
- Enhanced checkout flow

### Improved
- User interface consistency
- Form validation and error handling

## [1.3.7] - 2025-09-04

### Fixed
- Critical bug fixes in payment processing
- Database integrity improvements
- UI responsiveness issues

### Enhanced
- Security improvements
- Performance optimizations

---

## Docker Images

All versions are available on Docker Hub:

```bash
# Latest stable version
docker pull marcogll/ap-pos:latest

# Specific version
docker pull marcogll/ap-pos:1.5.4
```

### Version Tags Available:
- `latest` - Always points to the most recent stable release
- `1.5.4` - Visual clear form tip with OS detection
- `1.5.3` - Date fixes and favicon integration  
- `1.5.2` - Interface improvements
- `1.5.1` - Bug fixes and optimizations
- `1.5.0` - Major UI overhaul and anticipos system
- `1.4.1` - Production stability fixes
- `1.4.0` - Product import and payment methods
- `1.3.7` - Core functionality and bug fixes

## Migration Notes

### From 1.5.x to 1.5.4
- No database changes required
- New visual tip will appear automatically
- OS detection works immediately on page load

### From 1.4.x to 1.5.x
- Database will auto-upgrade with new fields
- Existing data remains intact
- New sub-tab structure provides better organization

### From 1.3.x to 1.4.x
- Backup recommended before upgrade
- New payment methods will be available
- Enhanced product management features

## Support

For issues, feature requests, or contributions, please visit the project repository or contact the development team.