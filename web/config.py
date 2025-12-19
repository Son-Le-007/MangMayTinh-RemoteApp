"""
config.py - Configuration Management
Handles loading configuration from appsettings.json and environment variables
"""
import json
import os


def load_gateway_url():
    """
    Load gateway URL from appsettings.json or environment variable.
    
    Priority:
    1. GATEWAY_URL environment variable
    2. appsettings.json file
    3. Default: ws://localhost:8080
    
    Returns:
        str: Gateway WebSocket URL
    """
    default_url = "ws://localhost:8080"
    
    # Check environment variable first
    env_url = os.getenv('GATEWAY_URL')
    if env_url:
        return env_url
    
    try:
        # appsettings.json nằm ở thư mục gốc, web/main.py nằm trong thư mục web/
        # Nên cần đi lên 1 cấp: ../
        config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'appsettings.json')
        if os.path.exists(config_path):
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
                return config.get('GatewayServer', default_url)
        else:
            print(f"Warning: appsettings.json not found at {config_path}, using default: {default_url}")
            return default_url
    except (json.JSONDecodeError, KeyError, Exception) as e:
        print(f"Error loading appsettings.json: {e}, using default: {default_url}")
        return default_url


def get_port():
    """
    Get server port from environment variable or default.
    
    Returns:
        int: Server port (default: 5000)
    """
    return int(os.getenv('PORT', 5000))

