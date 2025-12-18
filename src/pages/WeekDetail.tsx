import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Presentation,
  FileText,
  Users,
  Play,
  Download,
  ChevronDown,
  ChevronUp,
  Clock,
  Target,
  Columns,
  Calendar,
  CheckCircle,
  BookOpen,
  Video,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface DayContent {
  dayNumber: number;
  title: string;
  duration: string;
  focus: string;
  slides: string[];
  trainerNotes: string;
  activities: Activity[];
  outcomes: Outcome[];
  resources: Resource[];
}

interface WeekContent {
  weekNumber: number;
  title: string;
  overview: string;
  days: DayContent[];
  timeGuide: string;
}

interface Activity {
  id: string;
  title: string;
  duration: string;
  type: 'individual' | 'group' | 'discussion' | 'practical' | 'break';
  description: string;
  instructions: string;
}

interface Outcome {
  id: string;
  description: string;
}

interface Resource {
  id: string;
  name: string;
  type: string;
  path: string;
}

const weekColors = [
  'from-blue-500 to-blue-600',
  'from-purple-500 to-purple-600',
  'from-green-500 to-green-600',
  'from-orange-500 to-orange-600',
  'from-pink-500 to-pink-600',
  'from-teal-500 to-teal-600',
];

const dayColors = [
  'from-sky-400 to-sky-500',
  'from-violet-400 to-violet-500',
  'from-emerald-400 to-emerald-500',
  'from-amber-400 to-amber-500',
];

const activityTypeStyles: Record<string, { bg: string; text: string; icon: string }> = {
  individual: { bg: 'bg-blue-100', text: 'text-blue-700', icon: '👤' },
  group: { bg: 'bg-purple-100', text: 'text-purple-700', icon: '👥' },
  discussion: { bg: 'bg-green-100', text: 'text-green-700', icon: '💬' },
  practical: { bg: 'bg-orange-100', text: 'text-orange-700', icon: '🛠️' },
  break: { bg: 'bg-calm-100', text: 'text-calm-600', icon: '☕' },
};

export default function WeekDetail() {
  const { weekNumber } = useParams<{ weekNumber: string }>();
  const [content, setContent] = useState<WeekContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());
  const [completedOutcomes, setCompletedOutcomes] = useState<Set<string>>(new Set());
  const [activeSection, setActiveSection] = useState<'overview' | 'activities' | 'notes' | 'resources'>('overview');

  useEffect(() => {
    loadWeekContent();
  }, [weekNumber]);

  const loadWeekContent = async () => {
    const weekNum = parseInt(weekNumber || '1');
    
    // Generate demo content for the week with 4 days
    const weekData = generateWeekContent(weekNum);
    setContent(weekData);
    setLoading(false);
  };

  const toggleActivity = (id: string) => {
    const newExpanded = new Set(expandedActivities);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedActivities(newExpanded);
  };

  const toggleOutcome = async (id: string) => {
    const newCompleted = new Set(completedOutcomes);
    if (newCompleted.has(id)) {
      newCompleted.delete(id);
    } else {
      newCompleted.add(id);
    }
    setCompletedOutcomes(newCompleted);
  };

  const openSlides = (day: number) => {
    // Navigate to presentation view for this specific day
    window.location.href = `/present?week=${weekNumber}&day=${day}&role=trainer`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-calm-500">Loading week content...</div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="text-center py-12">
        <p className="text-calm-600">Week content not found.</p>
        <Link to="/weeks" className="text-primary-600 hover:underline mt-2 inline-block">
          ← Back to Weeks
        </Link>
      </div>
    );
  }

  const weekNum = parseInt(weekNumber || '1');
  const currentDay = content.days[selectedDay - 1];
  const dayOutcomes = currentDay?.outcomes || [];
  const completedCount = dayOutcomes.filter(o => completedOutcomes.has(o.id)).length;
  const dayTotalOutcomes = dayOutcomes.length;

  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <Link to="/weeks" className="inline-flex items-center text-calm-500 hover:text-calm-700 transition-colors">
        <ArrowLeft size={18} className="mr-1" />
        Back to Weeks
      </Link>

      {/* Week Header */}
      <div className="card bg-gradient-to-br from-white to-calm-50/50">
        <div className="flex items-start gap-5">
          <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${weekColors[weekNum - 1]} text-white flex items-center justify-center font-bold text-3xl shrink-0 shadow-lg`}>
            {weekNum}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-calm-900 mb-1">
              Week {weekNum}: {content.title}
            </h1>
            <p className="text-calm-500 mb-3">{content.overview}</p>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-calm-500 bg-calm-100 px-3 py-1.5 rounded-lg">
                <Calendar size={14} />
                4 Days
              </span>
              <span className="flex items-center gap-1.5 text-calm-500 bg-calm-100 px-3 py-1.5 rounded-lg">
                <Clock size={14} />
                {content.timeGuide}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Day Selector Tabs */}
      <div className="flex gap-3">
        {content.days.map((day, index) => {
          const dayNum = index + 1;
          const isSelected = selectedDay === dayNum;
          const dayCompletedOutcomes = day.outcomes.filter(o => completedOutcomes.has(o.id)).length;
          const dayTotal = day.outcomes.length;
          const isComplete = dayCompletedOutcomes === dayTotal && dayTotal > 0;
          
          return (
            <button
              key={dayNum}
              onClick={() => setSelectedDay(dayNum)}
              className={`flex-1 p-4 rounded-2xl border-2 transition-all duration-200 ${
                isSelected
                  ? 'border-primary-500 bg-gradient-to-br from-primary-50 to-accent-50/30 shadow-lg'
                  : 'border-calm-200 bg-white hover:border-calm-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${dayColors[index]} text-white flex items-center justify-center font-bold text-lg shadow-md`}>
                  {dayNum}
                </div>
                {isComplete && (
                  <CheckCircle size={20} className="text-success-500" />
                )}
              </div>
              <h3 className={`font-semibold text-left ${isSelected ? 'text-primary-700' : 'text-calm-800'}`}>
                Day {dayNum}
              </h3>
              <p className={`text-sm text-left truncate ${isSelected ? 'text-primary-600' : 'text-calm-500'}`}>
                {day.title}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-calm-400">
                <Clock size={12} />
                {day.duration}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Day Content */}
      {currentDay && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Day Header Card */}
            <div className="card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${dayColors[selectedDay - 1]} text-white flex items-center justify-center font-bold text-xl shadow-md`}>
                      {selectedDay}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-calm-900">Day {selectedDay}: {currentDay.title}</h2>
                      <p className="text-calm-500 text-sm">{currentDay.focus}</p>
                    </div>
                  </div>
                </div>
                <Link
                  to={`/present?week=${weekNum}&day=${selectedDay}&role=trainer`}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Columns size={18} />
                  Present Live
                </Link>
              </div>

              {/* Section Tabs */}
              <div className="flex gap-1 border-b border-calm-200 -mx-6 px-6">
                {[
                  { id: 'overview' as const, label: 'Overview', icon: BookOpen },
                  { id: 'activities' as const, label: 'Activities', icon: Users },
                  { id: 'notes' as const, label: 'Trainer Notes', icon: FileText },
                  { id: 'resources' as const, label: 'Resources', icon: Download },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSection(tab.id)}
                    className={`px-4 py-3 flex items-center gap-2 border-b-2 transition-colors ${
                      activeSection === tab.id
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-calm-500 hover:text-calm-700'
                    }`}
                  >
                    <tab.icon size={16} />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            {activeSection === 'overview' && (
              <div className="card">
                <h3 className="font-semibold text-calm-800 mb-4 flex items-center gap-2">
                  <Presentation size={18} className="text-primary-500" />
                  Session Slides
                </h3>
                <div className="grid grid-cols-4 gap-3 mb-6">
                  {currentDay.slides.slice(0, 8).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-video bg-calm-100 rounded-xl flex items-center justify-center text-calm-400 hover:bg-calm-200 cursor-pointer transition-colors border border-calm-200"
                      onClick={() => openSlides(selectedDay)}
                    >
                      <div className="text-center">
                        <Presentation size={20} className="mx-auto mb-1 opacity-50" />
                        <span className="text-xs">Slide {i + 1}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => openSlides(selectedDay)}
                  className="btn btn-secondary w-full"
                >
                  <Play size={18} />
                  Open All Slides
                </button>
              </div>
            )}

            {activeSection === 'activities' && (
              <div className="space-y-4">
                <div className="card bg-gradient-to-r from-primary-50 to-accent-50/30 border-primary-200">
                  <div className="flex items-center gap-3">
                    <Clock size={20} className="text-primary-500" />
                    <div>
                      <p className="font-semibold text-primary-800">Today's Schedule</p>
                      <p className="text-sm text-primary-600">{currentDay.activities.length} activities • {currentDay.duration} total</p>
                    </div>
                  </div>
                </div>

                {currentDay.activities.map((activity, index) => {
                  const isExpanded = expandedActivities.has(activity.id);
                  const style = activityTypeStyles[activity.type] || activityTypeStyles.practical;
                  
                  return (
                    <div
                      key={activity.id}
                      className="card hover:shadow-md transition-shadow"
                    >
                      <button
                        onClick={() => toggleActivity(activity.id)}
                        className="w-full text-left"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-calm-100 text-calm-600 flex items-center justify-center font-bold shrink-0">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-calm-900">{activity.title}</h4>
                              <span className="text-lg">{style.icon}</span>
                            </div>
                            <p className="text-sm text-calm-500 mb-2">{activity.description}</p>
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1 text-xs text-calm-400">
                                <Clock size={12} />
                                {activity.duration}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${style.bg} ${style.text} capitalize`}>
                                {activity.type}
                              </span>
                            </div>
                          </div>
                          <div className="text-calm-400">
                            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                          </div>
                        </div>
                      </button>
                      
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-calm-100">
                          <h5 className="text-sm font-medium text-calm-700 mb-2">Instructions for Trainer:</h5>
                          <p className="text-sm text-calm-600 bg-calm-50 p-3 rounded-lg italic">
                            {activity.instructions}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {activeSection === 'notes' && (
              <div className="card">
                <div className="prose-calm max-w-none">
                  <ReactMarkdown>{currentDay.trainerNotes}</ReactMarkdown>
                </div>
              </div>
            )}

            {activeSection === 'resources' && (
              <div className="card">
                <h3 className="font-semibold text-calm-800 mb-4">Day {selectedDay} Resources</h3>
                <div className="space-y-3">
                  {currentDay.resources.map((resource) => (
                    <div
                      key={resource.id}
                      className="flex items-center justify-between p-3 bg-calm-50 rounded-xl hover:bg-calm-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white border border-calm-200 flex items-center justify-center">
                          <FileText size={18} className="text-calm-500" />
                        </div>
                        <div>
                          <p className="font-medium text-calm-800">{resource.name}</p>
                          <p className="text-xs text-calm-500 uppercase">{resource.type}</p>
                        </div>
                      </div>
                      <button className="btn btn-sm btn-secondary">
                        <Download size={14} />
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Learning Outcomes */}
          <div className="space-y-6">
            {/* Progress Card */}
            <div className="card bg-gradient-to-br from-success-50 to-white border-success-200">
              <h3 className="font-semibold text-calm-800 mb-3 flex items-center gap-2">
                <Target size={18} className="text-success-500" />
                Day {selectedDay} Progress
              </h3>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-3 bg-calm-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-success-400 to-success-500 transition-all duration-500"
                    style={{ width: `${dayTotalOutcomes > 0 ? (completedCount / dayTotalOutcomes) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-success-600">
                  {completedCount}/{dayTotalOutcomes}
                </span>
              </div>
              <p className="text-xs text-calm-500">
                {completedCount === dayTotalOutcomes && dayTotalOutcomes > 0
                  ? '🎉 All outcomes completed!'
                  : `${dayTotalOutcomes - completedCount} outcomes remaining`}
              </p>
            </div>

            {/* Learning Outcomes */}
            <div className="card">
              <h3 className="font-semibold text-calm-800 mb-4 flex items-center gap-2">
                <CheckCircle size={18} className="text-primary-500" />
                Learning Outcomes
              </h3>
              <div className="space-y-3">
                {dayOutcomes.map((outcome) => {
                  const isCompleted = completedOutcomes.has(outcome.id);
                  return (
                    <button
                      key={outcome.id}
                      onClick={() => toggleOutcome(outcome.id)}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                        isCompleted
                          ? 'bg-success-50 border-success-300 text-success-800'
                          : 'bg-white border-calm-200 text-calm-700 hover:border-calm-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isCompleted ? 'bg-success-500 text-white' : 'border-2 border-calm-300'
                        }`}>
                          {isCompleted && <CheckCircle size={12} />}
                        </div>
                        <span className="text-sm">{outcome.description}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card bg-calm-50">
              <h3 className="font-semibold text-calm-800 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <Link
                  to={`/present?week=${weekNum}&day=${selectedDay}&role=trainer`}
                  className="btn btn-primary w-full justify-start"
                >
                  <Video size={16} />
                  Start Live Session
                </Link>
                <button className="btn btn-secondary w-full justify-start">
                  <Download size={16} />
                  Download All Resources
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to generate week content with 4 days
function generateWeekContent(weekNum: number): WeekContent {
  const weekTitles = [
    'Onboarding & Assessment',
    'Digital Skills Foundation',
    'Communication & Collaboration',
    'Problem Solving & Creativity',
    'Professional Development',
    'Project & Graduation',
  ];

  const weekOverviews = [
    'Welcome to the programme! This week covers induction, assessments, and getting started.',
    'Building essential digital literacy skills for the modern workplace.',
    'Effective communication and teamwork in remote environments.',
    'Creative thinking and problem-solving strategies.',
    'Career planning, CV writing, and interview preparation.',
    'Final project presentation and programme completion.',
  ];

  const dayData: Record<number, { titles: string[]; focuses: string[] }> = {
    1: {
      titles: ['Welcome & Introduction', 'Initial Assessments', 'Programme Overview', 'Tools & Setup'],
      focuses: ['Getting to know each other and the programme', 'Understanding baseline skills', 'Understanding the 6-week journey', 'Setting up required tools and accounts'],
    },
    2: {
      titles: ['Computer Basics', 'Internet & Email', 'File Management', 'Online Safety'],
      focuses: ['Understanding hardware and software', 'Navigating the web and email communication', 'Organizing digital files effectively', 'Staying safe online'],
    },
    3: {
      titles: ['Written Communication', 'Video Calls & Meetings', 'Team Collaboration', 'Feedback & Reflection'],
      focuses: ['Professional writing skills', 'Effective video communication', 'Working together remotely', 'Giving and receiving feedback'],
    },
    4: {
      titles: ['Critical Thinking', 'Creative Problem Solving', 'Decision Making', 'Innovation Workshop'],
      focuses: ['Analyzing information effectively', 'Generating creative solutions', 'Making informed decisions', 'Putting skills into practice'],
    },
    5: {
      titles: ['CV Building', 'Job Searching', 'Interview Skills', 'Personal Branding'],
      focuses: ['Creating an effective CV', 'Finding opportunities', 'Preparing for interviews', 'Building your professional presence'],
    },
    6: {
      titles: ['Project Planning', 'Project Development', 'Presentation Prep', 'Graduation & Next Steps'],
      focuses: ['Planning your final project', 'Building and refining', 'Preparing your presentation', 'Celebrating and looking forward'],
    },
  };

  const currentWeekData = dayData[weekNum] || dayData[1];

  const days: DayContent[] = [1, 2, 3, 4].map((dayNum) => ({
    dayNumber: dayNum,
    title: currentWeekData.titles[dayNum - 1],
    duration: '2 hours',
    focus: currentWeekData.focuses[dayNum - 1],
    slides: Array.from({ length: 8 }, (_, i) => `/slides/week${weekNum}/day${dayNum}/slide${i + 1}.png`),
    trainerNotes: generateTrainerNotes(weekNum, dayNum, currentWeekData.titles[dayNum - 1]),
    activities: generateActivities(weekNum, dayNum),
    outcomes: generateOutcomes(weekNum, dayNum),
    resources: generateResources(weekNum, dayNum, currentWeekData.titles[dayNum - 1]),
  }));

  return {
    weekNumber: weekNum,
    title: weekTitles[weekNum - 1] || `Week ${weekNum}`,
    overview: weekOverviews[weekNum - 1] || '',
    days,
    timeGuide: '8 hours total (4 × 2-hour sessions)',
  };
}

function generateTrainerNotes(week: number, day: number, title: string): string {
  return `# Day ${day}: ${title}

## Session Overview
This is day ${day} of week ${week}. Today's focus is on ${title.toLowerCase()}.

## Before the Session
- Review the slides and activities
- Ensure all resources are ready
- Test any technology you'll be using
- Prepare the virtual classroom

## Key Points to Cover
- Welcome and recap from previous day
- Introduce today's learning objectives
- Guide through main activities
- Check understanding throughout

## Tips for This Session
- Start with a brief energizer
- Use breakout rooms for group work
- Allow time for questions
- End with a clear summary

## Common Challenges
- Technical difficulties: Have backup plans ready
- Quiet participants: Use chat and direct questions
- Time management: Keep an eye on the clock

## Notes
_Add your own notes here during or after the session._`;
}

function generateActivities(week: number, day: number): Activity[] {
  return [
    {
      id: `w${week}d${day}-act1`,
      title: 'Welcome & Energizer',
      duration: '10 mins',
      type: 'group',
      description: 'Quick warm-up activity to get everyone engaged',
      instructions: 'Start with a quick round of how everyone is feeling today. Use a simple check-in question.',
    },
    {
      id: `w${week}d${day}-act2`,
      title: 'Main Learning Activity',
      duration: '40 mins',
      type: 'practical',
      description: 'Hands-on practice with today\'s key concepts',
      instructions: 'Guide trainees through the practical exercise. Demonstrate first, then let them try. Offer support as needed.',
    },
    {
      id: `w${week}d${day}-act3`,
      title: 'Break',
      duration: '10 mins',
      type: 'break',
      description: 'Short break to refresh',
      instructions: 'Encourage everyone to step away from screens, stretch, get a drink.',
    },
    {
      id: `w${week}d${day}-act4`,
      title: 'Group Discussion',
      duration: '25 mins',
      type: 'discussion',
      description: 'Reflect on learning and share experiences',
      instructions: 'Facilitate discussion using open questions. Ensure everyone has a chance to contribute.',
    },
    {
      id: `w${week}d${day}-act5`,
      title: 'Practice Exercise',
      duration: '25 mins',
      type: 'individual',
      description: 'Individual practice to reinforce learning',
      instructions: 'Give clear instructions. Be available for questions but encourage independent work.',
    },
    {
      id: `w${week}d${day}-act6`,
      title: 'Wrap-up & Preview',
      duration: '10 mins',
      type: 'group',
      description: 'Summarize key points and preview next session',
      instructions: 'Recap the main takeaways. Answer any final questions. Preview what\'s coming next.',
    },
  ];
}

function generateOutcomes(week: number, day: number): Outcome[] {
  return [
    { id: `w${week}d${day}-out1`, description: 'Trainee understands the day\'s key concepts' },
    { id: `w${week}d${day}-out2`, description: 'Practical skills demonstrated successfully' },
    { id: `w${week}d${day}-out3`, description: 'Participated actively in group activities' },
    { id: `w${week}d${day}-out4`, description: 'Completed individual practice exercise' },
    { id: `w${week}d${day}-out5`, description: 'Questions addressed and understanding confirmed' },
  ];
}

function generateResources(week: number, day: number, title: string): Resource[] {
  return [
    { id: `w${week}d${day}-res1`, name: `Day ${day} Slides`, type: 'pptx', path: `/resources/week${week}/day${day}/slides.pptx` },
    { id: `w${week}d${day}-res2`, name: `${title} Handout`, type: 'pdf', path: `/resources/week${week}/day${day}/handout.pdf` },
    { id: `w${week}d${day}-res3`, name: 'Activity Worksheet', type: 'pdf', path: `/resources/week${week}/day${day}/worksheet.pdf` },
  ];
}
