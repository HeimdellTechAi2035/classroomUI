import { useState } from 'react';
import { Sparkles, Send, Lightbulb, MessageSquare, Users, ListChecks, RefreshCw } from 'lucide-react';

interface AIHelperPanelProps {
  mode: 'trainer' | 'trainee';
  sessionContext?: {
    weekNumber: number;
    cohortName?: string;
  };
}

const trainerPrompts = [
  { icon: Lightbulb, label: 'Explain this simply', prompt: 'Help me explain this concept in simpler terms' },
  { icon: MessageSquare, label: 'Give an example', prompt: 'Give me a practical example for this topic' },
  { icon: Users, label: 'Roleplay a call', prompt: 'Create a roleplay scenario for a customer service call' },
  { icon: RefreshCw, label: 'Summarise session', prompt: 'Summarise the key points we covered today' },
  { icon: ListChecks, label: 'Follow-up tasks', prompt: 'Suggest follow-up tasks for trainees' },
];

const traineePrompts = [
  { icon: Lightbulb, label: 'Explain this', prompt: 'Can you explain this concept to me?' },
  { icon: MessageSquare, label: 'Give me an example', prompt: 'Can you give me an example?' },
  { icon: RefreshCw, label: 'Summarise', prompt: 'Can you summarise what we learned?' },
];

export default function AIHelperPanel({ mode, sessionContext }: AIHelperPanelProps) {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prompts = mode === 'trainer' ? trainerPrompts : traineePrompts;

  const handleSubmit = async (prompt: string) => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.ai.query(prompt, sessionContext);
        setResponse(result);
      } else {
        // Demo response for development
        setResponse(`This is a demo response for: "${prompt}"\n\nIn the full application, this would connect to an AI API (when configured) to provide helpful responses based on the training content and context.`);
      }
    } catch (err) {
      setError('Failed to get AI response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setQuery(prompt);
    handleSubmit(prompt);
  };

  return (
    <div className="mt-4 space-y-4">
      {/* Quick Prompts */}
      <div className="flex flex-wrap gap-2">
        {prompts.map(({ icon: Icon, label, prompt }) => (
          <button
            key={label}
            onClick={() => handleQuickPrompt(prompt)}
            className="btn-secondary text-xs"
            disabled={isLoading}
          >
            <Icon size={14} className="mr-1" />
            {label}
          </button>
        ))}
      </div>

      {/* Custom Query */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit(query)}
          placeholder="Ask AI for help..."
          className="input flex-1 text-sm"
          disabled={isLoading}
        />
        <button
          onClick={() => handleSubmit(query)}
          disabled={isLoading || !query.trim()}
          className="btn-primary"
        >
          {isLoading ? (
            <RefreshCw size={18} className="animate-spin" />
          ) : (
            <Send size={18} />
          )}
        </button>
      </div>

      {/* Response */}
      {response && (
        <div className="p-4 bg-primary-50 rounded-lg">
          <div className="flex items-start gap-2">
            <Sparkles size={18} className="text-primary-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-calm-700 whitespace-pre-wrap">
              {response}
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 bg-danger-50 rounded-lg text-sm text-danger-700">
          {error}
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-calm-500">
        {mode === 'trainee' 
          ? 'AI responses are for guidance only. For policy questions, please refer to the official policy documents.'
          : 'AI suggestions are based on training context. Always verify important information.'}
      </p>
    </div>
  );
}
