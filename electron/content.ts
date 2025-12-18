import * as fs from 'fs';
import * as path from 'path';

interface WeekContent {
  weekNumber: number;
  title: string;
  overview: string;
  hasSlides: boolean;
  hasTrainerNotes: boolean;
  hasActivities: boolean;
  resources: string[];
}

interface PolicyContent {
  id: string;
  title: string;
  filename: string;
  content: string;
}

export class ContentManager {
  private contentPath: string;

  constructor(contentPath: string) {
    this.contentPath = contentPath;
  }

  // Week titles mapping
  private weekTitles: Record<number, string> = {
    1: 'Onboarding & Assessment',
    2: 'Sales & Communication Training',
    3: 'SEO Fundamentals',
    4: 'AI Skills Development',
    5: 'Supported Work Practice',
    6: 'Deployment & Review',
  };

  // Get all weeks
  getWeeks(): WeekContent[] {
    const weeks: WeekContent[] = [];
    const weeksPath = path.join(this.contentPath, 'weeks');

    for (let i = 1; i <= 6; i++) {
      const weekFolder = path.join(weeksPath, `week-0${i}`);
      
      if (fs.existsSync(weekFolder)) {
        const week: WeekContent = {
          weekNumber: i,
          title: this.weekTitles[i] || `Week ${i}`,
          overview: this.readWeekOverview(weekFolder),
          hasSlides: this.hasSlides(weekFolder),
          hasTrainerNotes: fs.existsSync(path.join(weekFolder, 'trainer-notes.md')),
          hasActivities: fs.existsSync(path.join(weekFolder, 'activities.md')),
          resources: this.getWeekResourceFiles(weekFolder),
        };
        weeks.push(week);
      } else {
        // Create week placeholder
        weeks.push({
          weekNumber: i,
          title: this.weekTitles[i] || `Week ${i}`,
          overview: 'Content not yet added for this week.',
          hasSlides: false,
          hasTrainerNotes: false,
          hasActivities: false,
          resources: [],
        });
      }
    }

    return weeks;
  }

  // Get single week
  getWeek(weekNumber: number): { 
    weekNumber: number; 
    title: string; 
    overview: string; 
    trainerNotes: string; 
    activities: string;
    hasSlides: boolean;
    resources: { name: string; path: string }[];
  } | null {
    const weekFolder = path.join(this.contentPath, 'weeks', `week-0${weekNumber}`);
    
    if (!fs.existsSync(weekFolder)) {
      return null;
    }

    return {
      weekNumber,
      title: this.weekTitles[weekNumber] || `Week ${weekNumber}`,
      overview: this.readWeekOverview(weekFolder),
      trainerNotes: this.readFile(path.join(weekFolder, 'trainer-notes.md')) || '',
      activities: this.readFile(path.join(weekFolder, 'activities.md')) || '',
      hasSlides: this.hasSlides(weekFolder),
      resources: this.getWeekResourceFiles(weekFolder).map(name => ({
        name,
        path: path.join(weekFolder, 'resources', name),
      })),
    };
  }

  // Get slides for a week (as image paths or PPTX path)
  getWeekSlides(weekNumber: number): string[] {
    const weekFolder = path.join(this.contentPath, 'weeks', `week-0${weekNumber}`);
    const slidesFolder = path.join(weekFolder, 'slides');
    
    // Check for images in slides folder
    if (fs.existsSync(slidesFolder)) {
      const files = fs.readdirSync(slidesFolder);
      const imageFiles = files
        .filter(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f))
        .sort((a, b) => {
          // Sort numerically if possible
          const numA = parseInt(a.match(/\d+/)?.[0] || '0');
          const numB = parseInt(b.match(/\d+/)?.[0] || '0');
          return numA - numB;
        })
        .map(f => path.join(slidesFolder, f));
      
      if (imageFiles.length > 0) {
        return imageFiles;
      }
    }

    // Check for PPTX file
    const pptxPath = path.join(weekFolder, 'slides.pptx');
    if (fs.existsSync(pptxPath)) {
      return [pptxPath];
    }

    return [];
  }

  // Get week resources
  getWeekResources(weekNumber: number): { name: string; path: string; type: string }[] {
    const weekFolder = path.join(this.contentPath, 'weeks', `week-0${weekNumber}`);
    const resourcesFolder = path.join(weekFolder, 'resources');
    
    if (!fs.existsSync(resourcesFolder)) {
      return [];
    }

    const files = fs.readdirSync(resourcesFolder);
    return files.map(name => ({
      name,
      path: path.join(resourcesFolder, name),
      type: this.getResourceType(name),
    }));
  }

  // Read any file
  readFile(filePath: string): string | null {
    try {
      // Resolve path relative to content folder if not absolute
      const resolvedPath = path.isAbsolute(filePath) 
        ? filePath 
        : path.join(this.contentPath, filePath);
      
      if (fs.existsSync(resolvedPath)) {
        return fs.readFileSync(resolvedPath, 'utf-8');
      }
      return null;
    } catch (error) {
      console.error('Failed to read file:', error);
      return null;
    }
  }

  // Get all policies
  getPolicies(): PolicyContent[] {
    const policiesPath = path.join(this.contentPath, 'policies');
    const policies: PolicyContent[] = [];

    const policyFiles: { id: string; title: string; filename: string }[] = [
      { id: 'privacy', title: 'Privacy Policy', filename: 'privacy.md' },
      { id: 'safeguarding', title: 'Safeguarding Policy', filename: 'safeguarding.md' },
      { id: 'accessibility-adjustments', title: 'Accessibility & Adjustments', filename: 'accessibility-adjustments.md' },
      { id: 'code-of-conduct', title: 'Code of Conduct & Anti-Harassment', filename: 'code-of-conduct.md' },
      { id: 'confidentiality-ip', title: 'Confidentiality & IP', filename: 'confidentiality-ip.md' },
      { id: 'health-safety-remote', title: 'Health & Safety (Remote Work)', filename: 'health-safety-remote.md' },
      { id: 'edi', title: 'Equality, Diversity & Inclusion', filename: 'edi.md' },
      { id: 'governance', title: 'Governance', filename: 'governance.md' },
      { id: 'trainee-agreement', title: 'Trainee Agreement', filename: 'trainee-agreement.md' },
      { id: 'terms-conditions', title: 'Terms & Conditions', filename: 'terms-conditions.md' },
    ];

    for (const policy of policyFiles) {
      const filePath = path.join(policiesPath, policy.filename);
      const content = this.readFile(filePath) || 'Policy content not available.';
      policies.push({
        id: policy.id,
        title: policy.title,
        filename: policy.filename,
        content,
      });
    }

    return policies;
  }

  // Get single policy
  getPolicy(policyId: string): PolicyContent | null {
    const policies = this.getPolicies();
    return policies.find(p => p.id === policyId) || null;
  }

  // Search policies
  searchPolicies(query: string): PolicyContent[] {
    const policies = this.getPolicies();
    const lowerQuery = query.toLowerCase();
    
    return policies.filter(policy => 
      policy.title.toLowerCase().includes(lowerQuery) ||
      policy.content.toLowerCase().includes(lowerQuery)
    );
  }

  // Check content integrity
  checkIntegrity(): {
    weeksExist: boolean[];
    policiesExist: boolean[];
    missingItems: string[];
    warnings: string[];
  } {
    const result = {
      weeksExist: [] as boolean[],
      policiesExist: [] as boolean[],
      missingItems: [] as string[],
      warnings: [] as string[],
    };

    // Check weeks
    for (let i = 1; i <= 6; i++) {
      const weekFolder = path.join(this.contentPath, 'weeks', `week-0${i}`);
      const exists = fs.existsSync(weekFolder);
      result.weeksExist.push(exists);
      
      if (!exists) {
        result.missingItems.push(`Week ${i} folder`);
      } else {
        // Check for key files
        if (!this.hasSlides(weekFolder)) {
          result.warnings.push(`Week ${i}: No slides found`);
        }
        if (!fs.existsSync(path.join(weekFolder, 'trainer-notes.md'))) {
          result.warnings.push(`Week ${i}: No trainer notes found`);
        }
      }
    }

    // Check policies
    const policyFiles = [
      'privacy.md', 'safeguarding.md', 'accessibility-adjustments.md',
      'code-of-conduct.md', 'confidentiality-ip.md', 'health-safety-remote.md',
      'edi.md', 'governance.md', 'trainee-agreement.md', 'terms-conditions.md'
    ];

    for (const policyFile of policyFiles) {
      const filePath = path.join(this.contentPath, 'policies', policyFile);
      const exists = fs.existsSync(filePath);
      result.policiesExist.push(exists);
      
      if (!exists) {
        result.missingItems.push(`Policy: ${policyFile}`);
      }
    }

    return result;
  }

  // Private helper methods
  private readWeekOverview(weekFolder: string): string {
    const overviewPath = path.join(weekFolder, 'overview.md');
    const readmePath = path.join(weekFolder, 'README.md');
    
    if (fs.existsSync(overviewPath)) {
      return fs.readFileSync(overviewPath, 'utf-8');
    }
    if (fs.existsSync(readmePath)) {
      return fs.readFileSync(readmePath, 'utf-8');
    }
    return '';
  }

  private hasSlides(weekFolder: string): boolean {
    const slidesFolder = path.join(weekFolder, 'slides');
    const pptxPath = path.join(weekFolder, 'slides.pptx');
    
    if (fs.existsSync(slidesFolder)) {
      const files = fs.readdirSync(slidesFolder);
      return files.some(f => /\.(png|jpg|jpeg|gif|webp|pptx)$/i.test(f));
    }
    
    return fs.existsSync(pptxPath);
  }

  private getWeekResourceFiles(weekFolder: string): string[] {
    const resourcesFolder = path.join(weekFolder, 'resources');
    if (!fs.existsSync(resourcesFolder)) {
      return [];
    }
    return fs.readdirSync(resourcesFolder);
  }

  private getResourceType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
      case '.pdf': return 'pdf';
      case '.pptx': case '.ppt': return 'slide';
      case '.doc': case '.docx': return 'document';
      case '.mp4': case '.webm': case '.mov': return 'video';
      case '.png': case '.jpg': case '.jpeg': case '.gif': return 'image';
      case '.xlsx': case '.xls': case '.csv': return 'worksheet';
      default: return 'other';
    }
  }
}
