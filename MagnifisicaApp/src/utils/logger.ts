// utils/logger.ts
import crashlytics from "@react-native-firebase/crashlytics";

type LogLevel = "log" | "info" | "warn" | "error" | "debug";

interface LoggerConfig {
  enableInProduction?: boolean;
  enableCrashlytics?: boolean;
  logLevel?: LogLevel;
}

class Logger {
  private isDevelopment: boolean;
  private config: LoggerConfig;

  constructor(config: LoggerConfig = {}) {
    this.isDevelopment = __DEV__;
    this.config = {
      enableInProduction: false,
      enableCrashlytics: true,
      logLevel: "debug",
      ...config,
    };
  }

  /**
   * Format log message with timestamp and context
   */
  private formatMessage(
    level: string,
    message: string,
    context?: string
  ): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? `[${context}]` : "";
    return `[${timestamp}] [${level.toUpperCase()}] ${contextStr} ${message}`;
  }

  /**
   * Send log to Crashlytics
   */
  private sendToCrashlytics(
    level: LogLevel,
    message: string,
    data?: any
  ): void {
    if (!this.config.enableCrashlytics) return;

    try {
      const logMessage = data
        ? `${message} | Data: ${JSON.stringify(data)}`
        : message;

      crashlytics().log(logMessage);

      // Record error level logs as non-fatal errors
      if (level === "error" && data instanceof Error) {
        crashlytics().recordError(data);
      }
    } catch (error) {
      // Fail silently if crashlytics fails
      if (this.isDevelopment) {
        console.error("Failed to log to Crashlytics:", error);
      }
    }
  }

  /**
   * Check if logging is enabled for current environment
   */
  private shouldLog(): boolean {
    return this.isDevelopment || this.config.enableInProduction;
  }

  /**
   * General log - for regular information
   */
  log(message: string, data?: any, context?: string): void {
    if (this.shouldLog()) {
      const formatted = this.formatMessage("log", message, context);
      console.log(formatted, data || "");
    }

    if (!this.isDevelopment) {
      this.sendToCrashlytics("log", message, data);
    }
  }

  /**
   * Info log - for informational messages
   */
  info(message: string, data?: any, context?: string): void {
    if (this.shouldLog()) {
      const formatted = this.formatMessage("info", message, context);
      console.info(formatted, data || "");
    }

    if (!this.isDevelopment) {
      this.sendToCrashlytics("info", message, data);
    }
  }

  /**
   * Warning log - for potential issues
   */
  warn(message: string, data?: any, context?: string): void {
    if (this.shouldLog()) {
      const formatted = this.formatMessage("warn", message, context);
      console.warn(formatted, data || "");
    }

    this.sendToCrashlytics("warn", message, data);
  }

  /**
   * Error log - for errors and exceptions
   */
  error(message: string, error?: any, context?: string): void {
    if (this.shouldLog()) {
      const formatted = this.formatMessage("error", message, context);
      console.error(formatted, error || "");
    }

    this.sendToCrashlytics("error", message, error);
  }

  /**
   * Debug log - only in development
   */
  debug(message: string, data?: any, context?: string): void {
    if (this.isDevelopment) {
      const formatted = this.formatMessage("debug", message, context);
      console.debug(formatted, data || "");
    }
  }

  /**
   * Success log - for successful operations
   */
  success(message: string, data?: any, context?: string): void {
    if (this.shouldLog()) {
      const formatted = this.formatMessage("success", `✅ ${message}`, context);
      console.log(formatted, data || "");
    }

    if (!this.isDevelopment) {
      this.sendToCrashlytics("log", `SUCCESS: ${message}`, data);
    }
  }

  /**
   * Group logs together (useful for debugging complex operations)
   */
  group(label: string, callback: () => void): void {
    if (this.shouldLog()) {
      console.group(label);
      callback();
      console.groupEnd();
    }
  }

  /**
   * Table log - for displaying data in table format
   */
  table(data: any): void {
    if (this.shouldLog() && console.table) {
      console.table(data);
    }
  }

  /**
   * Set user identifier for crash reports
   */
  setUserId(userId: string): void {
    if (this.config.enableCrashlytics) {
      crashlytics().setUserId(userId);
    }
  }

  /**
   * Set custom attributes for crash reports
   */
  setAttribute(key: string, value: string): void {
    if (this.config.enableCrashlytics) {
      crashlytics().setAttribute(key, value);
    }
  }
}

// Create singleton instance
export const logger = new Logger({
  enableInProduction: false,
  enableCrashlytics: true,
});

// Export for configuration updates
export { Logger };
