import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Monitor,
  MessageSquare,
  Hand,
  Users,
  Send,
  Volume2,
  VolumeX,
  AlertCircle,
  CheckCircle,
  Maximize2,
  Minimize2,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock,
  Target,
  ExternalLink,
  Copy,
  Check,
  Columns,
  Presentation,
  Zap,
  Edit3,
  Save,
  X,
  Video,
  VideoOff,
  Wifi,
  WifiOff,
  Play,
  Square,
  ShieldAlert,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import RecordingConsent from '../components/RecordingConsent';
import { RecordingIndicator, RecordingBanner } from '../components/RecordingIndicator';
import RecordingControls from '../components/RecordingControls';
import wsService, { Participant, ChatMessage as WSChatMessage } from '../services/websocket';

interface ChatMessage {
  id: string;
  senderName: string;
  senderType: 'trainer' | 'trainee';
  message: string;
  timestamp: Date;
}

interface WeekContent {
  weekNumber: number;
  title: string;
  overview: string;
  slides: string[];
  trainerNotes: string;
  activities: Activity[];
  outcomes: Outcome[];
}

interface Activity {
  id: string;
  title: string;
  duration: string;
  type: string;
  description: string;
  instructions: string;
}

interface Outcome {
  id: string;
  description: string;
}

type ViewMode = 'split' | 'content' | 'classroom';
type ContentTab = 'slides' | 'notes' | 'activities' | 'outcomes';

export default function PresentationView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const weekNumber = parseInt(searchParams.get('week') || '1');
  const dayNumber = parseInt(searchParams.get('day') || '1');
  const startSlideIndex = parseInt(searchParams.get('slide') || '0');
  const shouldStartEditing = searchParams.get('edit') === 'true';
  const roleParam = searchParams.get('role');
  
  // Trainer authentication - must have role=trainer in URL
  // Trainees should use /join to access sessions
  const isTrainer = roleParam === 'trainer';
  
  // Redirect non-trainers to the join page
  useEffect(() => {
    if (roleParam && roleParam !== 'trainer') {
      // If someone tries to access with role=trainee, redirect to join page
      navigate('/join');
    }
  }, [roleParam, navigate]);
  
  // View State
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [copied, setCopied] = useState(false);
  
  // Content State
  const [content, setContent] = useState<WeekContent | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(startSlideIndex);
  const [contentTab, setContentTab] = useState<ContentTab>('slides');
  const [completedOutcomes, setCompletedOutcomes] = useState<Set<string>>(new Set());
  const [slideContents, setSlideContents] = useState<string[]>([]);
  const [loadingSlides, setLoadingSlides] = useState(true);
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editingContent, setEditingContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Support State
  const [supportRequests] = useState<string[]>([]);
  const [mySupport, setMySupport] = useState<{ active: boolean; acknowledged: boolean }>({ active: false, acknowledged: false });

  // WebSocket Session State
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [roomCode, setRoomCode] = useState<string>('');
  const [wsConnected, setWsConnected] = useState(false);
  const [wsParticipants, setWsParticipants] = useState<Participant[]>([]);
  const [wsMessages, setWsMessages] = useState<WSChatMessage[]>([]);

  // Demo Participants (fallback when no live session)
  const demoParticipants = [
    { id: '2', name: 'Alex Johnson', initials: 'AJ', color: 'bg-emerald-500', isOnline: true, isTrainer: false, joinedAt: '' },
    { id: '3', name: 'Jordan Smith', initials: 'JS', color: 'bg-violet-500', isOnline: true, isTrainer: false, joinedAt: '' },
    { id: '4', name: 'Sam Williams', initials: 'SW', color: 'bg-amber-500', isOnline: true, isTrainer: false, joinedAt: '' },
    { id: '5', name: 'Casey Brown', initials: 'CB', color: 'bg-rose-500', isOnline: true, isTrainer: false, joinedAt: '' },
    { id: '6', name: 'Morgan Davis', initials: 'MD', color: 'bg-cyan-500', isOnline: true, isTrainer: false, joinedAt: '' },
    { id: '7', name: 'Riley Taylor', initials: 'RT', color: 'bg-indigo-500', isOnline: false, isTrainer: false, joinedAt: '' },
    { id: '8', name: 'Quinn Anderson', initials: 'QA', color: 'bg-pink-500', isOnline: true, isTrainer: false, joinedAt: '' },
    { id: '9', name: 'Jamie Wilson', initials: 'JW', color: 'bg-teal-500', isOnline: true, isTrainer: false, joinedAt: '' },
    { id: '10', name: 'Avery Thomas', initials: 'AT', color: 'bg-orange-500', isOnline: true, isTrainer: false, joinedAt: '' },
    { id: '11', name: 'Taylor Martinez', initials: 'TM', color: 'bg-lime-500', isOnline: false, isTrainer: false, joinedAt: '' },
  ];

  // Use WebSocket participants if session active, otherwise demo
  const participants = isSessionActive ? wsParticipants.filter(p => !p.isTrainer) : demoParticipants;

  // Recording State
  const [showConsentModal, setShowConsentModal] = useState(!isTrainer); // Show for trainees on join
  const [hasConsented, setHasConsented] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showRecordingControls, setShowRecordingControls] = useState(false);

  // Camera State
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [showCameraSelector, setShowCameraSelector] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // WebSocket event handlers
  useEffect(() => {
    // Setup WebSocket listeners
    wsService.on('session-created', handleSessionCreated);
    wsService.on('participant-joined', handleParticipantJoined);
    wsService.on('participant-left', handleParticipantLeft);
    wsService.on('chat-message', handleWsChatMessage);
    wsService.on('disconnected', handleWsDisconnected);
    
    return () => {
      wsService.off('session-created', handleSessionCreated);
      wsService.off('participant-joined', handleParticipantJoined);
      wsService.off('participant-left', handleParticipantLeft);
      wsService.off('chat-message', handleWsChatMessage);
      wsService.off('disconnected', handleWsDisconnected);
    };
  }, []);

  const handleSessionCreated = (data: any) => {
    setRoomCode(data.roomCode);
    setIsSessionActive(true);
    setWsParticipants(data.session.participants);
    setWsMessages(data.session.messages);
  };

  const handleParticipantJoined = (data: any) => {
    setWsParticipants(data.participants);
  };

  const handleParticipantLeft = (data: any) => {
    setWsParticipants(data.participants);
  };

  const handleWsChatMessage = (data: any) => {
    setWsMessages(prev => [...prev, data.message]);
  };

  const handleWsDisconnected = () => {
    setWsConnected(false);
  };

  const startLiveSession = async () => {
    try {
      await wsService.connect();
      setWsConnected(true);
      wsService.createSession('Trainer', weekNumber, dayNumber);
    } catch (err) {
      console.error('Failed to start session:', err);
      alert('Failed to connect to server. Please check the server is running.');
    }
  };

  const endLiveSession = () => {
    if (confirm('Are you sure you want to end the session? All participants will be disconnected.')) {
      wsService.endSession();
      setIsSessionActive(false);
      setRoomCode('');
      setWsParticipants([]);
      wsService.disconnect();
      setWsConnected(false);
    }
  };

  // Broadcast slide changes to participants
  const broadcastSlideChange = (slideIndex: number) => {
    if (isSessionActive) {
      wsService.changeSlide(slideIndex);
    }
  };

  // Load available cameras on mount
  useEffect(() => {
    const loadCameras = async () => {
      try {
        // Request permission first to get device labels
        await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
          .then(stream => stream.getTracks().forEach(track => track.stop()));
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === 'videoinput');
        setAvailableCameras(cameras);
        
        // Set default to first non-DroidCam camera if available
        const preferredCamera = cameras.find(cam => 
          !cam.label.toLowerCase().includes('droidcam')
        ) || cameras[0];
        if (preferredCamera) {
          setSelectedCameraId(preferredCamera.deviceId);
        }
      } catch (err) {
        console.error('Error loading cameras:', err);
      }
    };
    loadCameras();
  }, []);

  // Load content on mount
  useEffect(() => {
    loadContent();
    loadMessages();
    const msgInterval = setInterval(loadMessages, 3000);
    return () => clearInterval(msgInterval);
  }, [weekNumber, dayNumber]);

  // Auto-start editing if requested via URL
  useEffect(() => {
    if (shouldStartEditing && !loadingSlides && slideContents[currentSlideIndex]) {
      startEditing();
    }
  }, [shouldStartEditing, loadingSlides, currentSlideIndex, slideContents]);

  // Camera toggle function
  const toggleCamera = async () => {
    if (cameraEnabled && cameraStream) {
      // Stop camera
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
      setCameraEnabled(false);
    } else {
      // Start camera with selected device
      try {
        const constraints: MediaStreamConstraints = {
          video: selectedCameraId 
            ? { deviceId: { exact: selectedCameraId }, width: 320, height: 240 }
            : { width: 320, height: 240, facingMode: 'user' },
          audio: false 
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        setCameraStream(stream);
        setCameraEnabled(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        alert('Unable to access camera. Please check permissions.');
      }
    }
  };

  // Switch camera function
  const switchCamera = async (deviceId: string) => {
    setSelectedCameraId(deviceId);
    setShowCameraSelector(false);
    
    // Stop existing stream if any
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }
    
    // Start camera with selected device (whether it was on or off before)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId }, width: 320, height: 240 },
        audio: false
      });
      setCameraStream(stream);
      setCameraEnabled(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error switching camera:', err);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Update video element when stream changes
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          prevSlide();
          break;
        case 'ArrowRight':
          nextSlide();
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        case '1':
          setViewMode('split');
          break;
        case '2':
          setViewMode('content');
          break;
        case '3':
          setViewMode('classroom');
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlideIndex, content]);

  const loadContent = async () => {
    setLoadingSlides(true);
    console.log(`Loading content for week ${weekNumber}, day ${dayNumber}`);
    
    // Try to load actual slides for weeks 1-3 that have content
    if (weekNumber >= 1 && weekNumber <= 3) {
      if (window.electronAPI?.content?.getWeekSlides) {
        try {
          console.log(`Attempting to load slides for week ${weekNumber}, day ${dayNumber}`);
          const slides = await window.electronAPI.content.getWeekSlides(weekNumber, dayNumber) || [];
          console.log('Loaded slides:', slides);
          
          if (slides.length > 0) {
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
            
            setContent({
              weekNumber,
              title: getDayTitle(weekNumber, dayNumber),
              overview: getDayOverview(weekNumber, dayNumber),
              slides: slides,
              trainerNotes: getTrainerNotes(weekNumber, dayNumber),
              activities: getActivities(weekNumber, dayNumber),
              outcomes: getOutcomes(weekNumber, dayNumber),
            });
            setLoadingSlides(false);
            return;
          }
        } catch (error) {
          console.error('Error loading slides via electron API:', error);
        }
      }
      
      // Fallback: use hardcoded slide content for week 1
      const fallbackSlides = [
        'slide-1.md', 'slide-2.md', 'slide-3.md', 'slide-4.md',
        'slide-5.md', 'slide-6.md', 'slide-7.md', 'slide-8.md'
      ];
      const fallbackContents = dayNumber === 1 ? [
        `# Slide 1: Welcome & Energiser
**Time: 10 minutes**

## Purpose
Reduce anxiety, establish psychological safety, and create belonging

## Trainer Script
> "Today is not about performance or pressure. It's about arriving safely."

## Activity Instructions
- Each participant may share:
  - Their name
  - One small hope
- **Important reminder:** Passing is always allowed`,
        `# Slide 2: Main Learning Activity
**Time: 40 minutes**

## What is RemoteAbility?
- A supportive, non-competitive training programme
- Focused on individual strengths and needs
- Adaptable to different learning styles

## What RemoteAbility is NOT
- A test or assessment of your abilities
- Competitive with other participants
- Rigid or inflexible

## Programme Structure
- **6 weeks total**
- Predictable daily format
- Built-in support and flexibility
- Focus on practical skills`,
        `# Slide 3: Break Time
**Time: 10 minutes**

## Break Instructions
- Stretch your body
- Hydrate with water
- Step away from your workspace
- Fresh air if possible

## Return Time
**Please return at: [INSERT SPECIFIC TIME]**

## Trainer Notes
- Clearly announce the exact return time
- Use this time to check in with anxious participants`,
        `# Slide 4: Group Discussion
**Time: 25 minutes**

## Discussion Prompts
Choose 1-2 questions that feel right for the group:

- What made you decide to join this programme?
- What has been difficult about work previously?
- What do you hope might be different this time?
- What would success look like for you?

## ⚠️ Safeguarding Reminders
- Never force sharing
- Watch for signs of distress
- Follow up privately if concerns arise`,
        `# Slide 5: Practice Exercise
**Time: 25 minutes**

## Private Reflection Exercise
**Important: This is NOT assessed or collected**

### Reflection Questions
Think quietly about:

1. **One difficulty** around work or learning
2. **One personal strength** you bring
3. **One small win** from today

## Instructions
- This is completely private
- You may write notes or just think
- No sharing required`,
        `# Slide 6: Wrap-Up & Preview
**Time: 10 minutes**

## Key Messages
✅ **Attending today is an achievement**

✅ **You belong in this programme**

✅ **There is no pass or fail**

## Next Session Preview
**Week 1 – Day 2: Initial Assessments**
- Understanding your support needs
- Identifying your strengths
- Planning your journey
- Still no pass or fail!`,
        `# Slide 7: Trainer Audit & Evidence
**For Trainer Reference Only**

## Required Documentation ✓
- [ ] Attendance recorded
- [ ] Engagement observed (no scoring)
- [ ] Adjustments requested logged
- [ ] Safeguarding concerns noted privately

## Post-Session Actions
- Complete attendance register
- Note accessibility needs identified
- Follow up safeguarding concerns via proper channels`,
        `# Slide 8: Resources & Accessibility

## Session Resources
- Attendance register
- Programme overview materials
- Contact information sheets
- Private reflection sheets (optional)

## Accessibility Checklist
- [ ] Materials in alternative formats available
- [ ] Flexible participation allowed
- [ ] Quiet spaces identified
- [ ] Communication preferences noted`
      ] : dayNumber === 2 ? [
        `# Day 2 Slide 1: Welcome & Assessment Overview
**Time: 10 minutes**

## Purpose
Welcome back and introduce assessment concepts

## Activity
Chat energiser about assessment feelings`,
        `# Day 2 Slide 2: Understanding Assessments  
**Time: 40 minutes**

## Key Concepts
- Assessment vs Testing
- Understanding vs Judging
- Supportive approaches

## Learning Objectives
- Understand purpose of assessments
- Recognize difference between testing and understanding
- Map appropriate support strategies`,
        `# Day 2 Slide 3: Break Time
**Time: 10 minutes**

## Break Instructions
- Reflect on assessment concepts
- Prepare for group discussion
- Step away from workspace

## Return Time
**Please return at: [INSERT SPECIFIC TIME]**`,
        `# Day 2 Slide 4: Group Discussion
**Time: 25 minutes**

## Discussion Topics
- Personal experiences with assessment
- Concerns and worries about assessment
- Moving forward with new understanding

## Facilitating Tips
- Create safe space for sharing
- Acknowledge all experiences
- No judgment - we're all learning`,
        `# Day 2 Slide 5: Support Mapping Practice
**Time: 25 minutes**

## Practice Scenarios
- Sarah - The quiet online learner
- Marcus - The enthusiastic participant  
- Aisha - The confident contributor

## Exercise Goal
Practice mapping support strategies based on observations`,
        `# Day 2 Slide 6: Wrap-Up & Next Steps
**Time: 10 minutes**

## Key Takeaways
- Assessment is understanding, not testing
- Individual differences are normal
- Environment matters
- Communication is key`,
        `# Day 2 Slide 7: Trainer Audit
**For Trainer Reference**

## Session Completion
- [ ] Content delivered effectively
- [ ] Engagement levels documented
- [ ] Follow-up actions noted
- [ ] Individual support needs identified`,
        `# Day 2 Slide 8: Resources & References

## Materials
- Assessment guidelines
- Support strategy templates  
- Professional development resources
- Contact information for further support`
      ] : dayNumber === 3 ? [
        `# Day 3 Slide 1: Welcome & Energiser
**Time: 10 minutes**

## Purpose
Gentle activation and confidence normalisation

## Trainer Script
"Confidence is not something you either have or don't have – it's something you rebuild."

## Activity
Share one thing you did recently that took effort (no matter how small)`,
        `# Day 3 Slide 2: Understanding Confidence
**Time: 40 minutes**

## Key Concepts
- Confidence is rebuilding, not born
- Communication styles diversity
- Finding what works for YOU

## Communication Styles
- Verbal, Written, Structured, Paced
- All are equally valid
- Environment matters for confidence`,
        `# Day 3 Slide 3: Break Time
**Time: 10 minutes**

## Break Instructions
- Step away from screens
- Grounding exercises
- Process confidence discussions

## Return Focus
Preparing for voice and communication practice`,
        `# Day 3 Slide 4: Group Discussion - Finding Your Voice
**Time: 25 minutes**

## Discussion Topics
- Confidence challenges
- Communication comfort zones
- Feeling heard and respected

## Safe Environment
- Share only what feels comfortable
- All experiences are valid
- Multiple participation methods welcome`,
        `# Day 3 Slide 5: Practice Exercise - Safe Expression
**Time: 25 minutes**

## Safe Expression Practice
- Practice work-related communication
- Multiple expression methods available
- Focus on effort, not perfection

## Scenarios Available
- Asking for clarification
- Setting boundaries
- Requesting help
- Contributing ideas`,
        `# Day 3 Slide 6: Wrap-Up & Preview
**Time: 10 minutes**

## Key Messages
- Voice matters and can be developed
- Communication confidence grows with practice
- You deserve to be heard respectfully

## Day 4 Preview
- Expectations and boundaries
- Sustainable pacing
- Building on today's foundation`,
        `# Day 3 Slide 7: Trainer Audit
**For Trainer Reference**

## Session Quality Check
- Communication focus assessment
- Confidence building effectiveness
- Safe expression environment created
- Individual preferences noted`,
        `# Day 3 Slide 8: Resources & References

## Materials
- Communication practice templates
- Confidence building tools
- Voice development resources
- Professional support contacts`
      ] : dayNumber === 4 ? [
        `# Day 4 Slide 1: Welcome & Week Reflection
**Time: 10 minutes**

## Purpose
Week reflection and sustainable work introduction

## Trainer Script
"Sustainable work is about consistency, not pushing through exhaustion."

## Activity
Share one thing you learned about yourself this week (optional)`,
        `# Day 4 Slide 2: Expectations & Boundaries
**Time: 40 minutes**

## Key Concepts
- Healthy vs unhealthy expectations
- Professional boundary-setting
- Sustainable pacing skills

## Core Message
Boundary-setting is professional, not weakness`,
        `# Day 4 Slide 3: Break Time
**Time: 10 minutes**

## Break Instructions
- Practice sustainable break-taking
- Movement and eye rest
- Model healthy boundary behavior

## Return Focus
Preparing for burnout and balance discussions`,
        `# Day 4 Slide 4: Group Discussion - Burnout & Balance
**Time: 25 minutes**

## Discussion Topics
- What overwhelms you at work?
- Warning signs and boundaries
- Past helpful boundaries

## Safe Environment
- Validate burnout experiences
- Normalize boundary needs
- Share practical strategies`,
        `# Day 4 Slide 5: Personal Pacing Plan
**Time: 25 minutes**

## Private Exercise
- Create individual pacing strategy
- Energy peaks and break needs
- Personal warning signs

## Focus Areas
- Ideal working times
- Break frequency needs
- Signals to pause and rest`,
        `# Day 4 Slide 6: Week 1 Wrap-Up & Week 2 Preview
**Time: 10 minutes**

## Key Messages
- Sustainable pacing is professional skill
- Week 1 completion celebration
- Boundary-setting continues

## Week 2 Preview
- Practical skills development
- Applied learning opportunities
- Building on Week 1 foundations`,
        `# Day 4 Slide 7: Trainer Audit
**For Trainer Reference**

## Week 1 Assessment
- Sustainability focus evaluation
- Individual pacing needs noted
- Boundary awareness developed
- Week completion achievements`,
        `# Day 4 Slide 8: Resources & Week 2 Preview

## Materials
- Pacing plan templates
- Boundary-setting resources
- Week 2 preparation guides
- Ongoing support contacts`
      ] : [];
      
      setSlideContents(fallbackContents);
      setContent({
        weekNumber,
        title: getDayTitle(weekNumber, dayNumber),
        overview: getDayOverview(weekNumber, dayNumber),
        slides: fallbackSlides,
        trainerNotes: getTrainerNotes(weekNumber, dayNumber),
        activities: getActivities(weekNumber, dayNumber),
        outcomes: getOutcomes(weekNumber, dayNumber),
      });
    } else if (weekNumber >= 2 && weekNumber <= 6) {
      // For weeks 2-6, load from files or use simple fallback
      const fallbackSlides = [
        'slide-1.md', 'slide-2.md', 'slide-3.md', 'slide-4.md',
        'slide-5.md', 'slide-6.md', 'slide-7.md', 'slide-8.md'
      ];
      
      setSlideContents(fallbackSlides.map(slide => `# ${slide}\n\nSlide content for Week ${weekNumber}, Day ${dayNumber}`));
      setContent({
        weekNumber,
        title: getDayTitle(weekNumber, dayNumber),
        overview: getDayOverview(weekNumber, dayNumber),
        slides: fallbackSlides,
        trainerNotes: getTrainerNotes(weekNumber, dayNumber),
        activities: getActivities(weekNumber, dayNumber),
        outcomes: getOutcomes(weekNumber, dayNumber),
      });
    } else {
      // For other weeks, use default demo content
      setContent({
        weekNumber,
        title: getDayTitle(weekNumber, dayNumber),
        overview: getDayOverview(weekNumber, dayNumber),
        slides: Array.from({ length: 8 }, (_, i) => `/slides/week${weekNumber}/day${dayNumber}/slide${i + 1}.png`),
        trainerNotes: getTrainerNotes(weekNumber, dayNumber),
        activities: getActivities(weekNumber, dayNumber),
        outcomes: getOutcomes(weekNumber, dayNumber),
      });
    }
    setLoadingSlides(false);
  };

  const loadMessages = () => {
    // Demo messages
    setMessages([
      { id: '1', senderName: 'Trainer', senderType: 'trainer', message: `Welcome everyone! We're starting Week ${weekNumber}, Day ${dayNumber} today.`, timestamp: new Date(Date.now() - 300000) },
      { id: '2', senderName: 'Alex', senderType: 'trainee', message: 'Hi! Ready to learn 😊', timestamp: new Date(Date.now() - 240000) },
      { id: '3', senderName: 'Jordan', senderType: 'trainee', message: 'Good morning!', timestamp: new Date(Date.now() - 180000) },
    ]);
  };

  const nextSlide = () => {
    if (content && currentSlideIndex < content.slides.length - 1) {
      const newIndex = currentSlideIndex + 1;
      setCurrentSlideIndex(newIndex);
      broadcastSlideChange(newIndex);
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      const newIndex = currentSlideIndex - 1;
      setCurrentSlideIndex(newIndex);
      broadcastSlideChange(newIndex);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const startEditing = () => {
    setIsEditing(true);
    setEditingContent(slideContents[currentSlideIndex] || '');
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditingContent('');
  };

  const saveSlideContent = async () => {
    if (!editingContent.trim()) return;
    
    setIsSaving(true);
    try {
      // Save to backend if electron API is available
      if (window.electronAPI?.content?.saveSlideContent && content?.slides[currentSlideIndex]) {
        await window.electronAPI.content.saveSlideContent(
          content.slides[currentSlideIndex], 
          editingContent
        );
      }
      
      // Update local state
      const newSlideContents = [...slideContents];
      newSlideContents[currentSlideIndex] = editingContent;
      setSlideContents(newSlideContents);
      
      setIsEditing(false);
      setEditingContent('');
    } catch (error) {
      console.error('Error saving slide content:', error);
      alert('Failed to save slide content. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    
    const messageText = newMessage.trim();
    
    // If session is active, send via WebSocket
    if (isSessionActive) {
      wsService.sendChatMessage(messageText);
    }
    
    // Also add locally for immediate feedback
    const msg: ChatMessage = {
      id: Date.now().toString(),
      senderName: isTrainer ? 'Trainer' : 'You',
      senderType: isTrainer ? 'trainer' : 'trainee',
      message: messageText,
      timestamp: new Date(),
    };
    setMessages([...messages, msg]);
    setNewMessage('');
    
    // Log to recording if active
    if (isRecording && window.electronAPI?.recording) {
      window.electronAPI.recording.addChatMessage({
        timestamp: new Date().toISOString(),
        senderId: 'current-user',
        senderName: msg.senderName,
        senderType: msg.senderType,
        message: msg.message,
      });
    }
  };

  const requestSupport = () => {
    setMySupport({ active: true, acknowledged: false });
    // Simulate trainer acknowledgment after 3 seconds
    setTimeout(() => setMySupport(prev => ({ ...prev, acknowledged: true })), 3000);
  };

  const cancelSupport = () => {
    setMySupport({ active: false, acknowledged: false });
  };

  // Recording handlers
  const handleConsentAccept = () => {
    setHasConsented(true);
    setShowConsentModal(false);
    // Log consent in the recording
    if (window.electronAPI?.recording) {
      window.electronAPI.recording.recordConsent({
        traineeId: 'current-user',
        traineeName: 'Current User',
        acknowledged: true,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const handleConsentDecline = () => {
    // In a real app, might redirect away or show limited view
    setShowConsentModal(false);
    // Log declined consent
    if (window.electronAPI?.recording) {
      window.electronAPI.recording.recordConsent({
        traineeId: 'current-user',
        traineeName: 'Current User',
        acknowledged: false,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const handleRecordingStart = () => {
    setIsRecording(true);
    setIsPaused(false);
  };

  const handleRecordingPause = () => {
    setIsPaused(true);
  };

  const handleRecordingResume = () => {
    setIsPaused(false);
  };

  const handleRecordingStop = () => {
    setIsRecording(false);
    setIsPaused(false);
  };

  const copyShareLink = () => {
    // Always share the join link - trainees must use /join to access sessions
    // If session is active, include the room code
    const url = isSessionActive && roomCode
      ? `${window.location.origin}/join?code=${roomCode}`
      : `${window.location.origin}/join`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const toggleOutcome = (id: string) => {
    const newSet = new Set(completedOutcomes);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setCompletedOutcomes(newSet);
  };

  // Show access denied for non-trainers who somehow bypass the redirect
  if (!isTrainer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-calm-50 via-white to-primary-50 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 bg-danger-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldAlert size={40} className="text-danger-500" />
          </div>
          <h1 className="text-2xl font-bold text-calm-900 mb-3">Trainer Access Only</h1>
          <p className="text-calm-600 mb-6">
            This page is for trainers only. If you're a trainee, please use the join link provided by your trainer.
          </p>
          <button
            onClick={() => navigate('/join')}
            className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold transition-colors"
          >
            Go to Join Page
          </button>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-calm-50 flex items-center justify-center">
        <div className="text-calm-600 animate-pulse">Loading presentation...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-calm-50 via-white to-calm-100 text-calm-900 ${isFullscreen ? 'p-0' : 'p-4'}`}>
      {/* Recording Consent Modal for Trainees */}
      {showConsentModal && !isTrainer && (
        <RecordingConsent
          onAccept={handleConsentAccept}
          onDecline={handleConsentDecline}
          allowDecline={false}
          retentionDays={90}
        />
      )}

      {/* Recording Banner - shown to all when recording */}
      {isRecording && (
        <RecordingBanner 
          isPaused={isPaused}
          sessionInfo={`Week ${weekNumber}, Day ${dayNumber}`}
        />
      )}

      {/* Top Control Bar */}
      <div className={`bg-white/90 backdrop-blur-xl rounded-2xl mb-4 border border-calm-200 shadow-lg ${isFullscreen ? 'mx-4 mt-4' : ''}`}>
        <div className="flex items-center justify-between px-6 py-3">
          {/* Left - Logo & Title */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg">
                <Zap size={20} />
              </div>
              <div>
                <h1 className="font-bold text-lg text-calm-900">Week {weekNumber}, Day {dayNumber}: {content.title}</h1>
                <p className="text-calm-500 text-sm">
                  {isTrainer ? '🎓 Trainer View' : '📚 Trainee View'} • Live Session
                </p>
              </div>
            </div>
          </div>

          {/* Center - View Mode Toggle */}
          <div className="flex items-center gap-1 bg-calm-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode('split')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'split' ? 'bg-primary-500 text-white shadow-lg' : 'text-calm-600 hover:text-calm-900 hover:bg-calm-200'
              }`}
              title="Split View (Press 1)"
            >
              <Columns size={16} className="inline mr-2" />
              Split
            </button>
            <button
              onClick={() => setViewMode('content')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'content' ? 'bg-primary-500 text-white shadow-lg' : 'text-calm-600 hover:text-calm-900 hover:bg-calm-200'
              }`}
              title="Content Only (Press 2)"
            >
              <BookOpen size={16} className="inline mr-2" />
              Content
            </button>
            <button
              onClick={() => setViewMode('classroom')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'classroom' ? 'bg-primary-500 text-white shadow-lg' : 'text-calm-600 hover:text-calm-900 hover:bg-calm-200'
              }`}
              title="Classroom Only (Press 3)"
            >
              <Monitor size={16} className="inline mr-2" />
              Classroom
            </button>
          </div>

          {/* Right - Controls */}
          <div className="flex items-center gap-2">
            {/* Live Session Controls - Trainer Only */}
            {isTrainer && (
              <>
                {!isSessionActive ? (
                  <button
                    onClick={startLiveSession}
                    className="flex items-center gap-2 px-4 py-2 bg-success-500 hover:bg-success-600 rounded-xl text-white transition-colors shadow-md font-medium"
                  >
                    <Wifi size={16} />
                    Start Live Session
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-2 bg-success-100 border border-success-300 rounded-xl">
                      <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse" />
                      <span className="text-success-700 font-medium text-sm">Room:</span>
                      <span className="font-mono font-bold text-success-800 text-lg">{roomCode}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(roomCode);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="p-1 hover:bg-success-200 rounded-lg transition-colors"
                        title="Copy room code"
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                    <span className="text-calm-500 text-sm">
                      {wsParticipants.filter(p => !p.isTrainer).length} connected
                    </span>
                    <button
                      onClick={endLiveSession}
                      className="flex items-center gap-2 px-3 py-2 bg-danger-100 hover:bg-danger-200 text-danger-700 rounded-xl transition-colors font-medium"
                    >
                      <Square size={14} />
                      End
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Recording Indicator */}
            {isRecording && (
              <RecordingIndicator isPaused={isPaused} size="sm" />
            )}
            
            {/* Recording Controls Toggle - Trainer Only */}
            {isTrainer && (
              <button
                onClick={() => setShowRecordingControls(!showRecordingControls)}
                className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                  isRecording 
                    ? 'bg-danger-500 text-white hover:bg-danger-600' 
                    : 'bg-danger-100 text-danger-700 hover:bg-danger-200'
                }`}
              >
                {isRecording ? '● REC' : 'Record'}
              </button>
            )}
            
            {isTrainer && (
              <button
                onClick={copyShareLink}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white transition-colors shadow-md ${
                  isSessionActive ? 'bg-accent-500 hover:bg-accent-600' : 'bg-calm-400 hover:bg-calm-500'
                }`}
                title={isSessionActive ? `Share join link with room code ${roomCode}` : 'Start a live session first to share join link'}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : isSessionActive ? `Share: ${roomCode}` : 'Share Link'}
              </button>
            )}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2.5 rounded-xl transition-colors ${soundEnabled ? 'bg-calm-200 text-calm-700' : 'bg-calm-100 text-calm-400'}`}
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button
              onClick={() => setShowChat(!showChat)}
              className={`p-2.5 rounded-xl transition-colors ${showChat ? 'bg-calm-200 text-calm-700' : 'bg-calm-100 text-calm-400'}`}
            >
              <MessageSquare size={18} />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2.5 rounded-xl bg-calm-200 text-calm-700 hover:bg-calm-300 transition-colors"
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <Link
              to="/weeks"
              className="p-2.5 rounded-xl bg-calm-100 text-calm-500 hover:text-calm-700 hover:bg-calm-200 transition-colors"
              title="Exit Presentation"
            >
              <ExternalLink size={18} />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex gap-4 ${isFullscreen ? 'px-4' : ''}`} style={{ height: isFullscreen ? 'calc(100vh - 100px)' : 'calc(100vh - 180px)' }}>
        {/* Week Content Panel */}
        {(viewMode === 'split' || viewMode === 'content') && (
          <div className={`${viewMode === 'split' ? 'w-1/2' : 'flex-1'} bg-white/90 backdrop-blur-xl rounded-2xl border border-calm-200 shadow-lg flex flex-col overflow-hidden`}>
            {/* Content Tabs */}
            <div className="flex border-b border-calm-200">
              {[
                { id: 'slides' as ContentTab, label: 'Slides', icon: Presentation },
                { id: 'notes' as ContentTab, label: 'Notes', icon: BookOpen },
                { id: 'activities' as ContentTab, label: 'Activities', icon: Users },
                { id: 'outcomes' as ContentTab, label: 'Outcomes', icon: Target },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setContentTab(tab.id)}
                  className={`flex-1 px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
                    contentTab === tab.id 
                      ? 'text-primary-600 border-b-2 border-primary-500 bg-primary-50' 
                      : 'text-calm-500 hover:text-calm-700 hover:bg-calm-50'
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4">
              {contentTab === 'slides' && (
                <div className="h-full flex flex-col">
                  {/* Slide Display */}
                  <div className="flex-1 bg-white rounded-xl border border-calm-200 overflow-hidden min-h-[300px] relative">
                    {/* Edit/Save Controls */}
                    {isTrainer && (
                      <div className="absolute top-4 right-4 z-10 flex gap-2">
                        {!isEditing ? (
                          <button
                            onClick={startEditing}
                            className="p-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors shadow-md flex items-center gap-2"
                            title="Edit slide content"
                          >
                            <Edit3 size={16} />
                            <span className="text-sm">Edit</span>
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={saveSlideContent}
                              disabled={isSaving}
                              className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors shadow-md flex items-center gap-2 disabled:opacity-50"
                              title="Save changes"
                            >
                              <Save size={16} />
                              <span className="text-sm">{isSaving ? 'Saving...' : 'Save'}</span>
                            </button>
                            <button
                              onClick={cancelEditing}
                              disabled={isSaving}
                              className="p-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors shadow-md disabled:opacity-50"
                              title="Cancel editing"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {loadingSlides ? (
                      <div className="flex items-center justify-center h-full text-calm-500">
                        <div className="text-center">
                          <Presentation size={64} className="mx-auto mb-4 opacity-50 animate-pulse" />
                          <p className="text-lg">Loading slides...</p>
                        </div>
                      </div>
                    ) : isEditing ? (
                      <div className="h-full p-6 flex flex-col">
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-calm-800 mb-2">
                            Editing Slide {currentSlideIndex + 1}
                          </h3>
                          <p className="text-sm text-calm-600">
                            Use Markdown formatting. Changes will be saved permanently.
                          </p>
                        </div>
                        <textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="flex-1 w-full p-4 border border-calm-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="Enter slide content using Markdown..."
                        />
                        <div className="mt-4 flex justify-between items-center">
                          <span className="text-sm text-calm-500">
                            Preview will update after saving
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={cancelEditing}
                              disabled={isSaving}
                              className="px-4 py-2 text-calm-600 hover:bg-calm-100 rounded-lg transition-colors disabled:opacity-50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={saveSlideContent}
                              disabled={isSaving || !editingContent.trim()}
                              className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                              {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : slideContents[currentSlideIndex] && slideContents[currentSlideIndex].includes('#') ? (
                      <div className="h-full overflow-y-auto">
                        <div className="p-12 prose prose-lg prose-calm max-w-none">
                          <ReactMarkdown 
                            components={{
                              h1: ({children}) => <h1 className="text-4xl font-bold text-calm-900 mb-6 border-b-4 border-primary-500 pb-4">{children}</h1>,
                              h2: ({children}) => <h2 className="text-2xl font-semibold text-calm-800 mb-4 mt-8">{children}</h2>,
                              h3: ({children}) => <h3 className="text-xl font-medium text-calm-700 mb-3 mt-6">{children}</h3>,
                              p: ({children}) => <p className="text-lg text-calm-700 mb-4 leading-relaxed">{children}</p>,
                              strong: ({children}) => <strong className="text-primary-700 font-bold">{children}</strong>,
                              ul: ({children}) => <ul className="text-lg text-calm-700 mb-4 ml-6 space-y-2">{children}</ul>,
                              li: ({children}) => <li className="leading-relaxed">{children}</li>,
                              blockquote: ({children}) => <blockquote className="border-l-4 border-accent-400 bg-accent-50 p-4 my-6 italic text-accent-800 text-xl">{children}</blockquote>
                            }}
                          >
                            {slideContents[currentSlideIndex]}
                          </ReactMarkdown>
                        </div>
                      </div>
                    ) : slideContents[currentSlideIndex]?.match(/\.(png|jpg|jpeg|gif|webp)$/i) ? (
                      <div className="flex items-center justify-center h-full">
                        <img 
                          src={slideContents[currentSlideIndex]} 
                          alt={`Slide ${currentSlideIndex + 1}`}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-calm-500">
                        <div className="text-center">
                          <Presentation size={64} className="mx-auto mb-4 opacity-50" />
                          <p className="text-lg text-calm-700">Slide {currentSlideIndex + 1}</p>
                          <p className="text-sm mt-2 text-calm-500">Week {weekNumber}, Day {dayNumber} Content</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Slide number badge */}
                    <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg text-sm text-calm-700 shadow-md border border-calm-200">
                      {currentSlideIndex + 1} / {content?.slides?.length || 0}
                    </div>
                  </div>
                  
                    {/* Slide Navigation */}
                  <div className="flex items-center justify-center gap-4 mt-4">
                    <button
                      onClick={prevSlide}
                      disabled={currentSlideIndex === 0}
                      className="p-3 rounded-xl bg-calm-200 hover:bg-calm-300 text-calm-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    
                    {/* Slide dots */}
                    <div className="flex gap-1.5">
                      {content?.slides?.slice(0, 12).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentSlideIndex(i)}
                          className={`w-2.5 h-2.5 rounded-full transition-all ${
                            i === currentSlideIndex 
                              ? 'bg-primary-500 scale-125' 
                              : 'bg-calm-300 hover:bg-calm-400'
                          }`}
                        />
                      ))}
                    </div>
                    
                    <button
                      onClick={nextSlide}
                      disabled={currentSlideIndex === (content?.slides?.length || 0) - 1}
                      className="p-3 rounded-xl bg-calm-200 hover:bg-calm-300 text-calm-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              )}

              {contentTab === 'notes' && (
                <div className="prose-calm max-w-none">
                  <ReactMarkdown>{content.trainerNotes}</ReactMarkdown>
                </div>
              )}

              {contentTab === 'activities' && (
                <div className="space-y-4">
                  {content.activities.map((activity, i) => (
                    <div key={activity.id} className="bg-calm-50 rounded-xl p-4 border border-calm-200">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent-100 text-accent-600 flex items-center justify-center font-bold">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-calm-900">{activity.title}</h3>
                          <div className="flex items-center gap-3 text-sm text-calm-500 mt-1">
                            <span className="flex items-center gap-1">
                              <Clock size={14} />
                              {activity.duration}
                            </span>
                            <span className="bg-calm-200 px-2 py-0.5 rounded-full text-xs capitalize text-calm-700">
                              {activity.type}
                            </span>
                          </div>
                          <p className="text-calm-600 text-sm mt-2">{activity.description}</p>
                          {isTrainer && (
                            <p className="text-calm-500 text-sm mt-2 italic border-l-2 border-primary-500 pl-3 bg-primary-50 py-2 pr-3 rounded-r-lg">
                              {activity.instructions}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {contentTab === 'outcomes' && (
                <div className="space-y-3">
                  <p className="text-calm-500 text-sm mb-4">Track learning outcomes for this session:</p>
                  {content.outcomes.map((outcome) => (
                    <button
                      key={outcome.id}
                      onClick={() => toggleOutcome(outcome.id)}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        completedOutcomes.has(outcome.id)
                          ? 'bg-success-50 border-success-300 text-success-700'
                          : 'bg-calm-50 border-calm-200 text-calm-700 hover:border-calm-300 hover:bg-calm-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                          completedOutcomes.has(outcome.id) ? 'bg-success-500 text-white' : 'bg-calm-200'
                        }`}>
                          {completedOutcomes.has(outcome.id) && <Check size={14} />}
                        </div>
                        <span>{outcome.description}</span>
                      </div>
                    </button>
                  ))}
                  <div className="mt-4 p-3 bg-primary-50 rounded-xl text-center border border-primary-200">
                    <span className="text-2xl font-bold text-primary-600">
                      {completedOutcomes.size}/{content.outcomes.length}
                    </span>
                    <span className="text-calm-500 text-sm ml-2">outcomes completed</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Live Classroom Panel */}
        {(viewMode === 'split' || viewMode === 'classroom') && (
          <div className={`${viewMode === 'split' ? 'w-1/2' : 'flex-1'} flex flex-col gap-4`}>
            {/* Screen Share Area - Shows Current Slide */}
            <div className="flex-1 bg-white/90 backdrop-blur-xl rounded-2xl border border-calm-200 shadow-lg flex flex-col overflow-hidden">
              <div className="flex-1 bg-calm-50 m-4 rounded-xl flex flex-col relative border border-calm-200 overflow-hidden">
                {/* LIVE Badge */}
                <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-danger-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-md">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  LIVE
                </div>
                
                {/* Slide Counter Badge */}
                <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-calm-800/80 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-md">
                  <Presentation size={14} />
                  {currentSlideIndex + 1} / {content?.slides.length || 0}
                </div>

                {/* Trainer Camera Preview */}
                <div className="absolute bottom-20 right-4 z-20">
                  {cameraEnabled ? (
                    <div className="relative group">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-40 h-32 rounded-xl border-2 border-white shadow-xl object-cover bg-calm-900"
                        style={{ transform: 'scaleX(-1)' }}
                      />
                      <button
                        onClick={toggleCamera}
                        className="absolute -top-2 -right-2 w-7 h-7 bg-danger-500 hover:bg-danger-600 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Turn off camera"
                      >
                        <VideoOff size={14} />
                      </button>
                      {/* Camera switch button */}
                      <button
                        onClick={() => setShowCameraSelector(!showCameraSelector)}
                        className="absolute -top-2 -left-2 w-7 h-7 bg-calm-700 hover:bg-calm-600 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Switch camera"
                      >
                        <Video size={14} />
                      </button>
                      <div className="absolute bottom-2 left-2 bg-calm-900/70 text-white text-xs px-2 py-0.5 rounded-md">
                        Trainer
                      </div>
                      
                      {/* Camera selector dropdown */}
                      {showCameraSelector && (
                        <div className="absolute bottom-full left-0 mb-2 w-56 bg-white rounded-lg shadow-xl border border-calm-200 overflow-hidden">
                          <div className="px-3 py-2 bg-calm-50 border-b border-calm-200 text-xs font-semibold text-calm-600">
                            Select Camera
                          </div>
                          {availableCameras.map((camera) => (
                            <button
                              key={camera.deviceId}
                              onClick={() => switchCamera(camera.deviceId)}
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-primary-50 transition-colors flex items-center gap-2 ${
                                selectedCameraId === camera.deviceId ? 'bg-primary-100 text-primary-700' : 'text-calm-700'
                              }`}
                            >
                              <Video size={14} />
                              <span className="truncate">{camera.label || `Camera ${availableCameras.indexOf(camera) + 1}`}</span>
                              {selectedCameraId === camera.deviceId && (
                                <Check size={14} className="ml-auto text-primary-600" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="relative">
                      <button
                        onClick={toggleCamera}
                        className="w-40 h-32 rounded-xl border-2 border-dashed border-calm-300 bg-calm-100 hover:bg-calm-200 hover:border-calm-400 flex flex-col items-center justify-center gap-2 transition-all group"
                        title="Turn on camera"
                      >
                        <Video size={24} className="text-calm-400 group-hover:text-calm-600" />
                        <span className="text-xs text-calm-500 group-hover:text-calm-700">Enable Camera</span>
                      </button>
                      
                      {/* Camera selector for when camera is off */}
                      {availableCameras.length > 1 && (
                        <button
                          onClick={() => setShowCameraSelector(!showCameraSelector)}
                          className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xs text-calm-500 hover:text-calm-700 underline"
                        >
                          Change camera
                        </button>
                      )}
                      
                      {showCameraSelector && (
                        <div className="absolute bottom-full left-0 mb-2 w-56 bg-white rounded-lg shadow-xl border border-calm-200 overflow-hidden">
                          <div className="px-3 py-2 bg-calm-50 border-b border-calm-200 text-xs font-semibold text-calm-600">
                            Select Camera
                          </div>
                          {availableCameras.map((camera) => (
                            <button
                              key={camera.deviceId}
                              onClick={() => switchCamera(camera.deviceId)}
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-primary-50 transition-colors flex items-center gap-2 ${
                                selectedCameraId === camera.deviceId ? 'bg-primary-100 text-primary-700' : 'text-calm-700'
                              }`}
                            >
                              <Video size={14} />
                              <span className="truncate">{camera.label || `Camera ${availableCameras.indexOf(camera) + 1}`}</span>
                              {selectedCameraId === camera.deviceId && (
                                <Check size={14} className="ml-auto text-primary-600" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Live Slide Content */}
                <div className="flex-1 p-8 pt-16 overflow-auto">
                  {slideContents[currentSlideIndex] ? (
                    <div className="prose prose-lg max-w-none">
                      <ReactMarkdown
                        components={{
                          h1: ({ children }) => (
                            <h1 className="text-2xl font-bold text-calm-900 mb-4 pb-3 border-b-4 border-primary-500">{children}</h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-xl font-semibold text-calm-800 mt-6 mb-3">{children}</h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-lg font-medium text-calm-700 mt-4 mb-2">{children}</h3>
                          ),
                          p: ({ children }) => (
                            <p className="text-calm-600 mb-4 leading-relaxed">{children}</p>
                          ),
                          ul: ({ children }) => (
                            <ul className="space-y-2 mb-4">{children}</ul>
                          ),
                          li: ({ children }) => (
                            <li className="flex items-start gap-2 text-calm-600">
                              <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 shrink-0" />
                              <span>{children}</span>
                            </li>
                          ),
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-primary-400 bg-primary-50 pl-4 py-3 my-4 rounded-r-lg italic text-calm-700">
                              {children}
                            </blockquote>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-semibold text-calm-900">{children}</strong>
                          ),
                        }}
                      >
                        {slideContents[currentSlideIndex]}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="text-center text-calm-500 flex flex-col items-center justify-center h-full">
                      <Monitor size={64} className="mx-auto mb-4 opacity-50" />
                      <p className="text-lg text-calm-700">Waiting for presentation...</p>
                      <p className="text-sm mt-2 text-calm-500">The slide content will appear here</p>
                    </div>
                  )}
                </div>

                {/* Navigation Controls at Bottom */}
                <div className="p-4 bg-calm-100 border-t border-calm-200 flex items-center justify-center gap-4">
                  <button
                    onClick={prevSlide}
                    disabled={currentSlideIndex === 0}
                    className="p-2 rounded-lg bg-white border border-calm-300 text-calm-600 hover:bg-calm-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  
                  {/* Slide Dots */}
                  <div className="flex items-center gap-1.5">
                    {content?.slides.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentSlideIndex(index)}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${
                          index === currentSlideIndex 
                            ? 'bg-primary-500 w-6' 
                            : 'bg-calm-300 hover:bg-calm-400'
                        }`}
                      />
                    ))}
                  </div>
                  
                  <button
                    onClick={nextSlide}
                    disabled={currentSlideIndex === (content?.slides.length || 1) - 1}
                    className="p-2 rounded-lg bg-white border border-calm-300 text-calm-600 hover:bg-calm-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Support Button - For Trainees */}
            {!isTrainer && (
              <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-calm-200 shadow-lg p-4">
                {!mySupport.active ? (
                  <button
                    onClick={requestSupport}
                    className="w-full py-4 bg-gradient-to-r from-warning-500 to-orange-500 hover:from-warning-400 hover:to-orange-400 text-white rounded-xl font-semibold text-lg flex items-center justify-center gap-3 transition-all shadow-lg shadow-warning-500/25"
                  >
                    <Hand size={24} />
                    I need help / support
                  </button>
                ) : (
                  <div className="text-center py-4">
                    <div className="flex items-center justify-center gap-3 text-lg font-semibold mb-2">
                      {mySupport.acknowledged ? (
                        <>
                          <CheckCircle size={24} className="text-success-500" />
                          <span className="text-success-700">Trainer has seen your request!</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={24} className="text-warning-500 animate-pulse" />
                          <span className="text-warning-700">Support request sent...</span>
                        </>
                      )}
                    </div>
                    <button
                      onClick={cancelSupport}
                      className="text-sm text-calm-500 hover:text-calm-700 underline"
                    >
                      Cancel request
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Support Requests - For Trainers */}
            {isTrainer && supportRequests.length > 0 && (
              <div className="bg-warning-50 backdrop-blur-xl rounded-2xl border border-warning-300 p-4">
                <h3 className="font-semibold text-warning-700 mb-2 flex items-center gap-2">
                  <Hand size={18} />
                  Support Requests ({supportRequests.length})
                </h3>
                {/* List support requests here */}
              </div>
            )}
          </div>
        )}

        {/* Participants & Chat Panel */}
        {showChat && (
          <div className="w-80 bg-white/90 backdrop-blur-xl rounded-2xl border border-calm-200 shadow-lg flex flex-col overflow-hidden">
            {/* Participants Grid */}
            <div className="border-b border-calm-200">
              <div className="flex items-center justify-between px-4 py-2 bg-calm-50">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-primary-500" />
                  <span className="font-semibold text-calm-900 text-sm">Participants</span>
                </div>
                <span className="text-xs text-calm-500 bg-success-100 text-success-700 px-2 py-0.5 rounded-full">
                  {participants.filter(p => p.isOnline && p.id !== '1').length} online
                </span>
              </div>
              
              {/* Participant Grid - Excludes trainer (shown on live screen) */}
              <div className="p-2 grid grid-cols-5 gap-1.5">
                {participants.filter(p => p.id !== '1').map((participant) => (
                  <div
                    key={participant.id}
                    className="relative group"
                    title={participant.name}
                  >
                    <div className={`w-12 h-12 rounded-lg ${participant.color} flex items-center justify-center text-white font-semibold text-sm shadow-sm ${
                      !participant.isOnline ? 'opacity-40 grayscale' : ''
                    }`}>
                      {participant.initials}
                    </div>
                    {/* Online indicator */}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                      participant.isOnline ? 'bg-success-500' : 'bg-calm-400'
                    }`} />
                    {/* Mute indicator */}
                    {participant.isMuted && participant.isOnline && (
                      <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-danger-500 rounded-full flex items-center justify-center">
                        <VolumeX size={10} className="text-white" />
                      </div>
                    )}
                    {/* Hover tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-calm-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      {participant.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-calm-200 bg-calm-50">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-primary-500" />
                <span className="font-semibold text-calm-900 text-sm">Session Chat</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-calm-50 min-h-[150px]">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-lg p-2 ${
                    msg.senderType === 'trainer'
                      ? 'bg-primary-100 border-l-3 border-primary-500'
                      : msg.senderName === 'You'
                      ? 'bg-accent-100 ml-4'
                      : 'bg-white border border-calm-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className={`font-medium ${
                      msg.senderType === 'trainer' ? 'text-primary-700' : 'text-calm-700'
                    }`}>
                      {msg.senderName}
                      {msg.senderType === 'trainer' && ' 🎓'}
                    </span>
                    <span className="text-calm-400 text-[10px]">{formatTime(msg.timestamp)}</span>
                  </div>
                  <p className="text-sm text-calm-800">{msg.message}</p>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-2 border-t border-calm-200 bg-white">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-calm-50 border border-calm-200 rounded-lg px-3 py-2 text-sm text-calm-900 placeholder:text-calm-400 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="p-2 bg-primary-500 hover:bg-primary-600 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="fixed bottom-4 left-4 text-xs text-calm-600 bg-white/90 backdrop-blur shadow-md border border-calm-200 px-3 py-2 rounded-lg">
        <span className="text-calm-500">Shortcuts:</span> ← → Navigate slides • 1 2 3 Change view • F Fullscreen
      </div>

      {/* Recording Controls Panel - Trainer Only */}
      {isTrainer && showRecordingControls && (
        <div className="fixed bottom-4 right-4 z-50">
          <RecordingControls
            weekNumber={weekNumber}
            dayNumber={dayNumber}
            cohortId="default-cohort"
            onRecordingStart={handleRecordingStart}
            onRecordingPause={handleRecordingPause}
            onRecordingResume={handleRecordingResume}
            onRecordingStop={handleRecordingStop}
            onClose={() => setShowRecordingControls(false)}
          />
        </div>
      )}
    </div>
  );
}

// Helper functions for demo content
function getDayTitle(week: number, day: number): string {
  const dayData: Record<number, string[]> = {
    1: ['Welcome & Introduction', 'Assessment & Support Mapping', 'Confidence, Communication & Voice', 'Expectations, Boundaries & Pacing'],
    2: ['Skills Foundation', 'Communication Skills', 'Problem-Solving & Critical Thinking', 'Time Management & Organization'],
    3: ['Leadership & Influence', 'Project Management Basics', 'Digital Skills & Technology', 'Career Planning & Next Steps'],
    4: ['Critical Thinking', 'Creative Problem Solving', 'Decision Making', 'Innovation Workshop'],
    5: ['CV Building', 'Job Searching', 'Interview Skills', 'Personal Branding'],
    6: ['Project Planning', 'Project Development', 'Presentation Prep', 'Graduation & Next Steps'],
  };
  return dayData[week]?.[day - 1] || `Day ${day}`;
}

function getDayOverview(week: number, day: number): string {
  const dayFocuses: Record<number, string[]> = {
    1: ['Getting to know each other and the programme', 'Understanding assessment vs testing, mapping support strategies', 'Rebuilding confidence, understanding communication styles, finding your voice', 'Setting healthy expectations, understanding boundaries, learning sustainable pacing'],
    2: ['Building practical skills foundation and assessment', 'Professional communication framework and practice', 'Structured problem-solving and analytical thinking', 'Time management techniques and organizational skills'],
    3: ['Leadership principles and influence techniques', 'Project management fundamentals and tools', 'Digital skills and technology proficiency', 'Career planning and professional development'],
    4: ['Analyzing information effectively', 'Generating creative solutions', 'Making informed decisions', 'Putting skills into practice'],
    5: ['Creating an effective CV', 'Finding opportunities', 'Preparing for interviews', 'Building your professional presence'],
    6: ['Planning your final project', 'Building and refining', 'Preparing your presentation', 'Celebrating and looking forward'],
  };
  return dayFocuses[week]?.[day - 1] || '';
}

function getTrainerNotes(week: number, day: number): string {
  return `# Week ${week}, Day ${day} Trainer Notes

## Session Overview
This is day ${day} of week ${week}. Today's focus is on ${getDayTitle(week, day).toLowerCase()}.

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

function getActivities(week: number, day: number): Activity[] {
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
      instructions: 'Guide trainees through the practical exercise. Demonstrate first, then let them try.',
    },
    {
      id: `w${week}d${day}-act3`,
      title: 'Group Discussion',
      duration: '25 mins',
      type: 'discussion',
      description: 'Reflect on learning and share experiences',
      instructions: 'Facilitate discussion using open questions. Ensure everyone has a chance to contribute.',
    },
    {
      id: `w${week}d${day}-act4`,
      title: 'Practice Exercise',
      duration: '25 mins',
      type: 'individual',
      description: 'Individual practice to reinforce learning',
      instructions: 'Give clear instructions. Be available for questions but encourage independent work.',
    },
    {
      id: `w${week}d${day}-act5`,
      title: 'Wrap-up & Preview',
      duration: '10 mins',
      type: 'group',
      description: 'Summarize key points and preview next session',
      instructions: 'Recap the main takeaways. Answer any final questions. Preview what\'s coming next.',
    },
  ];
}

function getOutcomes(week: number, day: number): Outcome[] {
  return [
    { id: `w${week}d${day}-out1`, description: 'Trainee understands the day\'s key concepts' },
    { id: `w${week}d${day}-out2`, description: 'Practical skills demonstrated successfully' },
    { id: `w${week}d${day}-out3`, description: 'Participated actively in group activities' },
    { id: `w${week}d${day}-out4`, description: 'Completed individual practice exercise' },
    { id: `w${week}d${day}-out5`, description: 'Questions addressed and understanding confirmed' },
  ];
}
