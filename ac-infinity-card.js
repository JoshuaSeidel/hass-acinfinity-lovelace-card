class ACInfinityCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._hass = {};
    this._entities = {};
  }

  setConfig(config) {
    if (!config) {
      throw new Error('Invalid configuration');
    }
    
    this._config = {
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
    
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    
    if (this._config.auto_detect) {
      this._autoDetectEntities();
    }
    
    this.render();
  }

  _autoDetectEntities() {
    const entities = Object.keys(this._hass.states);

    // Find AC Infinity entities by checking if integration attribute equals 'ac_infinity'
    const acInfinityEntities = entities.filter(entity => {
      const state = this._hass.states[entity];
      return state && state.attributes && state.attributes.integration === 'ac_infinity';
    });

    // Group by device_id (controller)
    const controllers = {};
    
    acInfinityEntities.forEach(entity => {
      const state = this._hass.states[entity];
      if (!state) return;
      
      // Use device_id or entity_id as key for grouping
      const deviceId = state.attributes?.device_id || 'default';

      if (!controllers[deviceId]) {
        controllers[deviceId] = {
          name: this._config.title,
          // Tent/Probe sensors (primary display)
          probe_temperature: null,
          probe_humidity: null,
          probe_vpd: null,
          // Controller sensors (right side display)
          controller_temperature: null,
          controller_humidity: null,
          controller_vpd: null,
          ports: {}
        };
      }

      const entityName = entity.toLowerCase();
      const friendlyName = (state.attributes?.friendly_name || '').toLowerCase();
      
      // Detect probe/tent sensors (main display center)
      if (entityName.includes('tent_temperature') || entityName.includes('probe_temperature') || friendlyName.includes('tent temperature') || friendlyName.includes('probe temperature')) {
        controllers[deviceId].probe_temperature = entity;;
      } else if (entityName.includes('tent_humidity') || entityName.includes('probe_humidity') || friendlyName.includes('tent humidity') || friendlyName.includes('probe humidity')) {
        controllers[deviceId].probe_humidity = entity;
      } else if (entityName.includes('tent_vpd') || entityName.includes('probe_vpd') || friendlyName.includes('tent vpd') || friendlyName.includes('probe vpd')) {
        controllers[deviceId].probe_vpd = entity;
      }
      // Detect controller sensors (right side display)
      else if ((entityName.includes('controller_temperature') || entityName.includes('built_in_temperature') || friendlyName.includes('controller temperature') || friendlyName.includes('built-in temperature')) && !entityName.includes('port')) {
        controllers[deviceId].controller_temperature = entity;
      } else if ((entityName.includes('controller_humidity') || entityName.includes('built_in_humidity') || friendlyName.includes('controller humidity') || friendlyName.includes('built-in humidity')) && !entityName.includes('port')) {
        controllers[deviceId].controller_humidity = entity;
      } else if ((entityName.includes('controller_vpd') || entityName.includes('built_in_vpd') || friendlyName.includes('controller vpd') || friendlyName.includes('built-in vpd')) && !entityName.includes('port')) {
        controllers[deviceId].controller_vpd = entity;
      }
      // Fallback: if no probe sensors, use controller sensors
      else if (!controllers[deviceId].probe_temperature && entityName.includes('temperature') && !entityName.includes('port')) {
        controllers[deviceId].probe_temperature = entity;
      } else if (!controllers[deviceId].probe_humidity && entityName.includes('humidity') && !entityName.includes('port')) {
        controllers[deviceId].probe_humidity = entity;
      } else if (!controllers[deviceId].probe_vpd && entityName.includes('vpd') && !entityName.includes('port')) {
        controllers[deviceId].probe_vpd = entity;
      }
      // Port entities
      else if (entityName.includes('port') && (entityName.match(/port[_\s]*(\d+)/) || friendlyName.match(/port[_\s]*(\d+)/))) {
        const portMatch = entityName.match(/port[_\s]*(\d+)/) || friendlyName.match(/port[_\s]*(\d+)/);
        if (portMatch) {
          const portNum = portMatch[1];
          if (!controllers[deviceId].ports[portNum]) {
            controllers[deviceId].ports[portNum] = {
              name: state.attributes?.friendly_name || `Port ${portNum}`,
              state: null,
              power: null,
              mode: null
            };
          }
          
          if (entityName.includes('state')) {
            controllers[deviceId].ports[portNum].state = entity;
          } else if (entityName.includes('speak') || entityName.includes('current_power') || entityName.includes('power')) {
            controllers[deviceId].ports[portNum].power = entity;
          } else if (entityName.includes('active_mode') || entityName.includes('mode')) {
            controllers[deviceId].ports[portNum].mode = entity;
          }
        }
      }
    });

    this._entities = controllers;
  }

  _getEntityState(entityId) {
    if (!entityId || !this._hass.states[entityId]) return 'N/A';
    return this._hass.states[entityId].state;
  }

  _getEntityAttribute(entityId, attribute) {
    if (!entityId || !this._hass.states[entityId]) return null;
    return this._hass.states[entityId].attributes?.[attribute];
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
    if (!this.shadowRoot) return;

    // Use manual config if provided, otherwise use first auto-detected controller
    let controller;
    if (this._config.probe_temp_entity) {
      controller = {
        probe_temperature: this._config.probe_temp_entity,
        probe_humidity: this._config.probe_humidity_entity,
        probe_vpd: this._config.probe_vpd_entity,
        controller_temperature: this._config.controller_temp_entity,
        controller_humidity: this._config.controller_humidity_entity,
        controller_vpd: this._config.controller_vpd_entity,
        ports: {}
      };
    } else {
      controller = Object.values(this._entities)[0] || {};
    }

    const probeTemp = this._formatValue(this._getEntityState(controller.probe_temperature));
    const probeHumidity = this._formatValue(this._getEntityState(controller.probe_humidity));
    const probeVpd = this._formatValue(this._getEntityState(controller.probe_vpd), 2);
    
    const controllerTemp = this._formatValue(this._getEntityState(controller.controller_temperature));
    const controllerHumidity = this._formatValue(this._getEntityState(controller.controller_humidity));
    const controllerVpd = this._formatValue(this._getEntityState(controller.controller_vpd), 1);
    
    const ports = controller.ports || {};

    this.shadowRoot.innerHTML = `
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        :host {
          display: block;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .ac-infinity-card {
          background: linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%);
          border-radius: 8px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
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
          gap: 4px;
        }
        
        .port-item {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #fff;
          font-size: 14px;
          padding: 6px 0;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        
        .port-item:hover {
          opacity: 0.8;
        }
        
        .port-number {
          color: #999;
          font-weight: 500;
          min-width: 12px;
          font-size: 13px;
        }
        
        .port-icon {
          font-size: 16px;
          min-width: 20px;
        }
        
        .port-value {
          font-weight: 500;
          min-width: 40px;
          color: #fff;
        }
        
        .port-off {
          opacity: 0.3;
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
      </style>
      
      <div class="ac-infinity-card">
        <div class="header">
          <div class="ai-badge">
            <div class="ai-icon">AI</div>
            <span>${this._config.title}</span>
          </div>
          <div class="status-icons">
            <span style="font-size: 18px;">📶</span>
            <span style="font-size: 18px;">☁️</span>
            <span class="time-display">${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}</span>
          </div>
        </div>
        
        <div class="control-buttons">
          <div class="control-btn" id="menu-btn">
            <div class="menu-icon">
              <div class="menu-line"></div>
              <div class="menu-line"></div>
              <div class="menu-line"></div>
            </div>
          </div>
          <div class="control-btn" id="settings-btn">
            <span class="settings-icon">⚙</span>
          </div>
        </div>
        
        <div class="main-display">
          <div class="left-section">
            <div class="ports-list">
              ${Object.keys(ports).sort((a, b) => parseInt(a) - parseInt(b)).map(portNum => {
                const port = ports[portNum];
                const state = this._getEntityState(port.state);
                const power = this._getEntityState(port.power);
                const isOn = state === 'on' || (power && power !== '0' && power !== 'off' && power !== 'unavailable');
                
                return `
                  <div class="port-item ${isOn ? '' : 'port-off'}" data-entity="${port.state || port.power || ''}">
                    <span class="port-number">${portNum}</span>
                    <span class="port-icon">🔌</span>
                    <span class="port-value">${isOn ? this._formatValue(power) : 'OFF'}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
          
          <div class="center-display">
            <div class="temperature-display" data-entity="${controller.probe_temperature || ''}">
              ${probeTemp}<span class="temp-unit">°F</span>
            </div>
            <div class="probe-values">
              <div class="probe-value" data-entity="${controller.probe_humidity || ''}">
                <span class="probe-number">${probeHumidity}</span>
                <span class="probe-unit">%</span>
              </div>
              <div class="probe-value" data-entity="${controller.probe_vpd || ''}">
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
              <div class="climate-value" data-entity="${controller.controller_temperature || ''}">
                ${controllerTemp}<span class="climate-unit">°F</span>
              </div>
              <div class="climate-value" data-entity="${controller.controller_humidity || ''}">
                ${controllerHumidity}<span class="climate-unit">%</span>
              </div>
              <div class="climate-value" data-entity="${controller.controller_vpd || ''}">
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
    `;
    
    // Add event listeners for clickable elements
    this.shadowRoot.querySelectorAll('[data-entity]').forEach(element => {
      const entityId = element.getAttribute('data-entity');
      if (entityId && entityId !== '') {
        element.addEventListener('click', () => this._handleEntityClick(entityId));
      }
    });
    
    const settingsBtn = this.shadowRoot.querySelector('#settings-btn');
    if (settingsBtn && controller.probe_temperature) {
      settingsBtn.addEventListener('click', () => this._handleEntityClick(controller.probe_temperature));
    }
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
  '%c AC-INFINITY-CARD %c Version 1.0.2 ',
  'color: white; background: #000; font-weight: bold;',
  'color: white; background: #4CAF50; font-weight: bold;'
);
