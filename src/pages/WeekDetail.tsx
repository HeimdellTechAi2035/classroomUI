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
  Edit3,
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
  const [actualSlides, setActualSlides] = useState<string[]>([]);
  const [slideContents, setSlideContents] = useState<string[]>([]);

  useEffect(() => {
    // Clear current slides when changing days
    setActualSlides([]);
    setSlideContents([]);
    loadWeekContent();
  }, [weekNumber, selectedDay]);

  const loadWeekContent = async () => {
    const weekNum = parseInt(weekNumber || '1');
    console.log('Loading week content for week:', weekNum, 'day:', selectedDay);
    
    // Try to load slides for any week that has content
    if (weekNum <= 6) { // Support weeks 1-6 which have slide content
      console.log(`Attempting to load slides for week ${weekNum}, day ${selectedDay}...`);
      
      if (window.electronAPI?.content?.getWeekSlides) {
        try {
          console.log('ElectronAPI available, attempting to load slides...');
          const slides = await window.electronAPI.content.getWeekSlides(weekNum, selectedDay) || [];
          console.log(`Loaded ${slides.length} slides for week ${weekNum} day ${selectedDay}:`, slides);
          
          if (slides.length > 0) {
            setActualSlides(slides);
            
            // Load slide contents
            const contents: string[] = [];
            for (const slidePath of slides) {
              if (slidePath.endsWith('.md')) {
                const content = await window.electronAPI.content.getSlideContent(slidePath) || '';
                contents.push(content);
              } else {
                contents.push(slidePath);
              }
            }
            setSlideContents(contents);
            
            const weekData = generateWeekContent(weekNum, selectedDay, slides);
            setContent(weekData);
            setLoading(false);
            return;
          }
        } catch (error) {
          console.error('Error loading slides via electron API:', error);
        }
      }
      
      // Fallback: use hardcoded slide content only for week 1
    if (weekNum === 1) {
      console.log(`Using fallback slide content for week 1, day ${selectedDay}`);
      const fallbackSlides = [
        'slide-1.md', 'slide-2.md', 'slide-3.md', 'slide-4.md',
        'slide-5.md', 'slide-6.md', 'slide-7.md', 'slide-8.md'
      ];
      const fallbackContents = selectedDay === 1 ? [
        '# Slide 1: Welcome & Energiser\\n**Time: 10 minutes**\\n\\n## Purpose\\nReduce anxiety, establish psychological safety, and create belonging',
        '# Slide 2: Main Learning Activity\\n**Time: 40 minutes**\\n\\n## What is RemoteAbility?\\n- A supportive, non-competitive training programme',
        '# Slide 3: Break Time\\n**Time: 10 minutes**\\n\\n## Break Instructions\\n- Stretch your body\\n- Hydrate with water',
        '# Slide 4: Group Discussion\\n**Time: 25 minutes**\\n\\n## Discussion Prompts\\nChoose 1-2 questions that feel right for the group',
        '# Slide 5: Practice Exercise\\n**Time: 25 minutes**\\n\\n## Private Reflection Exercise\\n**Important: This is NOT assessed or collected**',
        '# Slide 6: Wrap-Up & Preview\\n**Time: 10 minutes**\\n\\n## Key Messages\\n✅ **Attending today is an achievement**',
        '# Slide 7: Trainer Audit & Evidence\\n**For Trainer Reference Only**\\n\\n## Required Documentation ✓',
        '# Slide 8: Resources & Accessibility\\n\\n## Session Resources\\n- Attendance register\\n- Programme overview materials'
      ] : selectedDay === 2 ? [
        '# Day 2 Slide 1: Welcome & Assessment Overview\\n**Time: 10 minutes**\\n\\n## Purpose\\nWelcome back and introduce assessment concepts',
        '# Day 2 Slide 2: Understanding Assessments\\n**Time: 40 minutes**\\n\\n## Key Concepts\\n- Assessment vs Testing\\n- Understanding vs Judging',
        '# Day 2 Slide 3: Break Time\\n**Time: 10 minutes**\\n\\n## Break Instructions\\n- Reflect on assessment concepts',
        '# Day 2 Slide 4: Group Discussion\\n**Time: 25 minutes**\\n\\n## Discussion Topics\\n- Personal experiences with assessment',
        '# Day 2 Slide 5: Support Mapping Practice\\n**Time: 25 minutes**\\n\\n## Practice Scenarios\\n- Real-world examples',
        '# Day 2 Slide 6: Wrap-Up & Next Steps\\n**Time: 10 minutes**\\n\\n## Key Takeaways\\n- Assessment is understanding, not testing',
        '# Day 2 Slide 7: Trainer Audit\\n**For Trainer Reference**\\n\\n## Session Completion\\n- Content delivered',
        '# Day 2 Slide 8: Resources & References\\n\\n## Materials\\n- Assessment guidelines\\n- Support templates'
      ] : selectedDay === 3 ? [
        '# Day 3 Slide 1: Welcome & Energiser\\n**Time: 10 minutes**\\n\\n## Purpose\\nGentle activation and confidence normalisation',
        '# Day 3 Slide 2: Understanding Confidence\\n**Time: 40 minutes**\\n\\n## Key Concepts\\n- Confidence is rebuilding, not born\\n- Communication styles diversity',
        '# Day 3 Slide 3: Break Time\\n**Time: 10 minutes**\\n\\n## Break Instructions\\n- Step away from screens\\n- Grounding exercises',
        '# Day 3 Slide 4: Group Discussion\\n**Time: 25 minutes**\\n\\n## Finding Your Voice\\n- Confidence challenges\\n- Communication comfort zones',
        '# Day 3 Slide 5: Practice Exercise\\n**Time: 25 minutes**\\n\\n## Safe Expression\\n- Practice work-related communication\\n- Multiple expression methods',
        '# Day 3 Slide 6: Wrap-Up & Preview\\n**Time: 10 minutes**\\n\\n## Key Messages\\n- Voice matters and can be developed\\n- Preview Day 4 expectations',
        '# Day 3 Slide 7: Trainer Audit\\n**For Trainer Reference**\\n\\n## Session Quality Check\\n- Communication focus assessment',
        '# Day 3 Slide 8: Resources & References\\n\\n## Materials\\n- Communication practice templates\\n- Confidence building tools'
      ] : [
        '# Day 4 Slide 1: Welcome & Week Reflection\\n**Time: 10 minutes**\\n\\n## Purpose\\nWeek reflection and sustainable work introduction',
        '# Day 4 Slide 2: Expectations & Boundaries\\n**Time: 40 minutes**\\n\\n## Key Concepts\\n- Healthy vs unhealthy expectations\\n- Professional boundary-setting\\n- Sustainable pacing skills',
        '# Day 4 Slide 3: Break Time\\n**Time: 10 minutes**\\n\\n## Break Instructions\\n- Practice sustainable break-taking\\n- Movement and eye rest',
        '# Day 4 Slide 4: Group Discussion\\n**Time: 25 minutes**\\n\\n## Burnout & Balance\\n- What overwhelms you at work?\\n- Warning signs and boundaries',
        '# Day 4 Slide 5: Personal Pacing Plan\\n**Time: 25 minutes**\\n\\n## Private Exercise\\n- Create individual pacing strategy\\n- Energy peaks and break needs',
        '# Day 4 Slide 6: Week 1 Wrap-Up\\n**Time: 10 minutes**\\n\\n## Key Messages\\n- Sustainable pacing is professional skill\\n- Week 1 completion celebration',
        '# Day 4 Slide 7: Trainer Audit\\n**For Trainer Reference**\\n\\n## Week 1 Assessment\\n- Sustainability focus evaluation',
        '# Day 4 Slide 8: Resources & Week 2 Preview\\n\\n## Materials\\n- Pacing plan templates\\n- Week 2 preparation guides'
      ];
      
      setActualSlides(fallbackSlides);
      setSlideContents(fallbackContents);
      
      const weekData = generateWeekContent(weekNum, selectedDay, fallbackSlides);
      setContent(weekData);
    } else if (weekNum === 2) {
      // Week 2 fallback content
      console.log(`Using fallback slide content for week 2, day ${selectedDay}`);
      const fallbackSlides = [
        'slide-1.md', 'slide-2.md', 'slide-3.md', 'slide-4.md',
        'slide-5.md', 'slide-6.md', 'slide-7.md', 'slide-8.md'
      ];
      const fallbackContents = selectedDay === 1 ? [
        '# Week 2 Day 1 Slide 1: Welcome & Skills Foundation\\n**Time: 10 minutes**\\n\\n## Purpose\\nWelcome to Week 2 and introduce practical skills focus',
        '# Week 2 Day 1 Slide 2: Practical Skills Foundation\\n**Time: 40 minutes**\\n\\n## Core Content\\n- Skills vs knowledge\\n- Foundation skill areas',
        '# Week 2 Day 1 Slide 3: Break\\n**Time: 10 minutes**\\n\\n## Break Instructions\\nEncourage reflection on skill development',
        '# Week 2 Day 1 Slide 4: Group Discussion – Skill Priorities\\n**Time: 25 minutes**\\n\\n## Discussion Prompts\\n- Which skills feel most relevant?',
        '# Week 2 Day 1 Slide 5: Practice Exercise – Skills Assessment\\n**Time: 25 minutes**\\n\\n## Exercise Type\\nPrivate reflection on skills',
        '# Week 2 Day 1 Slide 6: Wrap-Up & Day 2 Preview\\n**Time: 10 minutes**\\n\\n## Key Reinforcement\\nSkills develop through practice',
        '# Week 2 Day 1 Slide 7: Trainer Audit & Evidence Notes\\n**For Trainer Reference Only**\\n\\n## Session Documentation',
        '# Week 2 Day 1 Slide 8: Resources & References\\n\\n## Session Materials\\n- Skills assessment tools'
      ] : selectedDay === 2 ? [
        '# Week 2 Day 2 Slide 1: Welcome & Communication Focus\\n**Time: 10 minutes**\\n\\n## Purpose\\nIntroduce communication skills',
        '# Week 2 Day 2 Slide 2: Communication Skills Framework\\n**Time: 40 minutes**\\n\\n## Core Content\\n- Professional communication components',
        '# Week 2 Day 2 Slide 3: Break\\n**Time: 10 minutes**\\n\\n## Break Instructions\\nProcess communication concepts',
        '# Week 2 Day 2 Slide 4: Group Discussion – Communication Challenges\\n**Time: 25 minutes**\\n\\n## Discussion Prompts',
        '# Week 2 Day 2 Slide 5: Practice Exercise – Communication Scenarios\\n**Time: 25 minutes**\\n\\n## Exercise Type\\nStructured practice',
        '# Week 2 Day 2 Slide 6: Wrap-Up & Day 3 Preview\\n**Time: 10 minutes**\\n\\n## Key Reinforcement',
        '# Week 2 Day 2 Slide 7: Trainer Audit & Evidence Notes\\n**For Trainer Reference**',
        '# Week 2 Day 2 Slide 8: Resources & References\\n\\n## Session Materials\\n- Communication skill resources'
      ] : selectedDay === 3 ? [
        '# Week 2 Day 3 Slide 1: Welcome & Problem-Solving Focus\\n**Time: 10 minutes**\\n\\n## Purpose\\nIntroduce structured problem-solving',
        '# Week 2 Day 3 Slide 2: Problem-Solving Framework\\n**Time: 40 minutes**\\n\\n## Core Content\\n- Structured problem-solving process',
        '# Week 2 Day 3 Slide 3: Break\\n**Time: 10 minutes**\\n\\n## Break Instructions\\nAllow problem-solving concepts to process',
        '# Week 2 Day 3 Slide 4: Group Discussion\\n**Time: 25 minutes**\\n\\n## Discussion Prompts',
        '# Week 2 Day 3 Slide 5: Practice Exercise\\n**Time: 25 minutes**\\n\\n## Exercise Type\\nStructured practice',
        '# Week 2 Day 3 Slide 6: Wrap-Up & Day 4 Preview\\n**Time: 10 minutes**\\n\\n## Key Reinforcement',
        '# Week 2 Day 3 Slide 7: Trainer Audit & Evidence Notes\\n**For Trainer Reference**',
        '# Week 2 Day 3 Slide 8: Resources & References\\n\\n## Session Materials'
      ] : [
        '# Week 2 Day 4 Slide 1: Welcome & Time Management Focus\\n**Time: 10 minutes**\\n\\n## Purpose\\nIntroduce time management skills',
        '# Week 2 Day 4 Slide 2: Time Management & Organization\\n**Time: 40 minutes**\\n\\n## Core Content\\n- Time management techniques',
        '# Week 2 Day 4 Slide 3: Break\\n**Time: 10 minutes**\\n\\n## Break Instructions\\nProcess time management concepts',
        '# Week 2 Day 4 Slide 4: Group Discussion\\n**Time: 25 minutes**\\n\\n## Discussion Prompts',
        '# Week 2 Day 4 Slide 5: Practice Exercise\\n**Time: 25 minutes**\\n\\n## Exercise Type\\nPersonal planning',
        '# Week 2 Day 4 Slide 6: Wrap-Up & Week 3 Preview\\n**Time: 10 minutes**\\n\\n## Key Reinforcement',
        '# Week 2 Day 4 Slide 7: Trainer Audit & Evidence Notes\\n**For Trainer Reference**',
        '# Week 2 Day 4 Slide 8: Resources & References\\n\\n## Session Materials'
      ];
      
      setActualSlides(fallbackSlides);
      setSlideContents(fallbackContents);
      
      const weekData = generateWeekContent(weekNum, selectedDay, fallbackSlides);
      setContent(weekData);
    } else if (weekNum === 3) {
      // Week 3 fallback content
      console.log(`Using fallback slide content for week 3, day ${selectedDay}`);
      const fallbackSlides = [
        'slide-1.md', 'slide-2.md', 'slide-3.md', 'slide-4.md',
        'slide-5.md', 'slide-6.md', 'slide-7.md', 'slide-8.md'
      ];
      const fallbackContents = selectedDay === 1 ? [
        '# Week 3 Day 1 Slide 1: Welcome & Leadership Focus\\n**Time: 10 minutes**\\n\\n## Purpose\\nIntroduce leadership principles',
        '# Week 3 Day 1 Slide 2: Leadership & Influence\\n**Time: 40 minutes**\\n\\n## Core Content\\n- Leadership principles',
        '# Week 3 Day 1 Slide 3: Break\\n**Time: 10 minutes**\\n\\n## Break Instructions\\nProcess leadership concepts',
        '# Week 3 Day 1 Slide 4: Group Discussion\\n**Time: 25 minutes**\\n\\n## Discussion Prompts',
        '# Week 3 Day 1 Slide 5: Practice Exercise\\n**Time: 25 minutes**\\n\\n## Exercise Type\\nLeadership exploration',
        '# Week 3 Day 1 Slide 6: Wrap-Up & Day 2 Preview\\n**Time: 10 minutes**\\n\\n## Key Reinforcement',
        '# Week 3 Day 1 Slide 7: Trainer Audit & Evidence Notes\\n**For Trainer Reference**',
        '# Week 3 Day 1 Slide 8: Resources & References\\n\\n## Session Materials'
      ] : selectedDay === 2 ? [
        '# Week 3 Day 2 Slide 1: Welcome & Project Management\\n**Time: 10 minutes**\\n\\n## Purpose\\nIntroduce project management',
        '# Week 3 Day 2 Slide 2: Project Management Basics\\n**Time: 40 minutes**\\n\\n## Core Content\\n- Project management fundamentals',
        '# Week 3 Day 2 Slide 3: Break\\n**Time: 10 minutes**\\n\\n## Break Instructions\\nProcess project concepts',
        '# Week 3 Day 2 Slide 4: Group Discussion\\n**Time: 25 minutes**\\n\\n## Discussion Prompts',
        '# Week 3 Day 2 Slide 5: Practice Exercise\\n**Time: 25 minutes**\\n\\n## Exercise Type\\nProject planning',
        '# Week 3 Day 2 Slide 6: Wrap-Up & Day 3 Preview\\n**Time: 10 minutes**\\n\\n## Key Reinforcement',
        '# Week 3 Day 2 Slide 7: Trainer Audit & Evidence Notes\\n**For Trainer Reference**',
        '# Week 3 Day 2 Slide 8: Resources & References\\n\\n## Session Materials'
      ] : selectedDay === 3 ? [
        '# Week 3 Day 3 Slide 1: Welcome & Digital Skills\\n**Time: 10 minutes**\\n\\n## Purpose\\nIntroduce digital skills',
        '# Week 3 Day 3 Slide 2: Digital Skills & Technology\\n**Time: 40 minutes**\\n\\n## Core Content\\n- Digital skills and tools',
        '# Week 3 Day 3 Slide 3: Break\\n**Time: 10 minutes**\\n\\n## Break Instructions\\nProcess digital concepts',
        '# Week 3 Day 3 Slide 4: Group Discussion\\n**Time: 25 minutes**\\n\\n## Discussion Prompts',
        '# Week 3 Day 3 Slide 5: Practice Exercise\\n**Time: 25 minutes**\\n\\n## Exercise Type\\nDigital exploration',
        '# Week 3 Day 3 Slide 6: Wrap-Up & Day 4 Preview\\n**Time: 10 minutes**\\n\\n## Key Reinforcement',
        '# Week 3 Day 3 Slide 7: Trainer Audit & Evidence Notes\\n**For Trainer Reference**',
        '# Week 3 Day 3 Slide 8: Resources & References\\n\\n## Session Materials'
      ] : [
        '# Week 3 Day 4 Slide 1: Welcome & Career Planning\\n**Time: 10 minutes**\\n\\n## Purpose\\nIntroduce career planning',
        '# Week 3 Day 4 Slide 2: Career Planning & Next Steps\\n**Time: 40 minutes**\\n\\n## Core Content\\n- Career planning frameworks',
        '# Week 3 Day 4 Slide 3: Break\\n**Time: 10 minutes**\\n\\n## Break Instructions\\nProcess career concepts',
        '# Week 3 Day 4 Slide 4: Group Discussion\\n**Time: 25 minutes**\\n\\n## Discussion Prompts',
        '# Week 3 Day 4 Slide 5: Practice Exercise\\n**Time: 25 minutes**\\n\\n## Exercise Type\\nCareer planning',
        '# Week 3 Day 4 Slide 6: Wrap-Up & Programme Reflection\\n**Time: 10 minutes**\\n\\n## Key Reinforcement',
        '# Week 3 Day 4 Slide 7: Trainer Audit & Evidence Notes\\n**For Trainer Reference**',
        '# Week 3 Day 4 Slide 8: Resources & References\\n\\n## Session Materials'
      ];
      
      setActualSlides(fallbackSlides);
      setSlideContents(fallbackContents);
      
      const weekData = generateWeekContent(weekNum, selectedDay, fallbackSlides);
      setContent(weekData);
    } else if (weekNum === 4) {
      // Week 4 fallback content - Critical Thinking & Creativity
      console.log(`Using fallback slide content for week 4, day ${selectedDay}`);
      const fallbackSlides = [
        'slide-1.md', 'slide-2.md', 'slide-3.md', 'slide-4.md',
        'slide-5.md', 'slide-6.md', 'slide-7.md', 'slide-8.md'
      ];
      const fallbackContents = selectedDay === 1 ? [
        '# Week 4 Day 1 Slide 1: Welcome & Critical Thinking\\n**Time: 10 minutes**\\n\\n## Purpose\\nIntroduce critical thinking skills',
        '# Week 4 Day 1 Slide 2: Critical Thinking Framework\\n**Time: 40 minutes**\\n\\n## Core Content\\n- Analytical thinking\\n- Evaluating information',
        '# Week 4 Day 1 Slide 3: Break\\n**Time: 10 minutes**\\n\\n## Break Instructions\\nProcess critical thinking concepts',
        '# Week 4 Day 1 Slide 4: Group Discussion\\n**Time: 25 minutes**\\n\\n## Discussion Prompts\\nCritical analysis exercises',
        '# Week 4 Day 1 Slide 5: Practice Exercise\\n**Time: 25 minutes**\\n\\n## Exercise Type\\nCritical thinking scenarios',
        '# Week 4 Day 1 Slide 6: Wrap-Up & Day 2 Preview\\n**Time: 10 minutes**\\n\\n## Key Reinforcement',
        '# Week 4 Day 1 Slide 7: Trainer Audit & Evidence Notes\\n**For Trainer Reference**',
        '# Week 4 Day 1 Slide 8: Resources & References\\n\\n## Session Materials'
      ] : selectedDay === 2 ? [
        '# Week 4 Day 2 Slide 1: Welcome & Creative Problem Solving\\n**Time: 10 minutes**\\n\\n## Purpose\\nIntroduce creative thinking',
        '# Week 4 Day 2 Slide 2: Creative Problem Solving\\n**Time: 40 minutes**\\n\\n## Core Content\\n- Brainstorming techniques\\n- Innovation mindset',
        '# Week 4 Day 2 Slide 3: Break\\n**Time: 10 minutes**\\n\\n## Break Instructions\\nCreative refresh',
        '# Week 4 Day 2 Slide 4: Group Discussion\\n**Time: 25 minutes**\\n\\n## Discussion Prompts\\nCreativity challenges',
        '# Week 4 Day 2 Slide 5: Practice Exercise\\n**Time: 25 minutes**\\n\\n## Exercise Type\\nCreative exercises',
        '# Week 4 Day 2 Slide 6: Wrap-Up & Day 3 Preview\\n**Time: 10 minutes**\\n\\n## Key Reinforcement',
        '# Week 4 Day 2 Slide 7: Trainer Audit & Evidence Notes\\n**For Trainer Reference**',
        '# Week 4 Day 2 Slide 8: Resources & References\\n\\n## Session Materials'
      ] : selectedDay === 3 ? [
        '# Week 4 Day 3 Slide 1: Welcome & Decision Making\\n**Time: 10 minutes**\\n\\n## Purpose\\nIntroduce decision making frameworks',
        '# Week 4 Day 3 Slide 2: Decision Making Framework\\n**Time: 40 minutes**\\n\\n## Core Content\\n- Decision models\\n- Risk assessment',
        '# Week 4 Day 3 Slide 3: Break\\n**Time: 10 minutes**\\n\\n## Break Instructions\\nProcess decision concepts',
        '# Week 4 Day 3 Slide 4: Group Discussion\\n**Time: 25 minutes**\\n\\n## Discussion Prompts\\nDecision scenarios',
        '# Week 4 Day 3 Slide 5: Practice Exercise\\n**Time: 25 minutes**\\n\\n## Exercise Type\\nDecision practice',
        '# Week 4 Day 3 Slide 6: Wrap-Up & Day 4 Preview\\n**Time: 10 minutes**\\n\\n## Key Reinforcement',
        '# Week 4 Day 3 Slide 7: Trainer Audit & Evidence Notes\\n**For Trainer Reference**',
        '# Week 4 Day 3 Slide 8: Resources & References\\n\\n## Session Materials'
      ] : [
        '# Week 4 Day 4 Slide 1: Welcome & Innovation Workshop\\n**Time: 10 minutes**\\n\\n## Purpose\\nApply skills in innovation context',
        '# Week 4 Day 4 Slide 2: Innovation Workshop\\n**Time: 40 minutes**\\n\\n## Core Content\\n- Innovation principles\\n- Real-world application',
        '# Week 4 Day 4 Slide 3: Break\\n**Time: 10 minutes**\\n\\n## Break Instructions\\nCreative break',
        '# Week 4 Day 4 Slide 4: Group Discussion\\n**Time: 25 minutes**\\n\\n## Discussion Prompts\\nInnovation ideas',
        '# Week 4 Day 4 Slide 5: Practice Exercise\\n**Time: 25 minutes**\\n\\n## Exercise Type\\nInnovation project',
        '# Week 4 Day 4 Slide 6: Week 4 Wrap-Up\\n**Time: 10 minutes**\\n\\n## Key Reinforcement',
        '# Week 4 Day 4 Slide 7: Trainer Audit & Evidence Notes\\n**For Trainer Reference**',
        '# Week 4 Day 4 Slide 8: Resources & Week 5 Preview\\n\\n## Session Materials'
      ];
      
      setActualSlides(fallbackSlides);
      setSlideContents(fallbackContents);
      
      const weekData = generateWeekContent(weekNum, selectedDay, fallbackSlides);
      setContent(weekData);
    } else if (weekNum === 5) {
      // Week 5 fallback content - Professional Development
      console.log(`Using fallback slide content for week 5, day ${selectedDay}`);
      const fallbackSlides = [
        'slide-1.md', 'slide-2.md', 'slide-3.md', 'slide-4.md',
        'slide-5.md', 'slide-6.md', 'slide-7.md', 'slide-8.md'
      ];
      const fallbackContents = selectedDay === 1 ? [
        '# Week 5 Day 1 Slide 1: Welcome & CV Building\\n**Time: 10 minutes**\\n\\n## Purpose\\nIntroduce CV building skills',
        '# Week 5 Day 1 Slide 2: CV Building Workshop\\n**Time: 40 minutes**\\n\\n## Core Content\\n- CV structure\\n- Highlighting strengths',
        '# Week 5 Day 1 Slide 3: Break\\n**Time: 10 minutes**\\n\\n## Break Instructions\\nCV reflection',
        '# Week 5 Day 1 Slide 4: Group Discussion\\n**Time: 25 minutes**\\n\\n## Discussion Prompts\\nCV challenges',
        '# Week 5 Day 1 Slide 5: Practice Exercise\\n**Time: 25 minutes**\\n\\n## Exercise Type\\nCV drafting',
        '# Week 5 Day 1 Slide 6: Wrap-Up & Day 2 Preview\\n**Time: 10 minutes**\\n\\n## Key Reinforcement',
        '# Week 5 Day 1 Slide 7: Trainer Audit & Evidence Notes\\n**For Trainer Reference**',
        '# Week 5 Day 1 Slide 8: Resources & References\\n\\n## Session Materials'
      ] : selectedDay === 2 ? [
        '# Week 5 Day 2 Slide 1: Welcome & Job Searching\\n**Time: 10 minutes**\\n\\n## Purpose\\nIntroduce job search strategies',
        '# Week 5 Day 2 Slide 2: Job Search Strategies\\n**Time: 40 minutes**\\n\\n## Core Content\\n- Finding opportunities\\n- Application tips',
        '# Week 5 Day 2 Slide 3: Break\\n**Time: 10 minutes**\\n\\n## Break Instructions\\nJob search reflection',
        '# Week 5 Day 2 Slide 4: Group Discussion\\n**Time: 25 minutes**\\n\\n## Discussion Prompts\\nJob search experiences',
        '# Week 5 Day 2 Slide 5: Practice Exercise\\n**Time: 25 minutes**\\n\\n## Exercise Type\\nJob search practice',
        '# Week 5 Day 2 Slide 6: Wrap-Up & Day 3 Preview\\n**Time: 10 minutes**\\n\\n## Key Reinforcement',
        '# Week 5 Day 2 Slide 7: Trainer Audit & Evidence Notes\\n**For Trainer Reference**',
        '# Week 5 Day 2 Slide 8: Resources & References\\n\\n## Session Materials'
      ] : selectedDay === 3 ? [
        '# Week 5 Day 3 Slide 1: Welcome & Interview Skills\\n**Time: 10 minutes**\\n\\n## Purpose\\nIntroduce interview skills',
        '# Week 5 Day 3 Slide 2: Interview Skills Workshop\\n**Time: 40 minutes**\\n\\n## Core Content\\n- Interview preparation\\n- Common questions',
        '# Week 5 Day 3 Slide 3: Break\\n**Time: 10 minutes**\\n\\n## Break Instructions\\nInterview prep',
        '# Week 5 Day 3 Slide 4: Group Discussion\\n**Time: 25 minutes**\\n\\n## Discussion Prompts\\nInterview experiences',
        '# Week 5 Day 3 Slide 5: Practice Exercise\\n**Time: 25 minutes**\\n\\n## Exercise Type\\nMock interviews',
        '# Week 5 Day 3 Slide 6: Wrap-Up & Day 4 Preview\\n**Time: 10 minutes**\\n\\n## Key Reinforcement',
        '# Week 5 Day 3 Slide 7: Trainer Audit & Evidence Notes\\n**For Trainer Reference**',
        '# Week 5 Day 3 Slide 8: Resources & References\\n\\n## Session Materials'
      ] : [
        '# Week 5 Day 4 Slide 1: Welcome & Personal Branding\\n**Time: 10 minutes**\\n\\n## Purpose\\nIntroduce personal branding',
        '# Week 5 Day 4 Slide 2: Personal Branding Workshop\\n**Time: 40 minutes**\\n\\n## Core Content\\n- Professional identity\\n- Online presence',
        '# Week 5 Day 4 Slide 3: Break\\n**Time: 10 minutes**\\n\\n## Break Instructions\\nBranding reflection',
        '# Week 5 Day 4 Slide 4: Group Discussion\\n**Time: 25 minutes**\\n\\n## Discussion Prompts\\nPersonal brand ideas',
        '# Week 5 Day 4 Slide 5: Practice Exercise\\n**Time: 25 minutes**\\n\\n## Exercise Type\\nBrand development',
        '# Week 5 Day 4 Slide 6: Week 5 Wrap-Up\\n**Time: 10 minutes**\\n\\n## Key Reinforcement',
        '# Week 5 Day 4 Slide 7: Trainer Audit & Evidence Notes\\n**For Trainer Reference**',
        '# Week 5 Day 4 Slide 8: Resources & Week 6 Preview\\n\\n## Session Materials'
      ];
      
      setActualSlides(fallbackSlides);
      setSlideContents(fallbackContents);
      
      const weekData = generateWeekContent(weekNum, selectedDay, fallbackSlides);
      setContent(weekData);
    } else if (weekNum === 6) {
      // Week 6 fallback content - Project & Graduation
      console.log(`Using fallback slide content for week 6, day ${selectedDay}`);
      const fallbackSlides = [
        'slide-1.md', 'slide-2.md', 'slide-3.md', 'slide-4.md',
        'slide-5.md', 'slide-6.md', 'slide-7.md', 'slide-8.md'
      ];
      const fallbackContents = selectedDay === 1 ? [
        '# Week 6 Day 1 Slide 1: Welcome & Project Planning\\n**Time: 10 minutes**\\n\\n## Purpose\\nIntroduce final project',
        '# Week 6 Day 1 Slide 2: Project Planning Workshop\\n**Time: 40 minutes**\\n\\n## Core Content\\n- Project selection\\n- Planning framework',
        '# Week 6 Day 1 Slide 3: Break\\n**Time: 10 minutes**\\n\\n## Break Instructions\\nProject ideas',
        '# Week 6 Day 1 Slide 4: Group Discussion\\n**Time: 25 minutes**\\n\\n## Discussion Prompts\\nProject concepts',
        '# Week 6 Day 1 Slide 5: Practice Exercise\\n**Time: 25 minutes**\\n\\n## Exercise Type\\nProject planning',
        '# Week 6 Day 1 Slide 6: Wrap-Up & Day 2 Preview\\n**Time: 10 minutes**\\n\\n## Key Reinforcement',
        '# Week 6 Day 1 Slide 7: Trainer Audit & Evidence Notes\\n**For Trainer Reference**',
        '# Week 6 Day 1 Slide 8: Resources & References\\n\\n## Session Materials'
      ] : selectedDay === 2 ? [
        '# Week 6 Day 2 Slide 1: Welcome & Project Development\\n**Time: 10 minutes**\\n\\n## Purpose\\nContinue project work',
        '# Week 6 Day 2 Slide 2: Project Development Workshop\\n**Time: 40 minutes**\\n\\n## Core Content\\n- Building projects\\n- Overcoming challenges',
        '# Week 6 Day 2 Slide 3: Break\\n**Time: 10 minutes**\\n\\n## Break Instructions\\nProject refresh',
        '# Week 6 Day 2 Slide 4: Group Discussion\\n**Time: 25 minutes**\\n\\n## Discussion Prompts\\nProject progress',
        '# Week 6 Day 2 Slide 5: Practice Exercise\\n**Time: 25 minutes**\\n\\n## Exercise Type\\nProject building',
        '# Week 6 Day 2 Slide 6: Wrap-Up & Day 3 Preview\\n**Time: 10 minutes**\\n\\n## Key Reinforcement',
        '# Week 6 Day 2 Slide 7: Trainer Audit & Evidence Notes\\n**For Trainer Reference**',
        '# Week 6 Day 2 Slide 8: Resources & References\\n\\n## Session Materials'
      ] : selectedDay === 3 ? [
        '# Week 6 Day 3 Slide 1: Welcome & Presentation Prep\\n**Time: 10 minutes**\\n\\n## Purpose\\nPrepare for final presentations',
        '# Week 6 Day 3 Slide 2: Presentation Skills\\n**Time: 40 minutes**\\n\\n## Core Content\\n- Presentation tips\\n- Confidence building',
        '# Week 6 Day 3 Slide 3: Break\\n**Time: 10 minutes**\\n\\n## Break Instructions\\nPresentation prep',
        '# Week 6 Day 3 Slide 4: Group Discussion\\n**Time: 25 minutes**\\n\\n## Discussion Prompts\\nPresentation practice',
        '# Week 6 Day 3 Slide 5: Practice Exercise\\n**Time: 25 minutes**\\n\\n## Exercise Type\\nPractice sessions',
        '# Week 6 Day 3 Slide 6: Wrap-Up & Day 4 Preview\\n**Time: 10 minutes**\\n\\n## Key Reinforcement',
        '# Week 6 Day 3 Slide 7: Trainer Audit & Evidence Notes\\n**For Trainer Reference**',
        '# Week 6 Day 3 Slide 8: Resources & References\\n\\n## Session Materials'
      ] : [
        '# Week 6 Day 4 Slide 1: Welcome to Graduation Day!\\n**Time: 10 minutes**\\n\\n## Purpose\\nCelebrate achievements',
        '# Week 6 Day 4 Slide 2: Final Presentations\\n**Time: 40 minutes**\\n\\n## Core Content\\n- Graduate presentations\\n- Celebration',
        '# Week 6 Day 4 Slide 3: Break & Celebration Prep\\n**Time: 10 minutes**\\n\\n## Break Instructions\\nCelebration break',
        '# Week 6 Day 4 Slide 4: Certificate Ceremony\\n**Time: 25 minutes**\\n\\n## Ceremony\\nCertificate presentations',
        '# Week 6 Day 4 Slide 5: Reflection & Next Steps\\n**Time: 25 minutes**\\n\\n## Reflection\\nProgramme reflection',
        '# Week 6 Day 4 Slide 6: Programme Wrap-Up\\n**Time: 10 minutes**\\n\\n## Celebration\\nFinal messages',
        '# Week 6 Day 4 Slide 7: Trainer Audit & Evidence Notes\\n**For Trainer Reference**',
        '# Week 6 Day 4 Slide 8: Resources & Staying Connected\\n\\n## Materials\\nAlumni resources'
      ];
      
      setActualSlides(fallbackSlides);
      setSlideContents(fallbackContents);
      
      const weekData = generateWeekContent(weekNum, selectedDay, fallbackSlides);
      setContent(weekData);
    } else {
      // For other weeks, use default generation
      console.log('Using default generation for week:', weekNum);
      const weekData = generateWeekContent(weekNum, selectedDay);
      setContent(weekData);
    }
    }
    
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

  const openSlides = (day: number, slideIndex?: number) => {
    // Navigate to presentation view for this specific day and slide
    const slideParam = slideIndex !== undefined ? `&slide=${slideIndex}` : '';
    window.location.href = `/present?week=${weekNumber}&day=${day}&role=trainer${slideParam}`;
  };

  const openSingleSlide = (day: number, slideIndex: number) => {
    openSlides(day, slideIndex);
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

  const currentDay = content.days[selectedDay - 1];
  const dayOutcomes = currentDay?.outcomes || [];
  const completedCount = dayOutcomes.filter(o => completedOutcomes.has(o.id)).length;
  const dayTotalOutcomes = dayOutcomes.length;
  const weekNum = parseInt(weekNumber || '1');

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
                  {currentDay.slides.slice(0, 8).map((slide, i) => {
                    const isActualSlide = actualSlides.length > 0;
                    const slideTitle = isActualSlide && slideContents[i] ? 
                      slideContents[i].split('\n')[0].replace('# ', '').replace(/Slide \d+: /, '') : 
                      `Slide ${i + 1}`;
                    
                    return (
                      <div
                        key={i}
                        className="aspect-video bg-white rounded-xl border-2 border-calm-200 hover:border-primary-300 cursor-pointer transition-all hover:shadow-md group relative overflow-hidden"
                          title={slideTitle}
                        >
                          {/* Edit button overlay */}
                          {isActualSlide && slideContents[i] && slideContents[i].includes('#') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `/present?week=${weekNumber}&day=${selectedDay}&role=trainer&slide=${i}&edit=true`;
                              }}
                              className="absolute top-2 right-2 p-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10"
                              title="Edit slide"
                            >
                              <Edit3 size={12} />
                            </button>
                          )}
                          
                          <div
                            onClick={() => openSingleSlide(selectedDay, i)}
                            className="w-full h-full"
                          >
                        {isActualSlide && slideContents[i] && slideContents[i].includes('#') ? (
                          <div className="p-2 h-full overflow-hidden">
                            <div className="text-[8px] leading-tight text-calm-600 line-clamp-6">
                              <ReactMarkdown>{slideContents[i]}</ReactMarkdown>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white pointer-events-none" />
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center text-calm-400 group-hover:text-primary-500 transition-colors">
                            <div className="text-center">
                              <Presentation size={20} className="mx-auto mb-1 opacity-50 group-hover:opacity-70" />
                              <span className="text-xs">{slideTitle}</span>
                            </div>
                          </div>
                        )}
                        <div className="absolute bottom-1 right-1 bg-calm-800/80 text-white text-[10px] px-1.5 py-0.5 rounded">
                          {i + 1}
                        </div>
                          </div>
                        </div>
                    );
                  })}
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
function generateWeekContent(weekNum: number, selectedDay?: number, actualSlides?: string[]): WeekContent {
  const weekTitles = [
    'Foundation Week - Building Basics',
    'Skills Development Week',
    'Advanced Skills Week',
    'Problem Solving & Creativity',
    'Professional Development',
    'Project & Graduation',
  ];

  const weekOverviews = [
    'Building foundations for learning, communication, and sustainable work practices.',
    'Practical skills building and application across key professional areas.',
    'Leadership, project management, and career planning skills development.',
    'Creative thinking and problem-solving strategies.',
    'Career planning, CV writing, and interview preparation.',
    'Final project presentation and programme completion.',
  ];

  const dayData: Record<number, { titles: string[]; focuses: string[] }> = {
    1: {
      titles: ['Welcome & Introduction', 'Assessment & Support Mapping', 'Confidence, Communication & Voice', 'Expectations, Boundaries & Pacing'],
      focuses: ['Getting to know each other and the programme', 'Understanding assessment vs testing, mapping support strategies', 'Rebuilding confidence, understanding communication styles, finding your voice', 'Setting healthy expectations, understanding boundaries, learning sustainable pacing'],
    },
    2: {
      titles: ['Skills Foundation', 'Communication Skills', 'Problem-Solving & Critical Thinking', 'Time Management & Organization'],
      focuses: ['Building practical skills foundation and assessment', 'Professional communication framework and practice', 'Structured problem-solving and analytical thinking', 'Time management techniques and organizational skills'],
    },
    3: {
      titles: ['Leadership & Influence', 'Project Management Basics', 'Digital Skills & Technology', 'Career Planning & Next Steps'],
      focuses: ['Leadership principles and influence techniques', 'Project management fundamentals and tools', 'Digital skills and technology proficiency', 'Career planning and professional development'],
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
    slides: (dayNum === selectedDay && actualSlides && actualSlides.length > 0) ? actualSlides : Array.from({ length: 8 }, (_, i) => `/slides/week${weekNum}/day${dayNum}/slide${i + 1}.png`),
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
