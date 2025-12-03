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
  }

  get hass() {
    return this._hass;
  }

  _autoDetectEntities() {
    if (!this._hass || !this._hass.states) return;

    const entities = Object.keys(this._hass.states);
    // Filter entities by checking if they come from ac_infinity integration
    // The integration creates entities with entity_ids that typically contain patterns like:
    // - Sensor names with "tent", "probe", "built_in", "controller" in entity_id or friendly_name
    // - Device info with proper attribution
    const acInfinityEntities = entities.filter(entity => {
      const state = this._hass.states[entity];
      if (!state) return false;
      
      // Check if entity_id or friendly_name contains AC Infinity patterns
      const entityLower = entity.toLowerCase();
      const friendlyName = (state.attributes?.friendly_name || '').toLowerCase();
      
      // Look for AC Infinity specific patterns
      return (
        entityLower.includes('tent_temperature') ||
        entityLower.includes('tent_humidity') ||
        entityLower.includes('tent_vpd') ||
        entityLower.includes('probe_temperature') ||
        entityLower.includes('probe_humidity') ||
        entityLower.includes('probe_vpd') ||
        entityLower.includes('built_in_temperature') ||
        entityLower.includes('built_in_humidity') ||
        entityLower.includes('built_in_vpd') ||
        entityLower.includes('controller_temperature') ||
        entityLower.includes('controller_humidity') ||
        entityLower.includes('controller_vpd') ||
        (entityLower.includes('port') && entityLower.match(/port[_\s]*\d+/)) ||
        friendlyName.includes('tent temperature') ||
        friendlyName.includes('tent humidity') ||
        friendlyName.includes('tent vpd') ||
        friendlyName.includes('probe temperature') ||
        friendlyName.includes('probe humidity') ||
        friendlyName.includes('probe vpd') ||
        friendlyName.includes('built-in temperature') ||
        friendlyName.includes('built-in humidity') ||
        friendlyName.includes('built-in vpd') ||
        friendlyName.includes('controller temperature') ||
        friendlyName.includes('controller humidity') ||
        friendlyName.includes('controller vpd') ||
        (friendlyName.includes('port ') && friendlyName.match(/port\s*\d+/))
      );
    });

    console.log('AC Infinity entities found:', acInfinityEntities);

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
      else if (entityName.includes('port') && (entityName.match(/port[_\s]*(\d+)/) || friendlyNameLower.match(/port[_\s]*(\d+)/))) {
        const portMatch = entityName.match(/port[_\s]*(\d+)/) || friendlyNameLower.match(/port[_\s]*(\d+)/);
        if (portMatch) {
          const portNum = parseInt(portMatch[1]);
          
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
          
          if (state.entity_id.startsWith('switch.') || entityName.includes('state')) {
            portObj.state = entity;
          } else if (entityName.includes('speak') || entityName.includes('current_power') || entityName.includes('power')) {
            portObj.power = entity;
            if (friendlyName && !friendlyName.toLowerCase().includes('power')) {
              portObj.name = friendlyName.replace(/\s+(State|Power|Current Power).*$/i, '');
            }
          } else if (entityName.includes('mode')) {
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
    // Return different icons based on port status
    if (!isOn) return '⚫'; // OFF
    
    const power = this._getEntityState(port.power);
    const powerNum = parseInt(power);
    
    if (powerNum === 0 || power === 'off') return '⚫';
    if (powerNum >= 1 && powerNum <= 3) return '🔵'; // Low power
    if (powerNum >= 4 && powerNum <= 6) return '🟢'; // Medium power  
    return '🟢'; // High power / ON
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
    const probeVpd = this._formatValue(this._getEntityState(controller.probe_vpd), 2);
    
    const controllerTemp = this._formatValue(this._getEntityState(controller.controller_temperature));
    const controllerHumidity = this._formatValue(this._getEntityState(controller.controller_humidity));
    const controllerVpd = this._formatValue(this._getEntityState(controller.controller_vpd), 1);
    
    // Ensure we always show 8 ports
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
          <div class="header">
            <div class="ai-badge">
              <div class="ai-icon">AI</div>
              <span>${this.config.title}</span>
            </div>
            <div class="status-icons">
              <span class="wifi-icon">📶</span>
              <span class="cloud-icon">☁️</span>
              <span class="time-display">${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}</span>
            </div>
          </div>
          
          <div class="main-display">
            <!-- Left Column: USB Port Icon and Ports List -->
            <div class="left-column">
              <div class="usb-port-icon">
                <span class="port-connector">⚡</span>
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
              
              ${this.config.show_ports ? html`
                <div class="ports-list">
                  ${ports.map(port => {
                    const state = this._getEntityState(port.state);
                    const power = this._getEntityState(port.power);
                    const isOn = state === 'on' || (power && power !== '0' && power !== 'off' && power !== 'unavailable' && power !== 'unknown');
                    const displayValue = isOn ? this._formatValue(power) : 'OFF';
                    
                    return html`
                      <div class="port-row ${isOn ? 'port-on' : 'port-off'}" 
                           @click="${() => this._handleEntityClick(port.state || port.power)}">
                        <span class="port-number">${port.number}</span>
                        <span class="port-icon">${this._getPortIcon(port, isOn)}</span>
                        <span class="port-status">${displayValue}</span>
                      </div>
                    `;
                  })}
                </div>
              ` : html``}
            </div>
            
            <!-- Center Column: Main Temperature Display -->
            <div class="center-column">
              <div class="main-temp" @click="${() => this._handleEntityClick(controller.probe_temperature)}">
                <span class="temp-value">${probeTemp}</span><span class="temp-unit">°F</span>
              </div>
              
              <div class="secondary-values">
                <div class="value-item" @click="${() => this._handleEntityClick(controller.probe_humidity)}">
                  <span class="value-number">${probeHumidity}</span>
                  <span class="value-unit">%</span>
                </div>
                <div class="value-item" @click="${() => this._handleEntityClick(controller.probe_vpd)}">
                  <span class="value-number">${probeVpd}</span>
                  <span class="value-unit">kPa</span>
                </div>
              </div>
              
              <div class="mode-display">
                <span class="mode-text">AUTO</span>
                <span class="mode-status">• HIGH TEMP</span>
              </div>
            </div>
            
            <!-- Right Column: Controller Sensors -->
            <div class="right-column">
              <div class="controller-sensor" @click="${() => this._handleEntityClick(controller.controller_temperature)}">
                <span class="sensor-icon cloud">☁️</span>
                <div class="sensor-value">
                  <span class="value">${controllerTemp}</span>
                  <span class="unit">°F</span>
                </div>
              </div>
              
              <div class="controller-sensor" @click="${() => this._handleEntityClick(controller.controller_humidity)}">
                <span class="sensor-icon drops">💧💧</span>
                <div class="sensor-value">
                  <span class="value">${controllerHumidity}</span>
                  <span class="unit">%</span>
                </div>
              </div>
              
              <div class="status-text">
                ON
              </div>
              
              <div class="set-to-display">
                <span class="set-to-label">SET TO</span>
                <span class="set-to-value">${controllerTemp}</span>
              </div>
              
              <div class="arrow-buttons">
                <div class="arrow-btn up">▲</div>
                <div class="arrow-btn down">▼</div>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <div class="brand">
              <span class="brand-divider"></span>
              <span class="brand-text">AC INFINITY</span>
              <span class="brand-divider"></span>
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
        background: transparent;
      }
      
      .ac-infinity-card {
        background: linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%);
        position: relative;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        color: #fff;
      }
      
      /* Header */
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 20px;
        border-bottom: 1px solid #2a2a2a;
      }
      
      .ai-badge {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .ai-icon {
        border: 2px solid #fff;
        border-radius: 3px;
        padding: 2px 6px;
        font-size: 11px;
        font-weight: bold;
        line-height: 1;
      }
      
      .status-icons {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 14px;
      }
      
      .wifi-icon, .cloud-icon {
        opacity: 0.7;
      }
      
      .time-display {
        font-size: 14px;
        font-weight: 300;
        letter-spacing: 0.5px;
        margin-left: 4px;
      }
      
      /* Main Display Grid */
      .main-display {
        display: grid;
        grid-template-columns: 140px 1fr 180px;
        gap: 0;
        padding: 20px 16px;
        min-height: 320px;
        align-items: start;
      }
      
      /* Left Column */
      .left-column {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
        padding-right: 16px;
      }
      
      .usb-port-icon {
        width: 32px;
        height: 32px;
        border: 2px solid #444;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        background: rgba(255, 255, 255, 0.03);
      }
      
      .control-buttons {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .control-btn {
        width: 42px;
        height: 42px;
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
        border-color: #555;
        color: #999;
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
      
      .ports-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
        width: 100%;
      }
      
      .port-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 8px;
        cursor: pointer;
        transition: background 0.2s;
        border-radius: 4px;
        font-size: 13px;
      }
      
      .port-row:hover {
        background: rgba(255, 255, 255, 0.05);
      }
      
      .port-number {
        color: #999;
        font-size: 12px;
        min-width: 10px;
      }
      
      .port-icon {
        font-size: 12px;
        min-width: 16px;
      }
      
      .port-status {
        font-size: 12px;
        font-weight: 500;
        min-width: 30px;
      }
      
      .port-on .port-status {
        color: #4CAF50;
      }
      
      .port-off {
        opacity: 0.4;
      }
      
      .port-off .port-status {
        color: #999;
      }
      
      /* Center Column */
      .center-column {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 20px;
        padding: 0 20px;
      }
      
      .main-temp {
        display: flex;
        align-items: baseline;
        cursor: pointer;
        transition: opacity 0.2s;
      }
      
      .main-temp:hover {
        opacity: 0.8;
      }
      
      .temp-value {
        font-size: 140px;
        font-weight: 200;
        line-height: 0.85;
        letter-spacing: -8px;
        font-family: 'Helvetica Neue', Arial, sans-serif;
      }
      
      .temp-unit {
        font-size: 40px;
        font-weight: 300;
        margin-left: -6px;
        align-self: flex-start;
        margin-top: 12px;
      }
      
      .secondary-values {
        display: flex;
        gap: 40px;
        align-items: center;
      }
      
      .value-item {
        display: flex;
        align-items: baseline;
        gap: 4px;
        cursor: pointer;
        transition: opacity 0.2s;
      }
      
      .value-item:hover {
        opacity: 0.8;
      }
      
      .value-number {
        font-size: 36px;
        font-weight: 400;
      }
      
      .value-unit {
        font-size: 16px;
        color: #999;
      }
      
      .mode-display {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 13px;
        margin-top: 8px;
      }
      
      .mode-text {
        font-weight: 600;
        letter-spacing: 0.5px;
      }
      
      .mode-status {
        color: #999;
      }
      
      /* Right Column */
      .right-column {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 16px;
        padding-left: 16px;
      }
      
      .controller-sensor {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        transition: opacity 0.2s;
      }
      
      .controller-sensor:hover {
        opacity: 0.8;
      }
      
      .sensor-icon {
        font-size: 18px;
        min-width: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .sensor-icon.drops {
        font-size: 14px;
        letter-spacing: -2px;
      }
      
      .sensor-value {
        display: flex;
        align-items: baseline;
        gap: 2px;
      }
      
      .sensor-value .value {
        font-size: 22px;
        font-weight: 400;
      }
      
      .sensor-value .unit {
        font-size: 14px;
        color: #999;
      }
      
      .status-text {
        font-size: 16px;
        font-weight: 500;
        margin-top: 8px;
        letter-spacing: 1px;
      }
      
      .set-to-display {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 4px;
        margin-top: 16px;
      }
      
      .set-to-label {
        font-size: 9px;
        color: #666;
        letter-spacing: 1px;
        font-weight: 500;
      }
      
      .set-to-value {
        font-size: 44px;
        font-weight: 300;
        line-height: 1;
      }
      
      .arrow-buttons {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 8px;
      }
      
      .arrow-btn {
        width: 36px;
        height: 36px;
        border: 1px solid #333;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 14px;
        color: #666;
        transition: all 0.2s;
        background: rgba(255, 255, 255, 0.02);
      }
      
      .arrow-btn:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: #555;
        color: #999;
      }
      
      /* Footer */
      .footer {
        display: flex;
        justify-content: center;
        padding: 12px;
        border-top: 1px solid #2a2a2a;
      }
      
      .brand {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 10px;
        color: #666;
        text-transform: uppercase;
        letter-spacing: 2px;
        font-weight: 500;
      }
      
      .brand-divider {
        width: 1px;
        height: 10px;
        background: #444;
      }
      
      /* Responsive */
      @media (max-width: 768px) {
        .main-display {
          grid-template-columns: 1fr;
          grid-template-rows: auto auto auto;
          gap: 24px;
        }
        
        .left-column {
          order: 3;
          padding-right: 0;
        }
        
        .center-column {
          order: 1;
          padding: 0;
        }
        
        .right-column {
          order: 2;
          align-items: center;
          padding-left: 0;
        }
        
        .temp-value {
          font-size: 100px;
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

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'ac-infinity-card',
  name: 'AC Infinity Controller Card',
  description: 'Display AC Infinity controller interface matching hardware display',
  preview: true,
  documentationURL: 'https://github.com/JoshuaSeidel/hass-acinfinity-lovelace-card'
});

console.info(
  '%c AC-INFINITY-CARD %c Version 1.0.4 ',
  'color: white; background: #000; font-weight: bold;',
  'color: white; background: #4CAF50; font-weight: bold;'
);
