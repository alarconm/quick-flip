"""
Logging configuration for TradeUp.

Provides centralized logging setup with:
- Structured JSON logging for production
- Colored console output for development
- Request ID tracking (when middleware is enabled)
- Appropriate log levels per environment
"""
import os
import sys
import logging
from logging.handlers import RotatingFileHandler


def setup_logging(app=None):
    """
    Configure application-wide logging.

    Args:
        app: Flask app instance (optional, for app-specific config)
    """
    # Determine environment
    env = os.getenv('FLASK_ENV', 'development')
    is_production = env == 'production'

    # Set log level based on environment
    log_level_str = os.getenv('LOG_LEVEL', 'DEBUG' if not is_production else 'INFO')
    log_level = getattr(logging, log_level_str.upper(), logging.INFO)

    # Create formatter
    if is_production:
        # Production: JSON-like structured format for log aggregation
        formatter = logging.Formatter(
            '{"time":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","message":"%(message)s"}'
        )
    else:
        # Development: Human-readable format
        formatter = logging.Formatter(
            '[%(asctime)s] %(levelname)s %(name)s: %(message)s',
            datefmt='%H:%M:%S'
        )

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Remove existing handlers to avoid duplicates
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.setLevel(log_level)
    root_logger.addHandler(console_handler)

    # File handler for production (optional)
    log_file = os.getenv('LOG_FILE')
    if log_file:
        file_handler = RotatingFileHandler(
            log_file,
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=5
        )
        file_handler.setFormatter(formatter)
        file_handler.setLevel(log_level)
        root_logger.addHandler(file_handler)

    # Reduce noise from third-party libraries
    logging.getLogger('werkzeug').setLevel(logging.WARNING)
    logging.getLogger('urllib3').setLevel(logging.WARNING)
    logging.getLogger('httpx').setLevel(logging.WARNING)

    # SQLAlchemy logging (set to WARNING unless debugging queries)
    if os.getenv('SQLALCHEMY_DEBUG', 'false').lower() == 'true':
        logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
    else:
        logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)

    return root_logger


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger for a specific module.

    Args:
        name: Module name (typically __name__)

    Returns:
        Configured logger instance
    """
    return logging.getLogger(name)
