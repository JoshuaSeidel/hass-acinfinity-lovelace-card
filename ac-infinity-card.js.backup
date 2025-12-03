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
      // Manual entity configuration
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
  }

  get hass() {
    return this._hass;
  }

  _autoDetectEntities() {
    if (!this._hass || !this._hass.states) return;

    const entities = Object.keys(this._hass.states);

    // Find AC Infinity entities by checking if integration attribute equals 'ac_infinity'
    const acInfinityEntities = entities.filter(entity => {
      const state = this._hass.states[entity];
      return state && state.attributes && state.attributes.integration === 'ac_infinity';
    });

    console.log('AC Infinity entities found:', acInfinityEntities);

    // Group by device (for sensors, use device's parent controller)
    const controllers = {};
    
    acInfinityEntities.forEach(entity => {
      const state = this._hass.states[entity];
      if (!state) return;
      
      // Get device name from friendly_name or device info
      const friendlyName = state.attributes?.friendly_name || '';
      const deviceId = state.attributes?.device_id || 'default';
      
      // Extract controller name from friendly name (e.g., "Grow Tent Tent Temperature" -> "Grow Tent")
      let controllerName = this.config.title;
      if (friendlyName) {
        const parts = friendlyName.split(' ');
        // Take first few words as controller name
        controllerName = parts.slice(0, Math.max(1, parts.length - 2)).join(' ');
      }

      if (!controllers[deviceId]) {
        controllers[deviceId] = {
          name: controllerName,
          // Tent/Probe sensors (primary display)
          probe_temperature: null,
          probe_humidity: null,
          probe_vpd: null,
          // Controller sensors (right side display)
          controller_temperature: null,
          controller_humidity: null,
          controller_vpd: null,
          ports: []
        };
      }

      const entityName = entity.toLowerCase();
      const friendlyNameLower = friendlyName.toLowerCase();
      
      // Detect probe/tent sensors based on entity patterns from integration
      // Probe sensors: "tent_temperature", "tent_humidity", "tent_vpd" or "probe_"
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
      // Detect controller built-in sensors
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
      // Port entities
      else if (entityName.includes('port') && (entityName.match(/port[_\s]*(\d+)/) || friendlyNameLower.match(/port[_\s]*(\d+)/))) {
        const portMatch = entityName.match(/port[_\s]*(\d+)/) || friendlyNameLower.match(/port[_\s]*(\d+)/);
        if (portMatch) {
          const portNum = parseInt(portMatch[1]);
          
          // Find existing port or create new
          let portObj = controllers[deviceId].ports.find(p => p.number === portNum);
          if (!portObj) {
            portObj = {
              number: portNum,
              name: `Port ${portNum}`,
              state: null,
              power: null,
              mode: null
            };
            controllers[deviceId].ports.push(portObj);
          }
          
          // Assign entity to port based on type
          if (state.entity_id.startsWith('switch.') || entityName.includes('state')) {
            portObj.state = entity;
          } else if (entityName.includes('speak') || entityName.includes('current_power') || entityName.includes('power')) {
            portObj.power = entity;
            // Update port name from friendly name if available
            if (friendlyName && !friendlyName.toLowerCase().includes('power')) {
              portObj.name = friendlyName.replace(/\s+(State|Power|Current Power).*$/i, '');
            }
          } else if (entityName.includes('mode')) {
            portObj.mode = entity;
          }
        }
      }
    });

    // Sort ports by number
    Object.values(controllers).forEach(controller => {
      controller.ports.sort((a, b) => a.number - b.number);
    });

    this._entities = controllers;
    console.log('Detected controllers:', this._entities);
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

  render() {
    if (!this._hass) {
      return html`<ha-card>Loading...</ha-card>`;
    }

    // Use manual config if provided, otherwise use first auto-detected controller
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
    const probeVpd = this._formatValue(this._getEntityState(controller.probe_vpd), 2);
    
    const controllerTemp = this._formatValue(this._getEntityState(controller.controller_temperature));
    const controllerHumidity = this._formatValue(this._getEntityState(controller.controller_humidity));
    const controllerVpd = this._formatValue(this._getEntityState(controller.controller_vpd), 1);
    
    const ports = controller.ports || [];

    return html`
      <ha-card>
        <div class="ac-infinity-card">
          <div class="header">
            <div class="ai-badge">
              <div class="ai-icon">AI</div>
              <span>${this.config.title}</span>
            </div>
            <div class="status-icons">
              <span>📶</span>
              <span>☁️</span>
              <span class="time-display">${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}</span>
            </div>
          </div>
          
          <div class="control-buttons">
            <div class="control-btn" @click="${() => this._handleEntityClick(controller.probe_temperature)}">
              <div class="menu-icon">
                <div class="menu-line"></div>
                <div class="menu-line"></div>
                <div class="menu-line"></div>
              </div>
            </div>
            <div class="control-btn" @click="${() => this._handleEntityClick(controller.probe_temperature)}">
              <span class="settings-icon">⚙</span>
            </div>
          </div>
          
          <div class="main-display">
            ${this.config.show_ports ? html`
              <div class="left-section">
                <div class="ports-list">
                  ${ports.map(port => {
                    const state = this._getEntityState(port.state);
                    const power = this._getEntityState(port.power);
                    const isOn = state === 'on' || (power && power !== '0' && power !== 'off' && power !== 'unavailable');
                    
                    return html`
                      <div class="port-item ${isOn ? '' : 'port-off'}" @click="${() => this._handleEntityClick(port.state || port.power)}">
                        <span class="port-number">${port.number}</span>
                        <span class="port-icon">🔌</span>
                        <span class="port-name">${port.name}</span>
                        <span class="port-value">${isOn ? this._formatValue(power) : 'OFF'}</span>
                      </div>
                    `;
                  })}
                </div>
              </div>
            ` : html``}
            
            <div class="center-display">
              <div class="temperature-display" @click="${() => this._handleEntityClick(controller.probe_temperature)}">
                ${probeTemp}<span class="temp-unit">°F</span>
              </div>
              <div class="probe-values">
                <div class="probe-value" @click="${() => this._handleEntityClick(controller.probe_humidity)}">
                  <span class="probe-number">${probeHumidity}</span>
                  <span class="probe-unit">%</span>
                </div>
                <div class="probe-value" @click="${() => this._handleEntityClick(controller.probe_vpd)}">
                  <span class="probe-number">${probeVpd}</span>
                  <span class="probe-unit">kPa</span>
                </div>
              </div>
              <div class="mode-status">
                <span class="mode-badge">AUTO</span>
                <span class="status-indicator">• HIGH TEMP</span>
              </div>
            </div>
            
            <div class="right-section">
              <div class="climate-values">
                <div class="climate-value" @click="${() => this._handleEntityClick(controller.controller_temperature)}">
                  ${controllerTemp}<span class="climate-unit">°F</span>
                </div>
                <div class="climate-value" @click="${() => this._handleEntityClick(controller.controller_humidity)}">
                  ${controllerHumidity}<span class="climate-unit">%</span>
                </div>
                <div class="climate-value" @click="${() => this._handleEntityClick(controller.controller_vpd)}">
                  ${controllerVpd}<span class="climate-unit">kPa</span>
                </div>
              </div>
              <div class="set-to-section">
                <span class="set-to-label">SET TO</span>
                <span class="set-to-value">${probeTemp}</span>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <div class="brand">
              <div class="brand-divider"></div>
              <span>AC INFINITY</span>
              <div class="brand-divider"></div>
            </div>
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
      }
      
      .ac-infinity-card {
        background: linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%);
        position: relative;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid #222;
      }
      
      .ai-badge {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #fff;
        font-weight: 600;
        font-size: 16px;
      }
      
      .ai-icon {
        width: 32px;
        height: 20px;
        border: 2px solid #fff;
        border-radius: 3px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        padding: 2px 4px;
      }
      
      .status-icons {
        display: flex;
        gap: 16px;
        align-items: center;
        color: #999;
      }
      
      .time-display {
        font-size: 16px;
        color: #fff;
        font-weight: 300;
        letter-spacing: 1px;
      }
      
      .main-display {
        display: grid;
        grid-template-columns: 200px 1fr 200px;
        padding: 32px 20px;
        gap: 24px;
        align-items: start;
        min-height: 280px;
      }
      
      .left-section {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .ports-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      
      .port-item {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #fff;
        font-size: 13px;
        padding: 8px 10px;
        cursor: pointer;
        transition: all 0.2s;
        border-radius: 4px;
      }
      
      .port-item:hover {
        background: rgba(255, 255, 255, 0.05);
      }
      
      .port-number {
        color: #999;
        font-weight: 500;
        min-width: 12px;
        font-size: 12px;
      }
      
      .port-icon {
        font-size: 14px;
        min-width: 16px;
      }
      
      .port-name {
        flex: 1;
        font-weight: 400;
        font-size: 12px;
      }
      
      .port-value {
        font-weight: 600;
        min-width: 35px;
        text-align: right;
        color: #4CAF50;
        font-size: 13px;
      }
      
      .port-off {
        opacity: 0.3;
      }
      
      .port-off .port-value {
        color: #999;
      }
      
      .center-display {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
      }
      
      .temperature-display {
        font-size: 120px;
        font-weight: 200;
        color: #fff;
        line-height: 1;
        letter-spacing: -6px;
        font-family: 'Helvetica Neue', Arial, sans-serif;
        cursor: pointer;
        transition: opacity 0.2s;
      }
      
      .temperature-display:hover {
        opacity: 0.8;
      }
      
      .temp-unit {
        font-size: 36px;
        vertical-align: super;
        margin-left: -4px;
        font-weight: 300;
      }
      
      .probe-values {
        display: flex;
        gap: 32px;
        align-items: center;
        justify-content: center;
        margin-top: 8px;
      }
      
      .probe-value {
        display: flex;
        align-items: baseline;
        gap: 4px;
        cursor: pointer;
        transition: opacity 0.2s;
      }
      
      .probe-value:hover {
        opacity: 0.8;
      }
      
      .probe-number {
        font-size: 32px;
        color: #fff;
        font-weight: 400;
      }
      
      .probe-unit {
        font-size: 16px;
        color: #999;
      }
      
      .mode-status {
        display: flex;
        align-items: center;
        gap: 12px;
        color: #999;
        font-size: 14px;
        margin-top: 4px;
      }
      
      .mode-badge {
        color: #fff;
        font-weight: 600;
        font-size: 13px;
        letter-spacing: 0.5px;
      }
      
      .status-indicator {
        font-size: 13px;
      }
      
      .right-section {
        display: flex;
        flex-direction: column;
        gap: 20px;
        align-items: flex-end;
      }
      
      .climate-values {
        display: flex;
        flex-direction: column;
        gap: 14px;
        text-align: right;
      }
      
      .climate-value {
        font-size: 20px;
        color: #fff;
        font-weight: 400;
        cursor: pointer;
        transition: opacity 0.2s;
      }
      
      .climate-value:hover {
        opacity: 0.8;
      }
      
      .climate-unit {
        font-size: 14px;
        color: #999;
        margin-left: 2px;
      }
      
      .set-to-section {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 4px;
        margin-top: 12px;
      }
      
      .set-to-label {
        font-size: 10px;
        color: #666;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      
      .set-to-value {
        font-size: 40px;
        color: #fff;
        font-weight: 300;
      }
      
      .footer {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 12px 20px;
        border-top: 1px solid #222;
      }
      
      .brand {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #666;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 2px;
        font-weight: 500;
      }
      
      .brand-divider {
        width: 1px;
        height: 12px;
        background: #333;
      }
      
      .control-buttons {
        position: absolute;
        left: 20px;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        flex-direction: column;
        gap: 16px;
        z-index: 10;
      }
      
      .control-btn {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid #333;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: #666;
        transition: all 0.2s;
      }
      
      .control-btn:hover {
        background: rgba(255, 255, 255, 0.08);
        color: #999;
        border-color: #555;
      }
      
      .menu-icon {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      
      .menu-line {
        width: 16px;
        height: 2px;
        background: currentColor;
        border-radius: 1px;
      }
      
      .settings-icon {
        font-size: 18px;
      }
      
      @media (max-width: 768px) {
        .main-display {
          grid-template-columns: 1fr;
          grid-template-rows: auto auto auto;
          padding: 24px 16px;
          gap: 24px;
        }
        
        .left-section {
          order: 3;
        }
        
        .center-display {
          order: 1;
        }
        
        .right-section {
          order: 2;
          align-items: center;
        }
        
        .temperature-display {
          font-size: 96px;
        }
        
        .control-buttons {
          position: static;
          transform: none;
          flex-direction: row;
          padding: 16px;
          justify-content: center;
        }
      }
    `;
  }

  getCardSize() {
    return 5;
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

// Register the card
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'ac-infinity-card',
  name: 'AC Infinity Controller Card',
  description: 'Display AC Infinity controller interface',
  preview: true,
  documentationURL: 'https://github.com/JoshuaSeidel/hass-acinfinity-lovelace-card'
});

console.info(
  '%c AC-INFINITY-CARD %c Version 1.0.3 ',
  'color: white; background: #000; font-weight: bold;',
  'color: white; background: #4CAF50; font-weight: bold;'
);
