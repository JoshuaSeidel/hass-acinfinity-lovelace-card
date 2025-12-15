# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2024-12-15

### Added - Multi-Device Support 🎛️🔌
This release adds support for different types of AC Infinity devices with adaptive displays.

**Device Type Detection:**
- ✅ **Auto-detect device type** - Automatically identifies controllers vs outlets
- ✅ **Controller support** - AI+ Controller with 8 ports and environmental sensors
- ✅ **Outlet support** - AI+ Outlet with 8 smart outlets (no environmental sensors)
- ✅ **Adaptive UI** - Display changes based on device capabilities

**Outlet-Specific Features:**
- 🔌 **Outlet icon** - Shows plug icon instead of port icon
- 🔌 **Outlet labels** - Uses "OUTLETS" instead of "PORTS" throughout UI
- 🔌 **Simplified display** - No temperature/humidity display for outlet-only devices
- 🔌 **Status indicators** - Shows ON/OFF status for each outlet

**Controller Features:**
- 🎛️ **Full sensor display** - Temperature, humidity, VPD readings as before
- 🎛️ **Port device types** - Shows what's connected to each port
- 🎛️ **Environmental controls** - Mode, scheduling, and automation displays
- 🎛️ **Specialty sensors** - Moisture, CO2, UV sensor support

**Configuration Options:**
- ⚙️ **Device type selector** - Manual override in visual editor
- ⚙️ **Auto-detect by default** - Smart detection based on available entities
- ⚙️ **Per-device settings** - Each card can display different device types

**Enhanced Logging:**
- 🔍 **Device type indicators** - Console shows 🔌 for outlets, 🎛️ for controllers
- 🔍 **Detection details** - See why device was classified as outlet vs controller

**What This Enables:**
- ✅ Support for AC Infinity AI+ Outlet (8 smart plugs)
- ✅ Support for AC Infinity AI+ Controller (with environmental sensors)
- ✅ Multiple device types on same dashboard
- ✅ Automatic adaptation to device capabilities

**Example Configurations:**

For an AI+ Controller:
```yaml
type: custom:ac-infinity-card
title: Grow Tent Controller
auto_detect: true
device_type: controller  # optional, auto-detected
```

For an AI+ Outlet:
```yaml
type: custom:ac-infinity-card
title: Smart Outlets
auto_detect: true
device_type: outlet  # optional, auto-detected
```

## [1.1.3] - 2024-12-15

### Fixed - Browser Cache Issues 🔄
This release adds multiple cache-busting mechanisms to ensure users always get the latest version.

**Cache Prevention Features:**
- ✅ **VERSION constant** - Single source of truth for version number throughout the code
- ✅ **Version in card registration** - Helps Home Assistant track card versions
- ✅ **Load timestamp logging** - Console shows exact time and version loaded
- ✅ **Duplicate version detection** - Warns users if multiple versions are cached
- ✅ **Dynamic version display** - Card footer shows actual loaded version from constant

**Documentation Improvements:**
- 📚 **Enhanced troubleshooting guide** - Step-by-step cache clearing instructions
- 📚 **Version parameter in examples** - Shows how to add `?v=X.X.X` to resource URLs
- 📚 **Browser-specific instructions** - Clear cache steps for Chrome, Firefox, Safari, Edge
- 📚 **Console debugging tips** - How to verify which version is actually loaded

**What This Fixes:**
- ❌ Old version displaying after update → ✅ Better detection and user warnings
- ❌ Version number not updating → ✅ Single VERSION constant used everywhere
- ❌ No way to verify loaded version → ✅ Console logs with timestamps
- ❌ Silent cache issues → ✅ Warnings when multiple versions detected

**User Actions Required:**
After updating, users should:
1. Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)
2. Check browser console for version confirmation
3. For manual installs: Update resource URL to include `?v=1.1.3`

## [1.1.2] - 2024-12-15

### Fixed - Major Detection Improvements 🔧
This release completely overhauls the entity auto-detection system to be more reliable and robust.

**Sensor Detection Fixes:**
- ✅ **Added integration attribute check** - Now properly checks `integration: 'ac_infinity'` attribute (most reliable method)
- ✅ **Improved pattern matching** - More comprehensive patterns for temperature, humidity, VPD, and port entities
- ✅ **Better exclusion filters** - Excludes utility meters and other non-AC Infinity entities more effectively
- ✅ **Fallback detection** - If integration attribute is missing, uses smart pattern matching as backup

**Port Detection Fixes:**
- ✅ **Simplified port detection logic** - Removed complex 3-pass system that was causing missed entities
- ✅ **Regex-based port matching** - Now matches `port_1`, `port 1`, `port_1_status`, etc. more reliably
- ✅ **Entity type awareness** - Better handling of switch, sensor, number, and select entities
- ✅ **Prevents duplicate assignments** - Each port property only assigned once to avoid conflicts
- ✅ **Flexible naming support** - Works with various entity naming conventions

**Enhanced Logging:**
- 🔍 **Detailed console output** - See exactly what entities were found and how they were grouped
- 🔍 **Color-coded logs** - Easy to spot in browser console
- 🔍 **Per-controller breakdown** - Shows all sensors and ports detected for each controller
- 🔍 **Debug-friendly** - Helps troubleshoot detection issues quickly

**What This Fixes:**
- Sensors not auto-detecting → Now detects via integration attribute + pattern matching
- Ports not being detected → Simplified logic catches more port entity variations
- Silent failures → Enhanced logging shows exactly what was found/missed
- Multiple controllers → Better device_id grouping and controller selection

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
