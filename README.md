# AC Infinity Lovelace Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/custom-components/hacs)
[![GitHub Release](https://img.shields.io/github/release/JoshuaSeidel/hass-acinfinity-lovelace-card.svg)](https://github.com/JoshuaSeidel/hass-acinfinity-lovelace-card/releases)
[![License](https://img.shields.io/github/license/JoshuaSeidel/hass-acinfinity-lovelace-card.svg)](LICENSE)

A custom Lovelace card for Home Assistant that replicates the AC Infinity A+ Controller interface. This card automatically detects and displays all AC Infinity devices integrated through the [AC Infinity Integration](https://github.com/JoshuaSeidel/homeassistant-acinfinity).

![AC Infinity Card Preview](https://raw.githubusercontent.com/JoshuaSeidel/hass-acinfinity-lovelace-card/main/preview.png)

## Features

✨ **Authentic Interface** - Matches the look and feel of the AC Infinity A+ Controller display

🔄 **Auto-Detection** - Automatically finds and displays all AC Infinity entities from your integration

📊 **Real-Time Data** - Shows:
- Temperature, Humidity, and VPD readings
- Port status and power levels (1-8 ports)
- Controller mode and status
- Time display

🎨 **Modern Design** - Clean, responsive interface that works on desktop and mobile

⚡ **Interactive** - Click on ports and sensors to access detailed entity controls

## Prerequisites

This card requires the [AC Infinity Home Assistant Integration](https://github.com/JoshuaSeidel/homeassistant-acinfinity) to be installed and configured.

## Requirements

- Home Assistant 2023.1 or newer
- [AC Infinity Integration](https://github.com/JoshuaSeidel/homeassistant-acinfinity) installed and configured
- AC Infinity A+ Controller with entities created in Home Assistant

## Installation

### Via HACS (Recommended)

1. Open HACS in your Home Assistant instance
2. Click on "Frontend"
3. Click the menu (three dots) in the top right
4. Select "Custom repositories"
5. Add this repository URL: `https://github.com/JoshuaSeidel/hass-acinfinity-lovelace-card`
6. Select category: "Dashboard"
7. Click "Add"
8. Find "AC Infinity Controller Card" and click "Download"
9. Restart Home Assistant
10. Clear your browser cache (Ctrl+F5 / Cmd+Shift+R)

### Manual Installation

1. Download `ac-infinity-card.js` and `ac-infinity-card-editor.js` from the [latest release](https://github.com/JoshuaSeidel/hass-acinfinity-lovelace-card/releases)
2. Copy both files to your `config/www` folder
3. Add the following to your Lovelace resources (Settings → Dashboards → Resources):
   ```yaml
   url: /local/ac-infinity-card.js
   type: module
   ```
4. Restart Home Assistant

## Usage

### Basic Configuration

Add the card to your Lovelace dashboard:

```yaml
type: custom:ac-infinity-card
title: Grow Tent Controller
auto_detect: true
show_ports: true
show_sensors: true
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | string | `"AC Infinity Controller"` | Display name for the controller |
| `auto_detect` | boolean | `true` | Automatically detect AC Infinity entities |
| `show_ports` | boolean | `true` | Display port status list |
| `show_sensors` | boolean | `true` | Show temperature, humidity, and VPD |

### Visual Editor

The card includes a visual editor accessible through the Lovelace UI:

1. Enter edit mode on your dashboard
2. Click "Add Card"
3. Search for "AC Infinity Controller Card"
4. Configure using the visual interface

## Card Layout

The card replicates the AC Infinity A+ Controller display with:

### Header Section
- AC Infinity branding with AI badge
- WiFi and cloud connectivity status
- Current time display

### Left Section (Port List)
- Displays all 8 ports with their status
- Shows current power level (0-10) or OFF
- Click any port to access detailed controls

### Center Display
- Large temperature reading
- Current mode indicator (AUTO, ON, OFF, etc.)
- Status messages (HIGH TEMP, etc.)

### Right Section
- Current readings for:
  - Humidity (%)
  - Temperature (°F)
  - Secondary humidity (%)
  - VPD (kPa)
- "SET TO" target value display

### Footer
- AC Infinity branding

## How It Works

### Entity Auto-Detection

The card automatically detects AC Infinity entities by checking if the entity's `integration` attribute equals `'ac_infinity'`. This is the proper way to identify entities from the AC Infinity integration.

Entities are then categorized by their names:
- **Probe/Tent sensors**: Names containing "tent_temperature", "tent_humidity", "tent_vpd", "probe_temperature", etc.
- **Controller sensors**: Names containing "built_in_temperature", "built_in_humidity", "built_in_vpd", "controller_temperature", etc.
- **Port entities**: Names containing "port_1", "port_2", etc. with state, power, or mode indicators

The card groups entities by device and displays:
- **Left side**: Port list with power status (when show_ports is enabled)
- **Center**: Large temperature display with humidity and VPD from tent probe
- **Right side**: Controller built-in sensor readings

### Detected Sensors:

- **Probe/Tent Sensors** (Center Display - Primary):
  - Entities with "tent_temperature", "probe_temperature" in name or friendly name
  - Entities with "tent_humidity", "probe_humidity" in name or friendly name
  - Entities with "tent_vpd", "probe_vpd" in name or friendly name

- **Controller Sensors** (Right Side - Secondary):
  - Entities with "controller_temperature", "built_in_temperature" in name or friendly name
  - Entities with "controller_humidity", "built_in_humidity" in name or friendly name
  - Entities with "controller_vpd", "built_in_vpd" in name or friendly name

- **Port Entities** (Left Side):
  - Binary sensors and switches with "port" and a number
  - Sensors with "speak", "current_power", or "power" (power level)
  - Selects with "active_mode" or "mode"

The card groups entities by `device_id` attribute and displays the first detected controller.

### Manual Configuration

If auto-detection doesn't work, you can manually configure entities in the visual editor.

## Examples

### Multiple Controllers

If you have multiple AC Infinity controllers, add a card for each:

```yaml
type: vertical-stack
cards:
  - type: custom:ac-infinity-card
    title: Grow Tent 1
  - type: custom:ac-infinity-card
    title: Grow Tent 2
```

### Combined with Other Cards

```yaml
type: horizontal-stack
cards:
  - type: custom:ac-infinity-card
    title: Climate Controller
  - type: entities
    title: Quick Controls
    entities:
      - select.grow_tent_port_1_active_mode
      - number.grow_tent_port_1_on_power
```

## Troubleshooting

### Card Not Showing

1. Verify the AC Infinity integration is installed and working
2. Check that you have AC Infinity entities in Developer Tools → States
3. Clear your browser cache (Ctrl+F5 or Cmd+Shift+R)
4. Check the browser console for errors (F12)

### Entities Not Detected

The card looks for entities with specific naming patterns. If your entities have custom names:

1. Check entity IDs in Developer Tools → States
2. Look for entities starting with the AC Infinity domain
3. Ensure entities have the correct device_id attribute

### Styling Issues

If the card doesn't display correctly:
- Ensure you're using a modern browser (Chrome, Firefox, Safari, Edge)
- Try clearing browser cache
- Check for conflicting custom themes

## Development

To contribute or modify the card:

```bash
# Clone the repository
git clone https://github.com/JoshuaSeidel/hass-acinfinity-lovelace-card.git
cd hass-acinfinity-lovelace-card

# Make your changes to ac-infinity-card.js

# Test by copying to your Home Assistant www folder
cp ac-infinity-card.js /path/to/homeassistant/www/
```

## Support

- **Issues**: [GitHub Issues](https://github.com/JoshuaSeidel/hass-acinfinity-lovelace-card/issues)
- **Integration**: [AC Infinity Integration](https://github.com/JoshuaSeidel/homeassistant-acinfinity)
- **Discussions**: [GitHub Discussions](https://github.com/JoshuaSeidel/hass-acinfinity-lovelace-card/discussions)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Credits

- Created by [Joshua Seidel](https://github.com/JoshuaSeidel)
- Designed to work with the [AC Infinity Home Assistant Integration](https://github.com/JoshuaSeidel/homeassistant-acinfinity)
- Interface inspired by the AC Infinity A+ Controller

## Changelog

### v1.0.2 (2024-12-03)
- Fixed entity auto-detection using correct MAC address pattern
- Complete UI redesign to match AC Infinity A+ Controller
- Added manual entity configuration support
- Improved probe/tent vs controller sensor detection
- Enhanced visual editor

### v1.0.0 (2024-12-02)
- Initial release
- Auto-detection of AC Infinity entities
- Replica of A+ Controller interface
- Support for 8 ports
- Real-time sensor display
- Interactive port controls
- Visual configuration editor

---

**Made with ❤️ for the Home Assistant and AC Infinity community**
