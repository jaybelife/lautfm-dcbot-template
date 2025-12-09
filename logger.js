import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

const logFilePath = path.join(process.cwd(), 'bot.log');

function writeToFile(message) {
  const logMessage = `${message}\n`;
  fs.appendFileSync(logFilePath, logMessage, 'utf8');
}

function logToConsole(type, message) {
  const typeColor = {
    info: chalk.blue('[INFO]'),
    warn: chalk.yellow('[WARN]'),
    error: chalk.red('[ERROR]'),
    success: chalk.green('[SUCCESS]')
  };

  console.log(`${typeColor[type] || chalk.white('[LOG]')} ${message}`);
}

export function log(type, message, meta = {}) {
  const timestamp = new Date().toLocaleString();
  let formattedMessage = `[${timestamp}] ${message}`;

  if (meta.stream && meta.channel && meta.server) {
    formattedMessage += ` | Server: "${meta.server.name}" (${meta.server.id}), Kanal: "${meta.channel.name}" (${meta.channel.id}), Stream: "${meta.stream.name}" (${meta.stream.id})`;
  }
  else if (meta.command && meta.server && meta.channel) {
    formattedMessage += ` | Command: "${meta.command}", Server: "${meta.server.name}" (${meta.server.id}), Kanal: "${meta.channel.name}" (${meta.channel.id})`;
  }

  logToConsole(type, formattedMessage);

  writeToFile(formattedMessage);
}
