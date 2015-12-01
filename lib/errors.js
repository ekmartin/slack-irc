export class ConfigurationError extends Error {
  constructor(message = 'Invalid configuration file given') {
    super(message);
    this.name = 'ConfigurationError';
  }
}
