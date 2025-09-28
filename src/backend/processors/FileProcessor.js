import fs from 'fs/promises';
import path from 'path';
import csvParser from 'csv-parser';
import xlsx from 'xlsx';
import xml2js from 'xml2js';
import { createReadStream } from 'fs';

export class FileProcessor {
  constructor() {
    this.supportedFormats = ['csv', 'json', 'txt', 'xlsx', 'xls', 'xml'];
    this.maxFileSize = 100 * 1024 * 1024; // 100MB limit
  }

  async process(data) {
    const { filePath, operation = 'read', nodeId, executionId, options = {} } = data;

    if (!filePath) {
      throw new Error('File path is required');
    }

    try {
      // Check if file exists and get stats
      const stats = await fs.stat(filePath);
      
      if (stats.size > this.maxFileSize) {
        throw new Error(`File size (${stats.size} bytes) exceeds maximum allowed size (${this.maxFileSize} bytes)`);
      }

      const fileExtension = path.extname(filePath).toLowerCase().slice(1);
      
      switch (operation.toLowerCase()) {
        case 'read':
          return await this.readFile(filePath, fileExtension, options);
        case 'write':
          return await this.writeFile(filePath, data.content, fileExtension, options);
        case 'delete':
          return await this.deleteFile(filePath);
        case 'info':
          return await this.getFileInfo(filePath, stats);
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }
    } catch (error) {
      console.error(`File processing failed for execution ${executionId}:`, error);
      throw new Error(`File processing failed: ${error.message}`);
    }
  }

  async readFile(filePath, fileExtension, options = {}) {
    try {
      switch (fileExtension) {
        case 'csv':
          return await this.readCSV(filePath, options);
        case 'json':
          return await this.readJSON(filePath);
        case 'xlsx':
        case 'xls':
          return await this.readExcel(filePath, options);
        case 'xml':
          return await this.readXML(filePath, options);
        case 'txt':
        default:
          return await this.readText(filePath);
      }
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error.message}`);
    }
  }

  async readCSV(filePath, options = {}) {
    return new Promise((resolve, reject) => {
      const results = [];
      const delimiter = options.delimiter || ',';
      const headers = options.headers !== false;

      createReadStream(filePath)
        .pipe(csvParser({ separator: delimiter, headers }))
        .on('data', (data) => results.push(data))
        .on('end', () => {
          resolve({
            type: 'csv',
            data: results,
            rowCount: results.length,
            columns: results.length > 0 ? Object.keys(results[0]) : [],
            timestamp: new Date().toISOString()
          });
        })
        .on('error', (error) => reject(error));
    });
  }

  async readJSON(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(content);
    
    return {
      type: 'json',
      data,
      size: content.length,
      timestamp: new Date().toISOString()
    };
  }

  async readExcel(filePath, options = {}) {
    const workbook = xlsx.readFile(filePath);
    const sheetName = options.sheetName || workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    if (!sheet) {
      throw new Error(`Sheet '${sheetName}' not found in workbook`);
    }

    const data = xlsx.utils.sheet_to_json(sheet, { header: options.headers !== false ? 1 : undefined });
    
    return {
      type: 'excel',
      data,
      sheetName,
      availableSheets: workbook.SheetNames,
      rowCount: data.length,
      columns: data.length > 0 ? Object.keys(data[0]) : [],
      timestamp: new Date().toISOString()
    };
  }

  async readXML(filePath, options = {}) {
    const content = await fs.readFile(filePath, 'utf8');
    const parser = new xml2js.Parser(options.parserOptions || {});
    const data = await parser.parseStringPromise(content);
    
    return {
      type: 'xml',
      data,
      size: content.length,
      timestamp: new Date().toISOString()
    };
  }

  async readText(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    
    return {
      type: 'text',
      data: content,
      size: content.length,
      lineCount: content.split('\n').length,
      timestamp: new Date().toISOString()
    };
  }

  async writeFile(filePath, content, fileExtension, options = {}) {
    try {
      // Ensure directory exists
      const directory = path.dirname(filePath);
      await fs.mkdir(directory, { recursive: true });

      switch (fileExtension) {
        case 'csv':
          await this.writeCSV(filePath, content, options);
          break;
        case 'json':
          await this.writeJSON(filePath, content, options);
          break;
        case 'xlsx':
          await this.writeExcel(filePath, content, options);
          break;
        case 'xml':
          await this.writeXML(filePath, content, options);
          break;
        case 'txt':
        default:
          await this.writeText(filePath, content);
          break;
      }

      const stats = await fs.stat(filePath);
      
      return {
        success: true,
        filePath,
        size: stats.size,
        type: fileExtension,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to write file ${filePath}: ${error.message}`);
    }
  }

  async writeCSV(filePath, data, options = {}) {
    if (!Array.isArray(data)) {
      throw new Error('CSV data must be an array of objects');
    }

    const delimiter = options.delimiter || ',';
    const includeHeaders = options.headers !== false;
    
    let csvContent = '';
    
    if (data.length > 0 && includeHeaders) {
      const headers = Object.keys(data[0]);
      csvContent += headers.join(delimiter) + '\n';
    }
    
    for (const row of data) {
      const values = Object.values(row).map(value => 
        typeof value === 'string' && (value.includes(delimiter) || value.includes('\n')) 
          ? `"${value.replace(/"/g, '""')}"` 
          : value
      );
      csvContent += values.join(delimiter) + '\n';
    }

    await fs.writeFile(filePath, csvContent, 'utf8');
  }

  async writeJSON(filePath, data, options = {}) {
    const indent = options.pretty ? 2 : 0;
    const jsonContent = JSON.stringify(data, null, indent);
    await fs.writeFile(filePath, jsonContent, 'utf8');
  }

  async writeExcel(filePath, data, options = {}) {
    const workbook = xlsx.utils.book_new();
    const sheetName = options.sheetName || 'Sheet1';
    const worksheet = xlsx.utils.json_to_sheet(data);
    
    xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
    xlsx.writeFile(workbook, filePath);
  }

  async writeXML(filePath, data, options = {}) {
    const builder = new xml2js.Builder(options.builderOptions || {});
    const xmlContent = builder.buildObject(data);
    await fs.writeFile(filePath, xmlContent, 'utf8');
  }

  async writeText(filePath, content) {
    await fs.writeFile(filePath, content, 'utf8');
  }

  async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
      
      return {
        success: true,
        filePath,
        operation: 'delete',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to delete file ${filePath}: ${error.message}`);
    }
  }

  async getFileInfo(filePath, stats = null) {
    if (!stats) {
      stats = await fs.stat(filePath);
    }

    const fileExtension = path.extname(filePath).toLowerCase().slice(1);
    
    return {
      path: filePath,
      name: path.basename(filePath),
      extension: fileExtension,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      supported: this.supportedFormats.includes(fileExtension),
      timestamp: new Date().toISOString()
    };
  }

  // Utility method to validate file path
  validateFilePath(filePath) {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path');
    }

    // Basic security check - prevent directory traversal
    if (filePath.includes('..') || filePath.includes('~')) {
      throw new Error('Invalid file path - directory traversal not allowed');
    }

    return true;
  }

  // Test file access
  async testFileAccess(filePath, operation = 'read') {
    try {
      this.validateFilePath(filePath);
      
      switch (operation) {
        case 'read':
          await fs.access(filePath, fs.constants.R_OK);
          break;
        case 'write':
          await fs.access(path.dirname(filePath), fs.constants.W_OK);
          break;
        default:
          await fs.access(filePath, fs.constants.F_OK);
      }

      return {
        status: 'accessible',
        operation,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'not_accessible',
        operation,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}