export class ConfigurationError extends Error {
  name = 'ConfigurationError';

  constructor(message = 'Invalid configuration file given') {
    super(message);
  }
}
