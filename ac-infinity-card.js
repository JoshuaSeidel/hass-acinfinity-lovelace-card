import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

// VERSION constant for cache busting and version tracking
const VERSION = '1.2.8';

class ACInfinityCard extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
      _entities: { type: Object }
    };
  }

  // Add version getter for cache busting
  static getVersion() {
    return VERSION;
  }

  setConfig(config) {
    if (!config) {
      throw new Error('Invalid configuration');
    }

    this.config = {
      title: config.title || 'AC Infinity Controller',
      show_ports: config.show_ports !== false,
      auto_detect: config.auto_detect !== false,
      selected_controller: config.selected_controller || null, // Controller device_id to display
      device_type: config.device_type || null, // 'controller', 'outlet', or null for auto-detect
      probe_temp_entity: config.probe_temp_entity || null,
      probe_humidity_entity: config.probe_humidity_entity || null,
      probe_vpd_entity: config.probe_vpd_entity || null,
      controller_temp_entity: config.controller_temp_entity || null,
      controller_humidity_entity: config.controller_humidity_entity || null,
      controller_vpd_entity: config.controller_vpd_entity || null,
      // New sensor entity config options
      moisture_entity: config.moisture_entity || null,
      co2_entity: config.co2_entity || null,
      uv_entity: config.uv_entity || null,
      ...config
    };
  }

  set hass(hass) {
    this._hass = hass;
    
    if (this.config?.auto_detect) {
      this._autoDetectEntities();
    }
    
    // Update time every minute
    if (!this._timeInterval) {
      this._timeInterval = setInterval(() => this.requestUpdate(), 60000);
    }
  }

  get hass() {
    return this._hass;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._timeInterval) {
      clearInterval(this._timeInterval);
      this._timeInterval = null;
    }
  }

  _autoDetectEntities() {
    if (!this._hass || !this._hass.states) return;

    const entities = Object.keys(this._hass.states);

    console.log('%c[AC Infinity Card] Entity Detection', 'color: #4CAF50; font-weight: bold');
    console.log(`Scanning ${entities.length} total entities...`);

    // Find ALL AC Infinity entities using entity registry lookup ONLY
    // This matches EXACTLY what integration_entities('ac_infinity') does in templates
    let acInfinityEntities = entities.filter(entity => {
      // ONLY use entity registry - this is the source of truth
      // The entity registry tracks which integration owns each entity
      const entityEntry = this._hass.entities?.[entity];
      
      // Check if this entity belongs to the ac_infinity integration
      // This is EXACTLY what integration_entities() template function uses
      return entityEntry?.platform === 'ac_infinity';
    });

    console.log(`%c[AC Infinity Card] Found ${acInfinityEntities.length} AC Infinity entities`, 
      acInfinityEntities.length > 0 ? 'color: #4CAF50; font-weight: bold' : 'color: #f44336; font-weight: bold');
    
    if (acInfinityEntities.length === 0) {
      console.error('%c[AC Infinity Card] No AC Infinity entities found!', 'color: #f44336; font-weight: bold');
      console.error('Debug info:');
      console.error('- Entity registry available:', !!this._hass.entities);
      console.error('- Total entities:', entities.length);
      console.error('\nTroubleshooting:');
      console.error('1. Check Settings → Devices & Services → AC Infinity');
      console.error('2. Verify devices show entities in Developer Tools → States');
      console.error('3. Try typing an AC Infinity entity ID here to see its data:');
      console.error('   > this._hass.states["sensor.YOUR_ENTITY_ID"]');
      return;
    }
    
    console.log('Sample AC Infinity entities:', acInfinityEntities.slice(0, 5));
    
    const portEntities = acInfinityEntities.filter(e => {
      const entityLower = e.toLowerCase();
      const friendlyName = (this._hass.states[e]?.attributes?.friendly_name || '').toLowerCase();
      return entityLower.match(/(?:port|outlet)[\s_]*\d+/i) || 
             friendlyName.match(/(?:port|outlet)[\s_]*\d+/i);
    });
    console.log(`Found ${portEntities.length} port/outlet entities:`, portEntities);

    const controllers = {};
    
    // Log all AC Infinity entities grouped by device_id to understand structure
    if (acInfinityEntities.length > 0) {
      console.log('%c[AC Infinity Card] Entity Structure Analysis', 'color: #2196F3; font-weight: bold');
      
      // Group by device_id to see the structure
      const byDevice = {};
      acInfinityEntities.forEach(entity => {
        const state = this._hass.states[entity];
        const deviceId = state?.attributes?.device_id || 'no_device_id';
        if (!byDevice[deviceId]) {
          byDevice[deviceId] = [];
        }
        byDevice[deviceId].push({
          entity_id: entity,
          friendly_name: state?.attributes?.friendly_name,
          domain: entity.split('.')[0],
          device_class: state?.attributes?.device_class,
          unit: state?.attributes?.unit_of_measurement
        });
      });
      
      console.log(`Found ${Object.keys(byDevice).length} unique device(s):`);
      Object.entries(byDevice).forEach(([deviceId, entities]) => {
        console.groupCollapsed(`Device: ${deviceId} (${entities.length} entities)`);
        console.log('Sample friendly name:', entities[0]?.friendly_name);
        console.log('All entities:', entities);
        console.groupEnd();
      });
    }
    
    acInfinityEntities.forEach(entity => {
      const state = this._hass.states[entity];
      if (!state) return;
      
      const friendlyName = state.attributes?.friendly_name || '';
      
      // Extract controller name from friendly name (e.g., "Grow Tent Temperature" -> "Grow Tent")
      // Look for common patterns in AC Infinity entity names
      let controllerName = this.config.title || 'AC Infinity';
      if (friendlyName) {
        // Remove common suffixes to get the device name
        const suffixPatterns = [
          / (Temperature|Humidity|VPD|Port \d+.*|Outlet \d+.*|Tent.*|Controller.*|Built-in.*|Current Power|Port Status|Device Type|Mode)$/i,
          / (Probe|Sensor)$/i
        ];
        
        let extractedName = friendlyName;
        for (const pattern of suffixPatterns) {
          extractedName = extractedName.replace(pattern, '').trim();
        }
        
        if (extractedName && extractedName.length > 0) {
          controllerName = extractedName;
        }
      }
      
      // Use device_id if available, otherwise use the extracted controller name as the key
      // This ensures entities from the same controller are grouped together
      const deviceId = state.attributes?.device_id || `name_${controllerName.toLowerCase().replace(/\s+/g, '_')}`;

      if (!controllers[deviceId]) {
        controllers[deviceId] = {
          id: deviceId,
          name: controllerName,
          device_type: null, // Will be detected: 'controller', 'outlet', or 'unknown'
          probe_temperature: null,
          probe_humidity: null,
          probe_vpd: null,
          controller_temperature: null,
          controller_humidity: null,
          controller_vpd: null,
          // Specialty sensors
          moisture: null,
          co2: null,
          uv: null,
          ports: []
        };
      }

      const entityName = entity.toLowerCase();
      const friendlyNameLower = friendlyName.toLowerCase();
      const deviceClass = state.attributes?.device_class;
      const unitOfMeasurement = state.attributes?.unit_of_measurement;
      
      // Detect temperature sensors (probe/tent sensors)
      if (entityName.includes('tent_temperature') || entityName.includes('probe_temperature') || 
          entityName.includes('tent sensor') || entityName.includes('tent probe') ||
          friendlyNameLower.includes('tent temperature') || friendlyNameLower.includes('probe temperature') ||
          friendlyNameLower.includes('tent sensor') || friendlyNameLower.includes('tent probe') ||
          (friendlyNameLower.includes('tent') && deviceClass === 'temperature')) {
        controllers[deviceId].probe_temperature = entity;
      } 
      // Detect humidity sensors (probe/tent sensors)
      else if (entityName.includes('tent_humidity') || entityName.includes('probe_humidity') || 
               friendlyNameLower.includes('tent humidity') || friendlyNameLower.includes('probe humidity') ||
               (friendlyNameLower.includes('tent') && deviceClass === 'humidity')) {
        controllers[deviceId].probe_humidity = entity;
      } 
      // Detect VPD sensors (probe/tent sensors)
      else if (entityName.includes('tent_vpd') || entityName.includes('probe_vpd') || 
               friendlyNameLower.includes('tent vpd') || friendlyNameLower.includes('probe vpd') ||
               (friendlyNameLower.includes('tent') && (entityName.includes('vpd') || friendlyNameLower.includes('vpd')))) {
        controllers[deviceId].probe_vpd = entity;
      }
      // Detect controller/built-in temperature
      else if ((entityName.includes('built_in_temperature') || entityName.includes('controller_temperature') || 
                friendlyNameLower.includes('built-in temperature') || friendlyNameLower.includes('controller temperature') ||
                (friendlyNameLower.includes('controller') && deviceClass === 'temperature'))
               && !entityName.includes('port') && !friendlyNameLower.includes('port')) {
        controllers[deviceId].controller_temperature = entity;
      } 
      // Detect controller/built-in humidity
      else if ((entityName.includes('built_in_humidity') || entityName.includes('controller_humidity') || 
                friendlyNameLower.includes('built-in humidity') || friendlyNameLower.includes('controller humidity') ||
                (friendlyNameLower.includes('controller') && deviceClass === 'humidity'))
                 && !entityName.includes('port') && !friendlyNameLower.includes('port')) {
        controllers[deviceId].controller_humidity = entity;
      } 
      // Detect controller/built-in VPD
      else if ((entityName.includes('built_in_vpd') || entityName.includes('controller_vpd') ||
                friendlyNameLower.includes('built-in vpd') || friendlyNameLower.includes('controller vpd') ||
                (friendlyNameLower.includes('controller') && (entityName.includes('vpd') || friendlyNameLower.includes('vpd'))))
                 && !entityName.includes('port') && !friendlyNameLower.includes('port')) {
        controllers[deviceId].controller_vpd = entity;
      }

      // Specialty sensors - check independently (not else-if) to avoid conflicts
      // Moisture sensors
      if ((entityName.includes('moisture') || entityName.includes('soil') ||
           friendlyNameLower.includes('moisture') || friendlyNameLower.includes('soil'))
          && !entityName.includes('port')) {
        controllers[deviceId].moisture = entity;
      }
      // CO2 sensors
      if ((entityName.includes('co2') || entityName.includes('carbon_dioxide') ||
           friendlyNameLower.includes('co2') || friendlyNameLower.includes('carbon dioxide'))
          && !entityName.includes('port')) {
        controllers[deviceId].co2 = entity;
      }
      // UV sensors
      if ((entityName.includes('uv') || entityName.includes('ultraviolet') ||
           friendlyNameLower.includes('uv') || friendlyNameLower.includes('ultraviolet'))
          && !entityName.includes('port')) {
        controllers[deviceId].uv = entity;
      }
      // Check for port/outlet entities using simplified detection
      const portMatch = entityName.match(/(?:port|outlet)[\s_]*(\d+)/i) || 
                       friendlyNameLower.match(/(?:port|outlet)[\s_]*(\d+)/i);
      
      if (portMatch) {
        const portNum = parseInt(portMatch[1]);
        
        if (!isNaN(portNum) && portNum >= 1 && portNum <= 8) {
          // Find or create port object
          let portObj = controllers[deviceId].ports.find(p => p.number === portNum);
          
          if (!portObj) {
            // Just use Port X as default name - device_type entity will override if available
            portObj = {
              number: portNum,
              name: `Port ${portNum}`,
              state: null,
              power: null,
              mode: null,
              status: null,
              device_type: null
            };
            controllers[deviceId].ports.push(portObj);
          }

          // Assign entity to appropriate port property based on entity type and name
          const entityType = entity.split('.')[0]; // sensor, switch, number, select, etc.
          
          console.log(`[Port ${portNum}] Processing entity: ${entity}`, {
            entityType,
            entityName,
            friendlyName: friendlyName
          });
          
          // Port status sensor (Active/Inactive) - Check for binary_sensor with _status
          if ((entityType === 'binary_sensor' && entityName.includes('status')) || 
              (entityName.includes('port_status') && entityType === 'sensor')) {
            if (!portObj.status) {
              portObj.status = entity;
              console.log(`  ✓ Assigned as STATUS`);
            }
          }
          // Device type sensor (what's connected to the port)
          if (entityName.includes('device_type') || entityName.includes('connected_device')) {
            if (!portObj.device_type) {
              portObj.device_type = entity;
              console.log(`  ✓ Assigned as DEVICE_TYPE`);
            }
          }
          // Current power sensor
          if (entityName.includes('current_power') || entityName.includes('at_power')) {
            if (!portObj.power) {
              portObj.power = entity;
              console.log(`  ✓ Assigned as POWER`);
            }
          }
          // Switch entities (port on/off control)
          if (entityType === 'switch' && !entityName.includes('status')) {
            if (!portObj.state) {
              portObj.state = entity;
              console.log(`  ✓ Assigned as STATE (switch)`);
            }
          }
          // Binary sensor _state entities (port state indicator)
          if (entityType === 'binary_sensor' && entityName.includes('_state') && !entityName.includes('status')) {
            if (!portObj.state) {
              portObj.state = entity;
              console.log(`  ✓ Assigned as STATE (binary_sensor)`);
            }
          }
          // Number entities (power settings)
          if (entityType === 'number' && (entityName.includes('power') || entityName.includes('speed'))) {
            if (!portObj.power) {
              portObj.power = entity;
              console.log(`  ✓ Assigned as POWER (number)`);
            }
          }
          // Select entities (mode)
          if (entityType === 'select' || entityName.includes('mode')) {
            if (!portObj.mode) {
              portObj.mode = entity;
              console.log(`  ✓ Assigned as MODE`);
            }
          }
        }
      }
    });

    // Detect device type and sort ports for each controller
    Object.values(controllers).forEach(controller => {
      controller.ports.sort((a, b) => a.number - b.number);
      
      // Auto-detect device type based on available entities and naming patterns
      if (!controller.device_type) {
        const controllerNameLower = (controller.name || '').toLowerCase();
        
        // Check if it has environmental sensors (strong indicator of controller)
        const hasEnvironmentalSensors = !!(
          controller.probe_temperature || 
          controller.controller_temperature ||
          controller.probe_humidity ||
          controller.controller_humidity ||
          controller.moisture || 
          controller.co2 ||
          controller.probe_vpd ||
          controller.controller_vpd
        );
        
        // Check for outlet naming patterns
        const hasOutletPattern = controllerNameLower.includes('outlet') || 
                                controllerNameLower.includes('plug');
        
        // Check if ports have device types indicating they're outlets
        const portsHaveOutletDevices = controller.ports.some(p => {
          const deviceTypeName = (this._hass.states[p.device_type]?.state || '').toLowerCase();
          return deviceTypeName.includes('outlet');
        });
        
        // Decision logic
        if (hasEnvironmentalSensors) {
          controller.device_type = 'controller';
        } else if (hasOutletPattern || portsHaveOutletDevices) {
          controller.device_type = 'outlet';
        } else if (controller.ports.length > 0) {
          // Has ports but no sensors - likely a controller without sensors connected
          controller.device_type = 'controller';
        } else {
          controller.device_type = 'unknown';
        }
        
        console.log(`[Device Type Detection] "${controller.name}":`, {
          detected_type: controller.device_type,
          has_environmental_sensors: hasEnvironmentalSensors,
          has_outlet_pattern: hasOutletPattern,
          ports_count: controller.ports.length
        });
      }
    });

    this._entities = controllers;
    
    // Enhanced logging for debugging
    const controllerCount = Object.keys(controllers).length;
    console.log(`%c[AC Infinity Card] Detected ${controllerCount} device(s)`, 'color: #4CAF50; font-weight: bold');
    
    if (controllerCount === 0) {
      console.warn('%c[AC Infinity Card] No devices detected! Check that AC Infinity integration entities exist.', 
        'color: #FF9800; font-weight: bold');
    }
    
    Object.values(controllers).forEach((controller, idx) => {
      const deviceTypeEmoji = controller.device_type === 'outlet' ? '🔌' : 
                             controller.device_type === 'controller' ? '🎛️' : '❓';
      
      console.groupCollapsed(`${deviceTypeEmoji} Device ${idx + 1}: "${controller.name}" [${controller.device_type}]`);
      
      console.log('Device ID:', controller.id);
      console.log('Device Type:', controller.device_type);
      
      console.log('Environmental Sensors:', {
        probe_temp: controller.probe_temperature || 'NOT FOUND',
        probe_humidity: controller.probe_humidity || 'NOT FOUND',
        probe_vpd: controller.probe_vpd || 'NOT FOUND',
        controller_temp: controller.controller_temperature || 'NOT FOUND',
        controller_humidity: controller.controller_humidity || 'NOT FOUND',
        controller_vpd: controller.controller_vpd || 'NOT FOUND'
      });
      
      console.log('Specialty Sensors:', {
        moisture: controller.moisture || 'NOT FOUND',
        co2: controller.co2 || 'NOT FOUND',
        uv: controller.uv || 'NOT FOUND'
      });
      
      console.log(`Ports/Outlets (${controller.ports.length}):`, 
        controller.ports.map(p => ({
          [`Port ${p.number}`]: {
            name: p.name,
            status_entity: p.status || 'NOT FOUND',
            status_value: p.status ? this._hass.states[p.status]?.state : 'N/A',
            device_type_entity: p.device_type || 'NOT FOUND',
            device_type_value: p.device_type ? this._hass.states[p.device_type]?.state : 'N/A',
            power_entity: p.power || 'NOT FOUND',
            power_value: p.power ? this._hass.states[p.power]?.state : 'N/A',
            state_entity: p.state || 'NOT FOUND',
            mode_entity: p.mode || 'NOT FOUND'
          }
        }))
      );
      
      console.groupEnd();
    });
    
    this.requestUpdate();
  }

  _getEntityState(entityId) {
    if (!entityId || !this._hass || !this._hass.states[entityId]) return 'N/A';
    return this._hass.states[entityId].state;
  }

  _formatValue(value, decimals = 0) {
    if (value === 'N/A' || value === 'unavailable' || value === 'unknown' || value === null) return '--';
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return '--';
    return decimals > 0 ? numValue.toFixed(decimals) : Math.round(numValue);
  }

  _handleEntityClick(entityId) {
    if (!entityId) return;
    
    const event = new Event('hass-more-info', {
      bubbles: true,
      composed: true,
      cancelable: false,
    });
    event.detail = { entityId: entityId };
    this.dispatchEvent(event);
  }

  _getPortIcon(port, isOn) {
    if (!isOn) return '●';
    
    const power = this._getEntityState(port.power);
    const powerNum = parseInt(power);
    
    if (powerNum === 0 || power === 'off') return '●';
    if (powerNum >= 1 && powerNum <= 3) return '●';
    if (powerNum >= 4 && powerNum <= 6) return '●';
    return '●';
  }

  _showPortsDialog() {
    // Show a dialog with all port controls
    const controller = this._getSelectedController();
    if (!controller || !controller.ports || controller.ports.length === 0) {
      alert('No ports detected. Make sure your AC Infinity integration is properly configured.');
      return;
    }

    // Open the first port's entity to show port controls
    const firstPort = controller.ports.find(p => p.state || p.power);
    if (firstPort) {
      this._handleEntityClick(firstPort.state || firstPort.power);
    }
  }

  _showModeDialog() {
    // Show mode selection dialog
    const controller = this._getSelectedController();
    if (!controller) return;

    // Try to find a mode entity
    const modePort = controller.ports.find(p => p.mode);
    if (modePort && modePort.mode) {
      this._handleEntityClick(modePort.mode);
    } else {
      // Fallback to showing controller info
      this._handleEntityClick(controller.probe_temperature);
    }
  }

  _showSettingsDialog() {
    // Show settings/configuration dialog
    const controller = this._getSelectedController();
    if (!controller) return;

    // Open controller temperature entity which typically has device info
    this._handleEntityClick(controller.controller_temperature || controller.probe_temperature);
  }

  _getCurrentTime() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
  }

  _getSelectedController() {
    const controllers = this._entities || {};
    const controllerList = Object.values(controllers);

    if (controllerList.length === 0) {
      return null;
    }

    // If a specific controller is selected in config, use it
    if (this.config?.selected_controller) {
      const selected = controllers[this.config.selected_controller];
      if (selected) return selected;
    }

    // Otherwise return the first one
    return controllerList[0];
  }

  _getControllerList() {
    return Object.values(this._entities || {});
  }

  render() {
    if (!this._hass) {
      return html`<ha-card>Loading...</ha-card>`;
    }

    let controller;
    if (this.config?.probe_temp_entity) {
      // Manual entity configuration
      controller = {
        id: 'manual',
        name: this.config.title || 'AC Infinity Controller',
        device_type: this.config.device_type || 'controller',
        probe_temperature: this.config.probe_temp_entity,
        probe_humidity: this.config.probe_humidity_entity,
        probe_vpd: this.config.probe_vpd_entity,
        controller_temperature: this.config.controller_temp_entity,
        controller_humidity: this.config.controller_humidity_entity,
        controller_vpd: this.config.controller_vpd_entity,
        moisture: this.config.moisture_entity,
        co2: this.config.co2_entity,
        uv: this.config.uv_entity,
        ports: []
      };
    } else {
      // Auto-detect: use selected controller or first available
      controller = this._getSelectedController() || {
        id: null,
        name: 'AC Infinity Controller',
        device_type: 'controller',
        probe_temperature: null,
        probe_humidity: null,
        probe_vpd: null,
        controller_temperature: null,
        controller_humidity: null,
        controller_vpd: null,
        moisture: null,
        co2: null,
        uv: null,
        ports: []
      };
    }
    
    // Determine display configuration based on device type
    const isOutlet = controller.device_type === 'outlet';
    const portLabel = isOutlet ? 'OUTLETS' : 'PORTS';
    const portButtonLabel = isOutlet ? 'OUTLET BUTTON' : 'PORT BUTTON';

    const probeTemp = this._formatValue(this._getEntityState(controller.probe_temperature));
    const probeHumidity = this._formatValue(this._getEntityState(controller.probe_humidity));
    const probeVpd = this._formatValue(this._getEntityState(controller.probe_vpd), 1);

    const controllerTemp = this._formatValue(this._getEntityState(controller.controller_temperature));
    const controllerHumidity = this._formatValue(this._getEntityState(controller.controller_humidity));

    // Specialty sensors
    const moisture = this._formatValue(this._getEntityState(controller.moisture));
    const co2 = this._formatValue(this._getEntityState(controller.co2));
    const uv = this._formatValue(this._getEntityState(controller.uv));

    // Check if we have specialty sensors to display
    const hasSpecialtySensors = controller.moisture || controller.co2 || controller.uv;
    
    // Check if this device has environmental sensors (outlets typically don't)
    const hasEnvironmentalSensors = controller.probe_temperature || 
                                   controller.controller_temperature || 
                                   controller.probe_humidity ||
                                   controller.controller_humidity;
    
    // Build ports/outlets array (always show 8 items)
    const ports = [];
    const defaultName = isOutlet ? 'Outlet' : 'Port';
    for (let i = 1; i <= 8; i++) {
      const existingPort = (controller.ports || []).find(p => p.number === i);
      ports.push(existingPort || {
        number: i,
        name: `${defaultName} ${i}`,
        state: null,
        power: null,
        mode: null
      });
    }

    return html`
      <ha-card>
        <div class="ac-infinity-card">
          <!-- TOP SECTION: Status Icons and Time -->
          <div class="top-bar">
            <div class="status-icons-left">
              <div class="ai-badge">
                <span class="ai-text">AI</span>
              </div>
            </div>
            
            <div class="status-icons-center">
              <span class="icon-item">📶</span>
              <span class="icon-item">☁️</span>
            </div>
            
            <div class="status-icons-right">
              <span class="current-time">${this._getCurrentTime()}</span>
            </div>
          </div>
          
          <!-- MAIN DISPLAY AREA -->
          <div class="main-display">
            <!-- BUTTONS COLUMN -->
            <div class="buttons-column">
              <!-- Port/Outlet Button (top circle button) -->
              <div class="port-button-container">
                <button class="port-button" @click="${() => this._showPortsDialog()}">
                  <span class="button-icon">${isOutlet ? '🔌' : '○─'}</span>
                </button>
                <span class="button-label">${portButtonLabel}</span>
              </div>
              
              <!-- Mode Button -->
              <div class="mode-button-container">
                <button class="mode-button" @click="${() => this._showModeDialog()}">
                  <div class="hamburger-icon">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </button>
                <span class="button-label">MODE BUTTON</span>
              </div>
              
              <!-- Setting Button -->
              <div class="setting-button-container">
                <button class="setting-button" @click="${() => this._showSettingsDialog()}">
                  <span class="settings-icon">⚙</span>
                </button>
                <span class="button-label">SETTING BUTTON</span>
              </div>
            </div>
            
            <!-- PORTS/OUTLETS COLUMN -->
            <div class="ports-column">
              <div class="ports-section">
                <span class="section-label">${portLabel}</span>
                <div class="ports-list">
                  ${ports.map(port => {
                    // Use v1.2.0 status sensor if available
                    const status = this._getEntityState(port.status);
                    const power = this._getEntityState(port.power);
                    const state = this._getEntityState(port.state);
                    const deviceType = this._getEntityState(port.device_type);
                    
                    const isOn = status === 'Active' || state === 'on' || (power && power !== '0' && power !== 'off' && power !== 'unavailable' && power !== 'unknown' && power !== 'N/A');
                    
                    // Use device type for name if available
                    let portName = port.name;
                    if (deviceType && deviceType !== 'N/A' && deviceType !== 'unavailable' && deviceType !== 'No Device Type') {
                      portName = deviceType;
                    }
                    
                    let displayValue;
                    if (port.power && power !== 'N/A' && power !== 'unavailable' && power !== 'unknown') {
                      displayValue = this._formatValue(power);
                    } else if (status === 'Active') {
                      displayValue = 'ON';
                    } else if (status === 'Inactive') {
                      displayValue = 'OFF';
                    } else if (state === 'on') {
                      displayValue = 'ON';
                    } else if (state === 'off') {
                      displayValue = 'OFF';
                    } else {
                      displayValue = '--';
                    }
                    
                    const iconColor = isOn ? '#4CAF50' : '#555';
                    
                    return html`
                      <div class="port-item ${isOn ? 'active' : ''}" 
                           @click="${() => this._handleEntityClick(port.status || port.state || port.power)}"
                           title="${portName}">
                        <span class="port-num">${portName}</span>
                        <span class="port-icon" style="color: ${iconColor}">●</span>
                        <span class="port-value">${displayValue}</span>
                      </div>
                    `;
                  })}
                </div>
              </div>
            </div>
            
            <!-- CENTER COLUMN: Main Display -->
            <div class="center-section">
              ${hasEnvironmentalSensors ? html`
                <!-- Temperature Display for Controllers -->
                <div class="temp-readings-horizontal">
                  <div class="main-temp-display" @click="${() => this._handleEntityClick(controller.probe_temperature)}">
                    <span class="temp-value">${probeTemp}</span>
                    <span class="temp-unit">°<br>F</span>
                  </div>
                  
                  <div class="secondary-readings-vertical">
                    <div class="reading-item" @click="${() => this._handleEntityClick(controller.probe_humidity)}">
                      <span class="reading-value">${probeHumidity}</span>
                      <span class="reading-unit">%</span>
                    </div>
                    <div class="reading-item" @click="${() => this._handleEntityClick(controller.probe_vpd)}">
                      <span class="reading-value">${probeVpd}</span>
                      <span class="reading-unit">kPa</span>
                    </div>
                  </div>
                </div>
                
                <div class="mode-status">
                  <span class="mode-label">AUTO</span>
                  <span class="mode-detail">• HIGH TEMP</span>
                </div>
              ` : html`
                <!-- Outlet Status Display -->
                <div class="outlet-status-display">
                  <div class="device-icon">${isOutlet ? '🔌' : '🎛️'}</div>
                  <div class="device-name">${controller.name}</div>
                  <div class="device-type-label">${isOutlet ? 'AC INFINITY OUTLET' : 'AC INFINITY CONTROLLER'}</div>
                  <div class="mode-status">
                    <span class="mode-label">READY</span>
                  </div>
                </div>
              `}
            </div>
            
            <!-- RIGHT VALUES COLUMN -->
            <div class="right-values-column">
              <!-- Controller Temperature -->
              <div class="value-row-with-label" @click="${() => this._handleEntityClick(controller.controller_temperature)}">
                <span class="value-label">BUILT-IN TEMP</span>
                <div class="value-content">
                  <span class="value-number">${controllerTemp}</span>
                  <span class="value-unit">°F</span>
                </div>
              </div>

              <!-- Controller Humidity -->
              <div class="value-row-with-label" @click="${() => this._handleEntityClick(controller.controller_humidity)}">
                <span class="value-label">BUILT-IN HUMIDITY</span>
                <div class="value-content">
                  <span class="value-number">${controllerHumidity}</span>
                  <span class="value-unit">%</span>
                </div>
              </div>

              <!-- Moisture Sensor (if available) -->
              ${controller.moisture ? html`
              <div class="value-row-with-label" @click="${() => this._handleEntityClick(controller.moisture)}">
                <span class="value-label">MOISTURE</span>
                <div class="value-content">
                  <span class="value-number">${moisture}</span>
                  <span class="value-unit">%</span>
                </div>
              </div>
              ` : ''}

              <!-- CO2 Sensor (if available) -->
              ${controller.co2 ? html`
              <div class="value-row-with-label" @click="${() => this._handleEntityClick(controller.co2)}">
                <span class="value-label">CO2</span>
                <div class="value-content">
                  <span class="value-number">${co2}</span>
                  <span class="value-unit">ppm</span>
                </div>
              </div>
              ` : ''}

              <!-- UV Sensor (if available) -->
              ${controller.uv ? html`
              <div class="value-row-with-label" @click="${() => this._handleEntityClick(controller.uv)}">
                <span class="value-label">UV INDEX</span>
                <div class="value-content">
                  <span class="value-number">${uv}</span>
                  <span class="value-unit"></span>
                </div>
              </div>
              ` : ''}

              <!-- Show placeholders if no specialty sensors -->
              ${!hasSpecialtySensors ? html`
              <div class="value-row-with-label placeholder">
                <span class="value-label">MOISTURE</span>
                <div class="value-content">
                  <span class="value-number">--</span>
                  <span class="value-unit">%</span>
                </div>
              </div>
              <div class="value-row-with-label placeholder">
                <span class="value-label">CO2</span>
                <div class="value-content">
                  <span class="value-number">--</span>
                  <span class="value-unit">ppm</span>
                </div>
              </div>
              <div class="value-row-with-label placeholder">
                <span class="value-label">UV INDEX</span>
                <div class="value-content">
                  <span class="value-number">--</span>
                  <span class="value-unit"></span>
                </div>
              </div>
              ` : ''}
            </div>

            <!-- UP/DOWN BUTTON COLUMN -->
            <div class="updown-column">
              <button class="updown-button">
                <span>△</span>
                <span>▽</span>
              </button>
            </div>
          </div>
          
          <!-- BOTTOM BAR: Brand -->
          <div class="bottom-bar">
            <span class="brand">AC INFINITY</span>
            <span class="version">v${VERSION}</span>
          </div>
        </div>
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      
      ha-card {
        overflow: hidden;
        background: transparent;
      }
      
      .ac-infinity-card {
        background: #000;
        color: #fff;
        font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        width: 100%;
        max-width: 1400px;
        margin: 0 auto;
      }
      
      ha-card {
        overflow: visible;
      }
      
      /* TOP BAR */
      .top-bar {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        padding: 16px 32px;
        background: rgba(0,0,0,0.2);
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }
      
      .status-icons-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .ai-badge {
        border: 2px solid #fff;
        border-radius: 4px;
        padding: 4px 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      
      .ai-text {
        font-size: 14px;
        font-weight: bold;
        letter-spacing: 1px;
      }
      
      .status-icons-center {
        display: flex;
        gap: 16px;
        align-items: center;
        justify-content: center;
      }
      
      .icon-item {
        font-size: 16px;
        opacity: 0.8;
      }
      
      .status-icons-right {
        display: flex;
        justify-content: flex-end;
      }
      
      .current-time {
        font-size: 18px;
        font-weight: 400;
        letter-spacing: 1px;
        font-family: 'Courier New', monospace;
      }
      
      /* MAIN DISPLAY */
      .main-display {
        display: grid;
        grid-template-columns: 110px 180px minmax(400px, 1fr) 180px 90px;
        gap: 32px;
        padding: 40px 32px;
        min-height: 500px;
        align-items: center;
        justify-items: center;
      }
      
      /* BUTTONS COLUMN */
      .buttons-column {
        display: flex;
        flex-direction: column;
        gap: 20px;
        align-items: center;
      }
      
      .port-button-container,
      .mode-button-container,
      .setting-button-container,
      .updown-button-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
      }
      
      .button-label {
        font-size: 9px;
        color: #6db3d4;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        text-align: center;
        line-height: 1.2;
      }
      
      .port-button,
      .mode-button,
      .setting-button {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: #000;
        border: 2px solid #555;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: #aaa;
        font-size: 20px;
        transition: all 0.3s;
      }
      
      .updown-button {
        width: 60px;
        height: 100px;
        border-radius: 8px;
        background: #000;
        border: 2px solid #555;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        cursor: pointer;
        color: #aaa;
        font-size: 24px;
        transition: all 0.3s;
      }
      
      .port-button:hover,
      .mode-button:hover,
      .setting-button:hover,
      .updown-button:hover {
        border-color: #777;
        color: #fff;
      }
      
      .hamburger-icon {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      
      .hamburger-icon span {
        width: 20px;
        height: 2px;
        background: currentColor;
        border-radius: 1px;
      }
      

      
      /* PORTS COLUMN */
      .ports-column {
        display: flex;
        flex-direction: column;
      }
      
      .ports-section {
        width: 100%;
      }
      
      .section-label {
        font-size: 9px;
        color: #6db3d4;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        display: block;
        margin-bottom: 8px;
      }
      
      .ports-list {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      
      .port-item {
        display: grid;
        grid-template-columns: 1fr 24px 40px;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: #000;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 13px;
      }
      
      .port-item:hover {
        background: #111;
      }
      
      .port-num {
        color: #888;
        font-size: 12px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .port-icon {
        font-size: 16px;
        color: inherit;
        justify-self: center;
      }
      
      .port-value {
        color: #fff;
        font-weight: 500;
        text-align: right;
      }
      
      .probe-temp-label,
      .probe-humidity-label,
      .probe-vpd-label,
      .controller-mode-label {
        font-size: 9px;
        color: #6db3d4;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-top: 8px;
      }
      
      /* CENTER SECTION */
      .center-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
      }
      
      .temp-readings-horizontal {
        display: flex;
        align-items: center;
        gap: 32px;
      }
      
      .main-temp-display {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        cursor: pointer;
        transition: opacity 0.2s;
      }
      
      .main-temp-display:hover {
        opacity: 0.8;
      }
      
            .temp-value {
        font-size: 220px;
        font-weight: 100;
        line-height: 0.85;
        letter-spacing: -15px;
        font-family: 'Helvetica Neue', Arial, sans-serif;
      }
      
      .temp-unit {
        font-size: 32px;
        font-weight: 300;
        line-height: 1.3;
        margin-top: 8px;
        text-align: center;
      }
      
      .secondary-readings-vertical {
        display: flex;
        flex-direction: column;
        gap: 16px;
        align-items: flex-start;
      }
      
      .reading-item {
        display: flex;
        align-items: baseline;
        gap: 6px;
        cursor: pointer;
        transition: opacity 0.2s;
      }
      
      .reading-item:hover {
        opacity: 0.8;
      }
      
      .reading-value {
        font-size: 56px;
        font-weight: 300;
      }
      
      .reading-unit {
        font-size: 24px;
        color: #999;
      }
      
      .mode-status {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-top: 16px;
        font-size: 14px;
      }
      
      .mode-label {
        font-weight: 600;
        letter-spacing: 1px;
      }
      
      .mode-detail {
        color: #999;
      }
      
      /* OUTLET STATUS DISPLAY */
      .outlet-status-display {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 20px;
        padding: 40px;
      }
      
      .device-icon {
        font-size: 120px;
        line-height: 1;
        opacity: 0.8;
      }
      
      .device-name {
        font-size: 32px;
        font-weight: 300;
        text-align: center;
        color: #fff;
      }
      
      .device-type-label {
        font-size: 12px;
        letter-spacing: 2px;
        color: #6db3d4;
        text-transform: uppercase;
        text-align: center;
      }
      
      /* RIGHT VALUES COLUMN */
      .right-values-column {
        display: flex;
        flex-direction: column;
        gap: 24px;
        align-items: flex-end;
        justify-content: center;
      }
      
      .value-row {
        display: flex;
        align-items: baseline;
        gap: 4px;
        cursor: pointer;
      }
      
      .value-row-with-label {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 4px;
        cursor: pointer;
      }

      .value-row-with-label.placeholder {
        opacity: 0.4;
        cursor: default;
      }

      .value-label {
        font-size: 9px;
        color: #6db3d4;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .value-content {
        display: flex;
        align-items: baseline;
        gap: 4px;
      }
      
      .value-number {
        font-size: 48px;
        font-weight: 300;
        color: #fff;
      }
      
      .value-unit {
        font-size: 20px;
        color: #888;
      }
      
      /* UP/DOWN COLUMN */
      .updown-column {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      

      
      /* BOTTOM BAR */
      .bottom-bar {
        padding: 16px;
        text-align: center;
        background: rgba(0,0,0,0.3);
        border-top: 1px solid rgba(255,255,255,0.1);
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 12px;
      }
      
      .brand {
        font-size: 11px;
        letter-spacing: 3px;
        color: #666;
        text-transform: uppercase;
      }
      
      .version {
        font-size: 9px;
        letter-spacing: 1px;
        color: #4CAF50;
        background: rgba(76, 175, 80, 0.1);
        padding: 3px 8px;
        border-radius: 3px;
        font-weight: 500;
      }
      
      /* RESPONSIVE */
      @media (max-width: 1300px) {
        .main-display {
          grid-template-columns: 100px 170px minmax(350px, 1fr) 170px 80px;
          gap: 24px;
          padding: 36px 24px;
        }
        
        .temp-value {
          font-size: 180px;
          letter-spacing: -12px;
        }
        
        .value-number {
          font-size: 40px;
        }
        
        .reading-value {
          font-size: 48px;
        }
      }
      
      @media (max-width: 1024px) {
        .main-display {
          grid-template-columns: 90px 140px minmax(200px, 1fr) 180px 60px;
          gap: 12px;
          padding: 24px 16px;
        }
        
        .port-button,
        .mode-button,
        .setting-button {
          width: 48px;
          height: 48px;
          font-size: 18px;
        }
        
        .updown-button {
          width: 50px;
          height: 80px;
          font-size: 20px;
        }
        
        .temp-value {
          font-size: 120px;
        }
        
        .value-number {
          font-size: 24px;
        }
        
        .button-label {
          font-size: 7px;
        }
      }
      
      @media (max-width: 900px) {
        .main-display {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 10px 8px;
        }
        
        .buttons-column {
          flex-direction: row;
          gap: 10px;
          justify-content: center;
          width: 100%;
          order: 5;
          display: none;
        }
        
        .ports-column {
          width: 100%;
          order: 1;
        }
        
        .center-section {
          width: 100%;
          order: 2;
          gap: 8px;
        }
        
        .right-values-column {
          width: 100%;
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
          order: 3;
        }
        
        .value-row-with-label {
          align-items: center;
          flex-direction: column;
        }
        
        .updown-column {
          width: 100%;
          justify-content: center;
          flex-direction: row;
          order: 4;
          gap: 15px;
          display: none;
        }
        
        .temp-value {
          font-size: 80px;
        }
        
        .value-number {
          font-size: 24px;
        }
        
        .top-bar {
          padding: 10px 16px;
        }
      }
      
      @media (max-width: 600px) {
        .ac-infinity-card {
          border-radius: 4px;
        }
        
        .main-display {
          padding: 8px 6px;
          gap: 8px;
        }
        
        .top-bar {
          padding: 8px 12px;
        }
        
        .ai-badge {
          padding: 3px 6px;
          font-size: 11px;
        }
        
        .current-time {
          font-size: 11px;
        }
        
        .ports-column {
          gap: 6px;
        }
        
        .ports-section-title {
          font-size: 9px;
          margin-bottom: 4px;
          letter-spacing: 1px;
        }
        
        .ports-list {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
        }
        
        .port-item {
          padding: 6px 6px;
          font-size: 11px;
          grid-template-columns: 1fr 18px 30px;
          gap: 4px;
        }
        
        .port-num {
          font-size: 10px;
        }
        
        .port-icon {
          font-size: 13px;
        }
        
        .port-value {
          font-size: 10px;
        }
        
        .center-section {
          gap: 6px;
        }
        
        .temp-readings-horizontal {
          gap: 12px;
        }
        
        .temp-value {
          font-size: 70px;
          letter-spacing: -4px;
        }
        
        .temp-unit {
          font-size: 16px;
          margin-top: 2px;
        }
        
        .reading-value {
          font-size: 24px;
        }
        
        .reading-unit {
          font-size: 11px;
        }
        
        .mode-status {
          font-size: 9px;
          gap: 6px;
        }
        
        .value-row-with-label {
          gap: 2px;
        }
        
        .value-label {
          font-size: 7px;
          text-align: center;
        }
        
        .value-number {
          font-size: 22px;
        }
        
        .value-unit {
          font-size: 10px;
        }
        
        .right-values-column {
          grid-template-columns: 1fr 1fr 1fr;
          gap: 6px;
        }
        
        .bottom-bar {
          padding: 8px;
        }
        
        .brand {
          font-size: 9px;
          letter-spacing: 2px;
        }
        
        .version {
          font-size: 7px;
          padding: 2px 6px;
        }
      }
      
      /* iOS Home Assistant App - hide buttons/controls on mobile */
      @media (max-width: 414px) {
        .main-display {
          padding: 8px 6px;
          gap: 6px;
        }
        
        .top-bar {
          padding: 6px 10px;
        }
        
        .ports-section-title {
          font-size: 8px;
          margin-bottom: 3px;
        }
        
        .ports-column {
          gap: 4px;
        }
        
        .ports-list {
          grid-template-columns: 1fr 1fr;
          gap: 3px;
        }
        
        .port-item {
          padding: 5px 5px;
          font-size: 10px;
          grid-template-columns: 1fr 16px 28px;
          gap: 4px;
        }
        
        .port-num {
          font-size: 9px;
        }
        
        .port-icon {
          font-size: 12px;
        }
        
        .port-value {
          font-size: 9px;
        }
        
        .center-section {
          gap: 5px;
        }
        
        .temp-readings-horizontal {
          gap: 10px;
        }
        
        .temp-value {
          font-size: 65px;
          letter-spacing: -3px;
        }
        
        .temp-unit {
          font-size: 14px;
        }
        
        .reading-value {
          font-size: 22px;
        }
        
        .reading-unit {
          font-size: 10px;
        }
        
        .mode-status {
          font-size: 8px;
        }
        
        .value-label {
          font-size: 6px;
        }
        
        .value-number {
          font-size: 20px;
        }
        
        .value-unit {
          font-size: 9px;
        }
      }
    `;
  }

  getCardSize() {
    return 6;
  }

  static getConfigElement() {
    return document.createElement('ac-infinity-card-editor');
  }

  static getStubConfig() {
    return {
      title: 'AC Infinity Controller',
      auto_detect: true,
      show_ports: true
    };
  }
}

customElements.define('ac-infinity-card', ACInfinityCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'ac-infinity-card',
  name: 'AC Infinity Controller Card',
  description: 'Display AC Infinity controller interface matching hardware display',
  version: VERSION,
  preview: true,
  documentationURL: 'https://github.com/JoshuaSeidel/hass-acinfinity-lovelace-card'
});

console.info(
  `%c AC-INFINITY-CARD %c Version ${VERSION} `,
  'color: white; background: #000; font-weight: bold;',
  'color: white; background: #4CAF50; font-weight: bold;'
);

// Force version log on every load to help detect cache issues
console.log(`%c[AC Infinity Card] Loaded version ${VERSION} at ${new Date().toISOString()}`, 
  'color: #4CAF50; font-weight: bold');

// Warn if there's a mismatch in registered cards (cache issue indicator)
if (window.customCards) {
  const existingCards = window.customCards.filter(card => card.type === 'ac-infinity-card');
  if (existingCards.length > 1) {
    console.warn('%c[AC Infinity Card] Multiple versions detected! Please clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)', 
      'color: #FF9800; font-weight: bold');
    console.warn('Detected versions:', existingCards.map(c => c.version || 'unknown'));
  }
}
