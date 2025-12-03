# Changelog

All notable changes to this project will be documented in this file.

## [1.0.6] - 2024-12-03

### COMPLETE VISUAL REWRITE - EXACT HARDWARE MATCH
This version is a complete from-scratch rebuild to match the AC Infinity A+ Controller hardware EXACTLY as shown in the image.

**EVERY UI Element Now Included:**
- ✅ **Wide landscape layout** - 900px minimum width matching actual controller
- ✅ **Top Bar** - AI badge left, WiFi/Cloud icons center, **Current Time upper right**
- ✅ **Left Section** - Port button, Mode button, all 8 ports with green indicators, Settings button, Probe Temperature label
- ✅ **Center Section** - Massive 180px temperature display, humidity/VPD readings, mode status, Controller Mode label
- ✅ **Right Section** - Probe Humidity label, Up/Down button, controller temp with cloud icon, controller humidity with water drop icon, Current Level indicator, Countdown display, SET TO display, User Setting label, Probe VPD label
- ✅ **Bottom Bar** - AC INFINITY branding
- ✅ **All Labels** - Matching blue color (#6db3d4) from hardware image annotations
- ✅ **Proper Spacing** - Authentic gaps and sizing matching real hardware
- ✅ **Live Time** - Updates every minute automatically

**What Changed:**
- Grid layout: 220px | 1fr | 320px (left | center | right)
- Added time display with auto-refresh
- Added disconnectedCallback to clean up timer
- All button labels and section labels now visible
- Controller temperature and humidity sensors on right side
- Proper icon usage (cloud ☁️, water drops 💧)
- Green port indicators when active
- Responsive design for smaller screens

## [1.0.5] - 2024-12-03

### Fixed
- **Entity auto-detection improved** - Now properly detects entities from AC Infinity integration
- Removed incorrect `integration` attribute check (entities don't expose this)
- Added pattern matching for AC Infinity entity naming conventions
- Better detection of tent/probe sensors, controller sensors, and port entities
- Added helpful documentation about entity naming requirements

## [1.0.4] - 2024-12-03

### Complete Visual Redesign to Match Hardware
- **Exact hardware replication** - Card now looks identical to actual AC Infinity A+ Controller
- **Proper 3-column layout** - Left (ports), Center (main temp), Right (controller sensors)
- **All 8 ports displayed** - Shows all ports 1-8 with proper status indicators
- **Enhanced sensor display** - Cloud icon and water drop icons match hardware
- **Added "SET TO" display** - Shows target temperature at bottom right
- **Arrow buttons** - Up/down navigation buttons on right side
- **Better port icons** - Color-coded status indicators (off, low, medium, high)
- **Improved spacing** - Matches hardware proportions and layout exactly

## [1.0.3] - 2024-12-03

### Complete Rewrite
- **Rewrote card using LitElement** - Modern Home Assistant best practices
- **Fixed entity detection** - Properly detects AC Infinity entities by integration attribute
- **Added missing UI elements** - Left side menu/settings buttons now present
- **Fixed editor** - Proper LitElement implementation with reactive properties
- **Enhanced port display** - Shows port names and better power status
- **Improved performance** - Better state management and rendering

## [1.0.2] - 2024-12-03

### Fixed
- ✅ Entity auto-detection now correctly checks `integration` attribute for 'ac_infinity'
- ✅ Proper detection of all entities from AC Infinity integration
- ✅ Corrected entity categorization using friendly names and entity IDs
- ✅ Fixed HACS validation action to use 'dashboard' category instead of 'plugin'

### Changed
- Complete UI redesign to accurately match AC Infinity A+ Controller interface
- Center display now shows probe/tent temperature (primary reading)
- Right side displays controller built-in sensors (secondary readings)
- Improved styling with proper spacing, sizing, and colors to match hardware
- Simplified layout with proper three-column grid structure

## [1.0.0] - 2024-12-02

### Initial Release
- Auto-detection of AC Infinity entities
- Replica of A+ Controller interface
- Support for 8 ports
- Temperature, humidity, and VPD displays
- Port status indicators
