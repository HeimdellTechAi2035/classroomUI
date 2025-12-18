import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import { Database } from './database';

export class BackupManager {
  private backupsPath: string;
  private dataPath: string;
  private database: Database;

  constructor(backupsPath: string, dataPath: string, database: Database) {
    this.backupsPath = backupsPath;
    this.dataPath = dataPath;
    this.database = database;

    if (!fs.existsSync(backupsPath)) {
      fs.mkdirSync(backupsPath, { recursive: true });
    }
  }

  // Create a backup
  async create(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const backupName = `backup_${timestamp}.zip`;
    const backupPath = path.join(this.backupsPath, backupName);

    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(backupPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        // Log backup creation
        this.database.createAuditLog({
          action: 'backup_created',
          entityType: 'system',
          details: `Backup created: ${backupName} (${archive.pointer()} bytes)`,
        });
        resolve(backupPath);
      });

      archive.on('error', (err: Error) => {
        reject(err);
      });

      archive.pipe(output);

      // Add database file
      const dbPath = path.join(this.dataPath, 'classroom.sqlite');
      if (fs.existsSync(dbPath)) {
        archive.file(dbPath, { name: 'classroom.sqlite' });
      }

      // Add config file
      const configPath = path.join(this.dataPath, 'config.json');
      if (fs.existsSync(configPath)) {
        archive.file(configPath, { name: 'config.json' });
      }

      // Add encryption key (handle with care!)
      const keyPath = path.join(this.dataPath, 'encryption.key');
      if (fs.existsSync(keyPath)) {
        archive.file(keyPath, { name: 'encryption.key' });
      }

      // Create a manifest
      const manifest = {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        platform: process.platform,
        files: ['classroom.sqlite', 'config.json', 'encryption.key'],
      };
      archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

      archive.finalize();
    });
  }

  // Restore from backup
  async restore(backupPath: string): Promise<boolean> {
    // Note: In a real implementation, we'd use extract-zip
    // For now, we'll use a simpler approach with the built-in modules
    
    if (!fs.existsSync(backupPath)) {
      throw new Error('Backup file not found');
    }

    // Close the database before restoring
    this.database.close();

    try {
      // For a proper implementation, you'd use extract-zip here
      // This is a placeholder that shows the intended flow
      
      // Log restore attempt
      // Note: Can't log to DB as it's closed, would need to reopen after
      
      return true;
    } catch (error) {
      console.error('Restore failed:', error);
      return false;
    }
  }

  // List available backups
  list(): { path: string; name: string; createdAt: string; size: number }[] {
    const backups: { path: string; name: string; createdAt: string; size: number }[] = [];

    if (fs.existsSync(this.backupsPath)) {
      const files = fs.readdirSync(this.backupsPath);
      
      for (const file of files) {
        if (file.endsWith('.zip')) {
          const filePath = path.join(this.backupsPath, file);
          const stat = fs.statSync(filePath);
          
          backups.push({
            path: filePath,
            name: file,
            createdAt: stat.birthtime.toISOString(),
            size: stat.size,
          });
        }
      }
    }

    return backups.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // Delete a backup
  delete(backupPath: string): boolean {
    try {
      if (fs.existsSync(backupPath) && backupPath.startsWith(this.backupsPath)) {
        fs.unlinkSync(backupPath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to delete backup:', error);
      return false;
    }
  }
}
