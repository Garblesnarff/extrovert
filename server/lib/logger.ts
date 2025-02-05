interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

class Logger {
  private logToConsole(level: string, message: string) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message
    };
    
    console.log(JSON.stringify(entry));
  }

  info(message: string) {
    this.logToConsole('INFO', message);
  }

  error(message: string) {
    this.logToConsole('ERROR', message);
  }

  warn(message: string) {
    this.logToConsole('WARN', message);
  }
}

export const logger = new Logger();
