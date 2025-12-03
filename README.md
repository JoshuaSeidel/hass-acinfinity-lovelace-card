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

## Installation

### HACS (Recommended)

1. Open HACS in Home Assistant
2. Click on "Frontend"
3. Click the three dots in the top right corner
4. Select "Custom repositories"
5. Add this repository URL: `https://github.com/JoshuaSeidel/hass-acinfinity-lovelace-card`
6. Select category: "Lovelace"
7. Click "Add"
8. Find "AC Infinity Lovelace Card" in the list and click "Install"
9. Restart Home Assistant

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

## Entity Auto-Detection

The card automatically detects entities from the AC Infinity integration:

- **Temperature Sensors**: `sensor.*_temperature`, `sensor.*_tent_temperature`, `sensor.*_controller_temperature`
- **Humidity Sensors**: `sensor.*_humidity`, `sensor.*_tent_humidity`
- **VPD Sensors**: `sensor.*_vpd`, `sensor.*_tent_vpd`
- **Port Entities**: `sensor.*_port_*`, `binary_sensor.*_port_*`, `switch.*_port_*`
- **Port Power**: `sensor.*_port_*_speak`, `sensor.*_port_*_current_power`
- **Port Mode**: `select.*_port_*_active_mode`

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
