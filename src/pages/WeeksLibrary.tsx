import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  CheckCircle, 
  Circle, 
  ChevronRight, 
  FileText, 
  Presentation,
  Users,
  Clock,
} from 'lucide-react';

interface Week {
  weekNumber: number;
  title: string;
  overview: string;
  hasSlides: boolean;
  hasTrainerNotes: boolean;
  hasActivities: boolean;
  resources: string[];
}

const weekColors = [
  'from-blue-500 to-blue-600',
  'from-purple-500 to-purple-600',
  'from-green-500 to-green-600',
  'from-orange-500 to-orange-600',
  'from-pink-500 to-pink-600',
  'from-teal-500 to-teal-600',
];

export default function WeeksLibrary() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWeeks();
  }, []);

  const loadWeeks = async () => {
    if (window.electronAPI) {
      try {
        const data = await window.electronAPI.content.getWeeks() as Week[];
        setWeeks(data);
      } catch (error) {
        console.error('Failed to load weeks:', error);
      }
    } else {
      // Demo data
      setWeeks([
        { weekNumber: 1, title: 'Foundation Week - Building Basics', overview: 'Building foundations for learning, communication, and sustainable work practices. Days: Welcome & Introduction, Assessment & Support, Confidence & Voice, Expectations & Boundaries.', hasSlides: true, hasTrainerNotes: true, hasActivities: true, resources: ['week-1-overview.pdf', 'foundation-skills.pdf'] },
        { weekNumber: 2, title: 'Skills Development Week', overview: 'Practical skills building and application. Days: Skills Foundation, Communication Skills, Problem-Solving & Critical Thinking, Time Management & Organization.', hasSlides: true, hasTrainerNotes: true, hasActivities: true, resources: ['skills-framework.pdf', 'practice-exercises.pdf'] },
        { weekNumber: 3, title: 'Advanced Skills Week', overview: 'Leadership, project management, and career planning. Days: Leadership & Influence, Project Management Basics, Digital Skills & Technology, Career Planning & Next Steps.', hasSlides: true, hasTrainerNotes: true, hasActivities: true, resources: ['leadership-guide.pdf', 'career-planning.pdf'] },
        { weekNumber: 4, title: 'Critical Thinking & Creativity', overview: 'Developing analytical and creative problem-solving skills. Days: Critical Thinking, Creative Problem Solving, Decision Making, Innovation Workshop.', hasSlides: true, hasTrainerNotes: true, hasActivities: true, resources: ['critical-thinking.pdf', 'creativity-guide.pdf'] },
        { weekNumber: 5, title: 'Professional Development', overview: 'Building professional skills for employment success. Days: CV Building, Job Searching, Interview Skills, Personal Branding.', hasSlides: true, hasTrainerNotes: true, hasActivities: true, resources: ['cv-templates.pdf', 'interview-guide.pdf'] },
        { weekNumber: 6, title: 'Project & Graduation', overview: 'Final project completion and programme graduation. Days: Project Planning, Project Development, Presentation Prep, Graduation & Next Steps.', hasSlides: true, hasTrainerNotes: true, hasActivities: true, resources: ['project-guide.pdf', 'graduation.pdf'] },
      ]);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-calm-500">Loading training weeks...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-calm-900">Training Programme</h1>
          <p className="text-calm-600 mt-1">Weeks 1-6: Complete training curriculum</p>
        </div>
        <div className="flex items-center gap-4 text-sm text-calm-600">
          <span className="flex items-center gap-1">
            <Clock size={16} />
            6 weeks total
          </span>
        </div>
      </div>

      {/* Week Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {weeks.map((week) => {
          const hasContent = week.hasSlides || week.hasTrainerNotes || week.hasActivities;
          
          return (
            <Link
              key={week.weekNumber}
              to={`/weeks/${week.weekNumber}`}
              className="card hover:shadow-lg transition-shadow group"
            >
              {/* Week Number Badge */}
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${weekColors[week.weekNumber - 1]} text-white flex items-center justify-center font-bold text-lg mb-4`}>
                {week.weekNumber}
              </div>

              {/* Title */}
              <h2 className="text-lg font-semibold text-calm-800 mb-2 group-hover:text-primary-600 transition-colors">
                Week {week.weekNumber}: {week.title}
              </h2>

              {/* Overview */}
              <p className="text-sm text-calm-600 mb-4 line-clamp-2">
                {week.overview || 'Content not yet added for this week.'}
              </p>

              {/* Content indicators */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`badge ${week.hasSlides ? 'badge-success' : 'bg-calm-100 text-calm-500'}`}>
                  <Presentation size={12} className="mr-1" />
                  Slides
                </span>
                <span className={`badge ${week.hasTrainerNotes ? 'badge-success' : 'bg-calm-100 text-calm-500'}`}>
                  <FileText size={12} className="mr-1" />
                  Notes
                </span>
                <span className={`badge ${week.hasActivities ? 'badge-success' : 'bg-calm-100 text-calm-500'}`}>
                  <Users size={12} className="mr-1" />
                  Activities
                </span>
              </div>

              {/* Resources count */}
              {week.resources.length > 0 && (
                <p className="text-xs text-calm-500">
                  {week.resources.length} resource{week.resources.length !== 1 ? 's' : ''} attached
                </p>
              )}

              {/* Arrow indicator */}
              <div className="absolute bottom-4 right-4 text-calm-400 group-hover:text-primary-500 transition-colors">
                <ChevronRight size={20} />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Progress Overview */}
      <div className="card">
        <h3 className="text-lg font-semibold text-calm-800 mb-4">Programme Overview</h3>
        
        <div className="space-y-3">
          {weeks.map((week) => {
            const hasContent = week.hasSlides || week.hasTrainerNotes || week.hasActivities;
            
            return (
              <div key={week.weekNumber} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  hasContent ? 'bg-success-100 text-success-600' : 'bg-calm-100 text-calm-400'
                }`}>
                  {hasContent ? <CheckCircle size={18} /> : <Circle size={18} />}
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${hasContent ? 'text-calm-800' : 'text-calm-500'}`}>
                    Week {week.weekNumber}: {week.title}
                  </p>
                </div>
                <Link 
                  to={`/weeks/${week.weekNumber}`}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  View →
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tips for trainers */}
      <div className="card bg-primary-50 border-primary-200">
        <h3 className="font-semibold text-primary-800 mb-2">💡 Trainer Tips</h3>
        <ul className="text-sm text-primary-700 space-y-1">
          <li>• Click on any week to view the full content, slides, and activities</li>
          <li>• Use the "Open Slides" button during sessions to present directly</li>
          <li>• Track trainee progress through the outcomes checklist in each week</li>
          <li>• Add your own resources to the /content/weeks/ folder</li>
        </ul>
      </div>
    </div>
  );
}
