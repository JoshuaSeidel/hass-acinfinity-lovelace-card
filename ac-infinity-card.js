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
      show_sensors: config.show_sensors !== false,
      auto_detect: config.auto_detect !== false,
      entity: config.entity,
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
    const entities = Object.keys(this._hass.states).filter(entity => 
      entity.startsWith('sensor.') || 
      entity.startsWith('switch.') || 
      entity.startsWith('number.') ||
      entity.startsWith('select.') ||
      entity.startsWith('binary_sensor.')
    );

    // Find AC Infinity entities
    const acInfinityEntities = entities.filter(entity => {
      const domain = entity.split('.')[0];
      const entityId = entity.split('.')[1];
      return entityId.includes('ac_infinity') || 
             (this._hass.states[entity]?.attributes?.integration === 'ac_infinity');
    });

    // Organize entities by controller
    const controllers = {};
    
    acInfinityEntities.forEach(entity => {
      const state = this._hass.states[entity];
      if (!state) return;

      const deviceId = state.attributes?.device_id;
      if (!deviceId) return;

      if (!controllers[deviceId]) {
        controllers[deviceId] = {
          name: state.attributes?.friendly_name?.split(' ')[0] || 'Controller',
          temperature: null,
          humidity: null,
          vpd: null,
          mode: null,
          ports: {}
        };
      }

      // Categorize entities
      const entityName = entity.toLowerCase();
      
      if (entityName.includes('temperature') && !entityName.includes('port')) {
        controllers[deviceId].temperature = entity;
      } else if (entityName.includes('humidity') && !entityName.includes('port')) {
        controllers[deviceId].humidity = entity;
      } else if (entityName.includes('vpd') && !entityName.includes('port')) {
        controllers[deviceId].vpd = entity;
      } else if (entityName.includes('port_')) {
        const portMatch = entityName.match(/port_(\d+)/);
        if (portMatch) {
          const portNum = portMatch[1];
          if (!controllers[deviceId].ports[portNum]) {
            controllers[deviceId].ports[portNum] = {
              name: `Port ${portNum}`,
              state: null,
              power: null,
              mode: null
            };
          }
          
          if (entityName.includes('state')) {
            controllers[deviceId].ports[portNum].state = entity;
          } else if (entityName.includes('power') || entityName.includes('speak')) {
            controllers[deviceId].ports[portNum].power = entity;
          } else if (entityName.includes('active_mode')) {
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

  _formatValue(value, unit = '') {
    if (value === 'N/A' || value === 'unavailable' || value === 'unknown') return '--';
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return value;
    return `${Math.round(numValue)}${unit}`;
  }

  _handlePortClick(portEntity) {
    if (!portEntity) return;
    
    const event = new Event('hass-more-info', {
      bubbles: true,
      composed: true,
      cancelable: false,
    });
    event.detail = { entityId: portEntity };
    this.dispatchEvent(event);
  }

  _handleSettingsClick() {
    // Open more info for the controller
    const firstController = Object.values(this._entities)[0];
    if (firstController?.temperature) {
      this._handlePortClick(firstController.temperature);
    }
  }

  render() {
    if (!this.shadowRoot) return;

    const firstController = Object.values(this._entities)[0] || {};
    const temperature = this._getEntityState(firstController.temperature);
    const humidity = this._getEntityState(firstController.humidity);
    const vpd = this._getEntityState(firstController.vpd);
    const ports = firstController.ports || {};

    this.shadowRoot.innerHTML = `
      <style>
        * {
          box-sizing: border-box;
        }
        
        :host {
          display: block;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        }
        
        .ac-infinity-card {
          background: linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%);
          border-radius: 8px;
          padding: 0;
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #2a2a2a;
        }
        
        .ai-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #fff;
          font-weight: 600;
          font-size: 18px;
        }
        
        .ai-icon {
          width: 24px;
          height: 24px;
          border: 2px solid #fff;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: bold;
        }
        
        .status-icons {
          display: flex;
          gap: 16px;
          color: #999;
        }
        
        .icon {
          font-size: 20px;
          cursor: pointer;
          transition: color 0.2s;
        }
        
        .icon:hover {
          color: #fff;
        }
        
        .main-display {
          display: flex;
          padding: 24px 20px;
          gap: 20px;
          align-items: center;
          justify-content: space-between;
        }
        
        .left-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .ports-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        
        .port-item {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #999;
          font-size: 13px;
          padding: 4px 0;
          cursor: pointer;
          transition: color 0.2s;
        }
        
        .port-item:hover {
          color: #fff;
        }
        
        .port-number {
          color: #666;
          font-weight: 600;
          min-width: 12px;
        }
        
        .port-icon {
          font-size: 16px;
          min-width: 20px;
        }
        
        .port-value {
          font-weight: 500;
          min-width: 32px;
        }
        
        .port-off {
          color: #444;
        }
        
        .center-display {
          flex: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        
        .temperature-display {
          font-size: 96px;
          font-weight: 200;
          color: #fff;
          line-height: 1;
          letter-spacing: -4px;
        }
        
        .temp-unit {
          font-size: 32px;
          vertical-align: super;
          margin-left: -8px;
        }
        
        .mode-status {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #999;
          font-size: 13px;
          margin-top: 8px;
        }
        
        .mode-badge {
          color: #fff;
          font-weight: 600;
        }
        
        .high-temp-indicator {
          color: #ff6b6b;
          font-weight: 600;
        }
        
        .right-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 16px;
          align-items: flex-end;
        }
        
        .time-display {
          font-size: 24px;
          color: #fff;
          font-weight: 300;
        }
        
        .climate-values {
          display: flex;
          flex-direction: column;
          gap: 12px;
          text-align: right;
        }
        
        .climate-item {
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: flex-end;
        }
        
        .climate-icon {
          font-size: 20px;
          color: #666;
        }
        
        .climate-value {
          font-size: 20px;
          color: #fff;
          font-weight: 500;
          min-width: 60px;
        }
        
        .climate-unit {
          font-size: 14px;
          color: #999;
        }
        
        .set-to-section {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
          margin-top: 8px;
        }
        
        .set-to-label {
          font-size: 11px;
          color: #666;
          text-transform: uppercase;
        }
        
        .set-to-value {
          font-size: 32px;
          color: #fff;
          font-weight: 400;
        }
        
        .footer {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 12px 20px;
          border-top: 1px solid #2a2a2a;
        }
        
        .brand {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #666;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 2px;
        }
        
        .brand-logo {
          font-size: 16px;
          font-weight: bold;
        }
        
        .control-buttons {
          position: absolute;
          left: 20px;
          bottom: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .control-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid #333;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #999;
          transition: all 0.2s;
        }
        
        .control-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          border-color: #666;
        }
        
        .menu-icon {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .menu-line {
          width: 18px;
          height: 2px;
          background: currentColor;
          border-radius: 1px;
        }
        
        .settings-icon {
          font-size: 20px;
        }
        
        @media (max-width: 768px) {
          .main-display {
            flex-direction: column;
            padding: 16px;
          }
          
          .temperature-display {
            font-size: 72px;
          }
          
          .left-section,
          .right-section {
            width: 100%;
            align-items: center;
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
            <span class="icon">📶</span>
            <span class="icon">☁️</span>
            <span class="time-display">${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
          </div>
        </div>
        
        <div class="control-buttons">
          <div class="control-btn">
            <div class="menu-icon">
              <div class="menu-line"></div>
              <div class="menu-line"></div>
              <div class="menu-line"></div>
            </div>
          </div>
          <div class="control-btn" @click="${() => this._handleSettingsClick()}">
            <span class="settings-icon">⚙️</span>
          </div>
        </div>
        
        <div class="main-display">
          <div class="left-section">
            <div class="ports-list">
              ${Object.keys(ports).sort().map(portNum => {
                const port = ports[portNum];
                const state = this._getEntityState(port.state);
                const power = this._getEntityState(port.power);
                const isOn = state === 'on' || (power && power !== '0' && power !== 'off');
                
                return `
                  <div class="port-item ${isOn ? '' : 'port-off'}" @click="${() => this._handlePortClick(port.state)}">
                    <span class="port-number">${portNum}</span>
                    <span class="port-icon">🔌</span>
                    <span class="port-value">${isOn ? this._formatValue(power) : 'OFF'}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
          
          <div class="center-display">
            <div class="temperature-display">
              ${this._formatValue(temperature)}<span class="temp-unit">°F</span>
            </div>
            <div class="mode-status">
              <span class="mode-badge">AUTO</span>
              <span>• HIGH TEMP</span>
            </div>
          </div>
          
          <div class="right-section">
            <div class="climate-values">
              <div class="climate-item">
                <span class="climate-icon">💧</span>
                <div>
                  <span class="climate-value">${this._formatValue(humidity)}<span class="climate-unit">%</span></span>
                </div>
              </div>
              <div class="climate-item">
                <span class="climate-icon">🌡️</span>
                <div>
                  <span class="climate-value">${this._formatValue(temperature)}<span class="climate-unit">°F</span></span>
                </div>
              </div>
              <div class="climate-item">
                <span class="climate-icon">💨</span>
                <div>
                  <span class="climate-value">${this._formatValue(humidity)}<span class="climate-unit">%</span></span>
                </div>
              </div>
              <div class="climate-item">
                <span class="climate-icon">📊</span>
                <div>
                  <span class="climate-value">${this._formatValue(vpd)}<span class="climate-unit">kPa</span></span>
                </div>
              </div>
            </div>
            <div class="set-to-section">
              <span class="set-to-label">SET TO</span>
              <span class="set-to-value">${this._formatValue(temperature, '')}</span>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <div class="brand">
            <span class="brand-logo">▲</span>
            <span>AC INFINITY</span>
          </div>
        </div>
      </div>
    `;
    
    // Add event listeners
    this.shadowRoot.querySelectorAll('.port-item').forEach((item, index) => {
      const portNum = Object.keys(ports).sort()[index];
      const port = ports[portNum];
      if (port?.state) {
        item.addEventListener('click', () => this._handlePortClick(port.state));
      }
    });
    
    const settingsBtn = this.shadowRoot.querySelector('.control-btn:last-child');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => this._handleSettingsClick());
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
      show_ports: true,
      show_sensors: true
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
  '%c AC-INFINITY-CARD %c Version 1.0.0 ',
  'color: white; background: #000; font-weight: bold;',
  'color: white; background: #4CAF50; font-weight: bold;'
);
