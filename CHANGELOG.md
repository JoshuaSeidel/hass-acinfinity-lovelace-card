# Changelog

All notable changes to this project will be documented in this file.

## [1.0.2] - 2024-12-03

### Fixed
### Fixed
- ✅ Entity auto-detection now correctly checks `integration` attribute for 'ac_infinity'
- ✅ Proper detection of all entities from AC Infinity integration
- ✅ Corrected entity categorization using friendly names and entity IDs
- ✅ Fixed HACS validation action to use 'dashboard' category instead of 'plugin'
- Corrected entity detection pattern to match integration's unique_id format: `ac_infinity_{MAC_ADDR}_*`
- Fixed entity categorization for probe/tent sensors vs controller sensors

### Changed
- Complete UI redesign to accurately match AC Infinity A+ Controller interface
- Center display now shows probe/tent temperature (primary reading)
- Right side displays controller built-in sensors (secondary readings)
- Improved styling with proper spacing, sizing, and colors to match hardware
- Simplified layout with proper three-column grid structure
- Enhanced visual editor with manual entity configuration options

### Added
- Manual entity configuration support as fallback to auto-detection
- Support for both probe/tent sensors and controller sensors
- Ability to configure specific entities in Lovelace UI editor
- Better entity detection for various sensor naming patterns

## [1.0.0] - 2024-12-02

### Added
- Initial release of AC Infinity Lovelace Card
- Auto-detection of AC Infinity integration entities
- Replica of AC Infinity A+ Controller interface
- Display for temperature, humidity, and VPD sensors
- Port status display (1-8 ports)
- Interactive port controls
- Visual configuration editor
- HACS support
- Responsive design for mobile and desktop

### Features
- Automatic entity detection from AC Infinity integration
- Real-time sensor updates
- Click-to-control port functionality
- Modern dark theme matching AC Infinity hardware
- Support for multiple controllers
- Configurable display options

[1.0.2]: https://github.com/JoshuaSeidel/hass-acinfinity-lovelace-card/releases/tag/v1.0.2
[1.0.0]: https://github.com/JoshuaSeidel/hass-acinfinity-lovelace-card/releases/tag/v1.0.0
