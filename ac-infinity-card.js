import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

class ACInfinityCard extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
      _entities: { type: Object }
    };
  }

  setConfig(config) {
    if (!config) {
      throw new Error('Invalid configuration');
    }
    
    this.config = {
      title: config.title || 'AC Infinity Controller',
      show_ports: config.show_ports !== false,
      auto_detect: config.auto_detect !== false,
      probe_temp_entity: config.probe_temp_entity || null,
      probe_humidity_entity: config.probe_humidity_entity || null,
      probe_vpd_entity: config.probe_vpd_entity || null,
      controller_temp_entity: config.controller_temp_entity || null,
      controller_humidity_entity: config.controller_humidity_entity || null,
      controller_vpd_entity: config.controller_vpd_entity || null,
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
    
    // Find ALL AC Infinity entities
    let acInfinityEntities = entities.filter(entity => {
      const state = this._hass.states[entity];
      if (!state) return false;
      
      const entityLower = entity.toLowerCase();
      const friendlyName = (state.attributes?.friendly_name || '').toLowerCase();
      
      // Exclude non-AC Infinity entities
      const excludePatterns = ['import', 'export', 'billing', 'grid', 'cloud', 'alexa', 'google'];
      if (excludePatterns.some(pattern => entityLower.includes(pattern))) {
        return false;
      }
      
      // Include any entity with tent/controller/probe patterns OR port patterns
      return (
        entityLower.includes('_tent_temperature') ||
        entityLower.includes('_tent_humidity') ||
        entityLower.includes('_tent_vpd') ||
        entityLower.includes('probe_tent') ||
        entityLower.includes('controller_temperature') ||
        entityLower.includes('controller_humidity') ||
        entityLower.includes('controller_vpd') ||
        entityLower.includes('port_number') ||
        entityLower.includes('port_status') ||
        entityLower.includes('device_type') ||
        entityLower.includes('current_power') ||
        friendlyName.includes('tent temperature') ||
        friendlyName.includes('tent humidity') ||
        friendlyName.includes('tent vpd') ||
        friendlyName.includes('controller temperature') ||
        friendlyName.includes('controller humidity') ||
        friendlyName.includes('port number') ||
        friendlyName.includes('port status')
      );
    });

    console.log('AC Infinity entities found:', acInfinityEntities);
    console.log('Full entity details:', acInfinityEntities.map(e => ({
      id: e,
      friendly_name: this._hass.states[e]?.attributes?.friendly_name,
      device_id: this._hass.states[e]?.attributes?.device_id,
      state: this._hass.states[e]?.state
    })));

    const controllers = {};
    
    acInfinityEntities.forEach(entity => {
      const state = this._hass.states[entity];
      if (!state) return;
      
      const friendlyName = state.attributes?.friendly_name || '';
      const deviceId = state.attributes?.device_id || 'default';
      
      let controllerName = this.config.title;
      if (friendlyName) {
        const parts = friendlyName.split(' ');
        controllerName = parts.slice(0, Math.max(1, parts.length - 2)).join(' ');
      }

      if (!controllers[deviceId]) {
        controllers[deviceId] = {
          name: controllerName,
          probe_temperature: null,
          probe_humidity: null,
          probe_vpd: null,
          controller_temperature: null,
          controller_humidity: null,
          controller_vpd: null,
          ports: []
        };
      }

      const entityName = entity.toLowerCase();
      const friendlyNameLower = friendlyName.toLowerCase();
      
      if (entityName.includes('tent_temperature') || entityName.includes('probe_temperature') || 
          friendlyNameLower.includes('tent temperature') || friendlyNameLower.includes('probe temperature')) {
        controllers[deviceId].probe_temperature = entity;
      } else if (entityName.includes('tent_humidity') || entityName.includes('probe_humidity') || 
                 friendlyNameLower.includes('tent humidity') || friendlyNameLower.includes('probe humidity')) {
        controllers[deviceId].probe_humidity = entity;
      } else if (entityName.includes('tent_vpd') || entityName.includes('probe_vpd') || 
                 friendlyNameLower.includes('tent vpd') || friendlyNameLower.includes('probe vpd')) {
        controllers[deviceId].probe_vpd = entity;
      }
      else if ((entityName.includes('built_in_temperature') || entityName.includes('controller_temperature') || 
                friendlyNameLower.includes('built-in temperature') || friendlyNameLower.includes('controller temperature')) 
               && !entityName.includes('port')) {
        controllers[deviceId].controller_temperature = entity;
      } else if ((entityName.includes('built_in_humidity') || entityName.includes('controller_humidity') || 
                  friendlyNameLower.includes('built-in humidity') || friendlyNameLower.includes('controller humidity')) 
                 && !entityName.includes('port')) {
        controllers[deviceId].controller_humidity = entity;
      } else if ((entityName.includes('built_in_vpd') || entityName.includes('controller_vpd') || 
                  friendlyNameLower.includes('built-in vpd') || friendlyNameLower.includes('controller vpd')) 
                 && !entityName.includes('port')) {
        controllers[deviceId].controller_vpd = entity;
      }
      // Check for port entities (v1.2.2+ has port_number sensor)
      if (entityName.includes('port_number')) {
        // This entity tells us the port number for this device
        const portNum = parseInt(this._hass.states[entity]?.state);
        if (!isNaN(portNum)) {
          // Find or create port object
          let portObj = controllers[deviceId].ports.find(p => p.number === portNum);
          if (!portObj) {
            portObj = {
              number: portNum,
              name: friendlyName.split(' Port Number')[0] || `Port ${portNum}`,
              state: null,
              power: null,
              mode: null,
              status: null,
              device_type: null,
              port_device_id: state.attributes?.device_id
            };
            controllers[deviceId].ports.push(portObj);
          }
        }
      }
      
      // Check for other port-related entities and associate them with the right port
      if (state.attributes?.device_id) {
        // Find port by device_id
        const portObj = controllers[deviceId].ports.find(p => p.port_device_id === state.attributes.device_id);
        if (portObj) {
          // Associate this entity with the port
          if (entityName.includes('port_status') || entityName.includes('status')) {
            portObj.status = entity;
          } else if (entityName.includes('device_type')) {
            portObj.device_type = entity;
          } else if (entityName.includes('current_power') || (state.entity_id.startsWith('sensor.') && entityName.includes('power'))) {
            portObj.power = entity;
          } else if (state.entity_id.startsWith('switch.')) {
            portObj.state = entity;
          } else if (state.entity_id.startsWith('number.') && (entityName.includes('power') || entityName.includes('speed'))) {
            portObj.power = entity;
          } else if (entityName.includes('mode') || state.entity_id.startsWith('select.')) {
            portObj.mode = entity;
          }
        }
      }
    });

    Object.values(controllers).forEach(controller => {
      controller.ports.sort((a, b) => a.number - b.number);
    });

    this._entities = controllers;
    console.log('Detected controllers:', this._entities);
    console.log('Ports found:', Object.values(controllers).flatMap(c => c.ports.map(p => ({
      number: p.number,
      name: p.name,
      status: p.status,
      device_type: p.device_type,
      power: p.power,
      port_device_id: p.port_device_id
    }))));
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
    const controller = Object.values(this._entities || {})[0];
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
    const controller = Object.values(this._entities || {})[0];
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
    const controller = Object.values(this._entities || {})[0];
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

  render() {
    if (!this._hass) {
      return html`<ha-card>Loading...</ha-card>`;
    }

    let controller;
    if (this.config?.probe_temp_entity) {
      controller = {
        probe_temperature: this.config.probe_temp_entity,
        probe_humidity: this.config.probe_humidity_entity,
        probe_vpd: this.config.probe_vpd_entity,
        controller_temperature: this.config.controller_temp_entity,
        controller_humidity: this.config.controller_humidity_entity,
        controller_vpd: this.config.controller_vpd_entity,
        ports: []
      };
    } else {
      controller = Object.values(this._entities || {})[0] || {
        probe_temperature: null,
        probe_humidity: null,
        probe_vpd: null,
        controller_temperature: null,
        controller_humidity: null,
        controller_vpd: null,
        ports: []
      };
    }

    const probeTemp = this._formatValue(this._getEntityState(controller.probe_temperature));
    const probeHumidity = this._formatValue(this._getEntityState(controller.probe_humidity));
    const probeVpd = this._formatValue(this._getEntityState(controller.probe_vpd), 1);
    
    const controllerTemp = this._formatValue(this._getEntityState(controller.controller_temperature));
    const controllerHumidity = this._formatValue(this._getEntityState(controller.controller_humidity));
    
    const ports = [];
    for (let i = 1; i <= 8; i++) {
      const existingPort = (controller.ports || []).find(p => p.number === i);
      ports.push(existingPort || {
        number: i,
        name: `Port ${i}`,
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
              <!-- Port Button (top circle button) -->
              <div class="port-button-container">
                <button class="port-button" @click="${() => this._showPortsDialog()}">
                  <span class="button-icon">○─</span>
                </button>
                <span class="button-label">PORT BUTTON</span>
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
            
            <!-- PORTS COLUMN -->
            <div class="ports-column">
              <div class="ports-section">
                <span class="section-label">PORTS</span>
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
                        <span class="port-num">${port.number}</span>
                        <span class="port-icon" style="color: ${iconColor}">●</span>
                        <span class="port-value">${displayValue}</span>
                      </div>
                    `;
                  })}
                </div>
              </div>
            </div>
            
            <!-- CENTER COLUMN: Main Temperature Display -->
            <div class="center-section">
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
              
              <!-- Current Level -->
              <div class="value-row-with-label">
                <span class="value-label">CURRENT LEVEL</span>
                <div class="value-content">
                  <span class="value-number">6</span>
                </div>
              </div>
              
              <!-- Countdown -->
              <div class="value-row-with-label">
                <span class="value-label">COUNTDOWN</span>
                <div class="value-content">
                  <span class="value-number">${probeHumidity}</span>
                  <span class="value-unit">%</span>
                </div>
              </div>
              
              <!-- Set To -->
              <div class="value-row-with-label">
                <span class="value-label">SET TO</span>
                <div class="value-content">
                  <span class="value-number">${controllerTemp}</span>
                  <span class="value-unit">°F</span>
                </div>
              </div>
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
        grid-template-columns: 20px 24px 1fr;
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
      }
      
      .port-icon {
        font-size: 16px;
        color: inherit;
      }
      
      .port-value {
        color: #fff;
        font-weight: 500;
        text-align: left;
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
      }
      
      .brand {
        font-size: 11px;
        letter-spacing: 3px;
        color: #666;
        text-transform: uppercase;
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
          grid-template-columns: 1fr;
          grid-template-rows: auto auto auto auto auto;
          gap: 24px;
          padding: 24px 16px;
          align-items: start;
        }
        
        .buttons-column {
          flex-direction: row;
          gap: 16px;
          justify-content: center;
          width: 100%;
        }
        
        .ports-column {
          width: 100%;
        }
        
        .center-section {
          width: 100%;
        }
        
        .right-values-column {
          width: 100%;
          align-items: center;
          gap: 16px;
        }
        
        .value-row {
          justify-content: center;
        }
        
        .updown-column {
          width: 100%;
          justify-content: center;
        }
        
        .temp-value {
          font-size: 100px;
        }
        
        .value-number {
          font-size: 32px;
        }
      }
      
      @media (max-width: 600px) {
        .ac-infinity-card {
          border-radius: 8px;
        }
        
        .main-display {
          padding: 20px 12px;
          gap: 20px;
        }
        
        .temp-value {
          font-size: 80px;
        }
        
        .reading-value {
          font-size: 32px;
        }
        
        .value-number {
          font-size: 28px;
        }
        
        .port-item {
          padding: 6px 10px;
          font-size: 12px;
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
  preview: true,
  documentationURL: 'https://github.com/JoshuaSeidel/hass-acinfinity-lovelace-card'
});

console.info(
  '%c AC-INFINITY-CARD %c Version 1.0.7 ',
  'color: white; background: #000; font-weight: bold;',
  'color: white; background: #4CAF50; font-weight: bold;'
);
