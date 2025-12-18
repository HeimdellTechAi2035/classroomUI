import { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  Search,
  ChevronRight,
  Shield,
  ScrollText,
  Heart,
  Users,
  Building,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Policy {
  id: string;
  title: string;
  category: 'safeguarding' | 'health-safety' | 'conduct' | 'data' | 'equality';
  summary: string;
  content: string;
  version: string;
  lastUpdated: string;
  requiresAcknowledgement: boolean;
  acknowledgedAt?: string;
}

const categoryConfig = {
  'safeguarding': { icon: Shield, color: 'text-red-500 bg-red-100', label: 'Safeguarding' },
  'health-safety': { icon: Heart, color: 'text-orange-500 bg-orange-100', label: 'Health & Safety' },
  'conduct': { icon: Users, color: 'text-blue-500 bg-blue-100', label: 'Code of Conduct' },
  'data': { icon: ScrollText, color: 'text-purple-500 bg-purple-100', label: 'Data Protection' },
  'equality': { icon: Building, color: 'text-green-500 bg-green-100', label: 'Equality & Diversity' },
};

export default function Policies() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [showAcknowledgeModal, setShowAcknowledgeModal] = useState(false);
  const [acknowledgeName, setAcknowledgeName] = useState('');

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    if (window.electronAPI) {
      try {
        const data = await window.electronAPI.content.getPolicies() as Policy[];
        // Get acknowledgement status
        for (const policy of data) {
          const ack = await window.electronAPI.db.get(
            'acknowledgements',
            `SELECT acknowledged_at FROM acknowledgements WHERE policy_id = ? ORDER BY acknowledged_at DESC LIMIT 1`,
            [policy.id]
          ) as { acknowledged_at: string } | undefined;
          if (ack) {
            policy.acknowledgedAt = ack.acknowledged_at;
          }
        }
        setPolicies(data);
      } catch (error) {
        console.error('Failed to load policies:', error);
      }
    } else {
      // Demo data
      setPolicies([
        {
          id: 'safeguarding-001',
          title: 'Safeguarding Policy',
          category: 'safeguarding',
          summary: 'Our commitment to protecting vulnerable adults in our training programmes.',
          content: `# Safeguarding Policy

## Purpose
This policy outlines RemoteAbility CIC's commitment to safeguarding all participants in our training programmes.

## Scope
This policy applies to all staff, volunteers, and trainees.

## Key Principles
1. The welfare of trainees is paramount
2. All trainees have the right to feel safe
3. Concerns must be reported immediately
4. Confidentiality will be maintained appropriately

## Reporting Concerns
If you have safeguarding concerns:
1. Contact the designated safeguarding lead immediately
2. Document what you observed
3. Do not investigate yourself
4. Maintain confidentiality

## Contact
Safeguarding Lead: safeguarding@remoteability.org`,
          version: '2.1',
          lastUpdated: '2024-01-15',
          requiresAcknowledgement: true,
        },
        {
          id: 'health-safety-001',
          title: 'Health & Safety Policy',
          category: 'health-safety',
          summary: 'Guidelines for maintaining health and safety during remote training sessions.',
          content: `# Health & Safety Policy

## Remote Working Safety
- Take regular breaks every 45 minutes
- Ensure your workspace is ergonomically set up
- Report any discomfort or strain

## Emergency Procedures
- Know your emergency contacts
- Have a safe exit route from your workspace
- Keep emergency numbers accessible`,
          version: '1.5',
          lastUpdated: '2024-02-01',
          requiresAcknowledgement: true,
        },
        {
          id: 'conduct-001',
          title: 'Code of Conduct',
          category: 'conduct',
          summary: 'Expected behaviour standards for all participants in RemoteAbility programmes.',
          content: `# Code of Conduct

## Our Standards
- Treat everyone with respect
- Be supportive of fellow trainees
- Maintain professionalism in all interactions
- Be punctual for sessions

## Online Conduct
- Keep cameras on when possible
- Mute when not speaking
- Use appropriate language
- Be patient with technical issues`,
          version: '1.2',
          lastUpdated: '2024-01-20',
          requiresAcknowledgement: true,
        },
        {
          id: 'data-001',
          title: 'Data Protection Policy',
          category: 'data',
          summary: 'How we collect, store, and protect your personal information.',
          content: `# Data Protection Policy

## What Data We Collect
- Name and contact details
- Attendance and progress records
- Assessment results

## How We Use Your Data
- To deliver training effectively
- To track your progress
- To provide appropriate support

## Your Rights
- Access your data at any time
- Request corrections
- Request deletion (where applicable)`,
          version: '3.0',
          lastUpdated: '2024-03-01',
          requiresAcknowledgement: true,
        },
        {
          id: 'equality-001',
          title: 'Equality & Diversity Policy',
          category: 'equality',
          summary: 'Our commitment to equality, diversity, and inclusion.',
          content: `# Equality & Diversity Policy

## Our Commitment
RemoteAbility CIC is committed to promoting equality and diversity in all our activities.

## Key Principles
- Equal opportunities for all
- Celebrating diversity
- Zero tolerance for discrimination
- Reasonable adjustments provided

## Reporting Discrimination
If you experience or witness discrimination, please report it to your trainer or use our confidential reporting system.`,
          version: '1.8',
          lastUpdated: '2024-02-15',
          requiresAcknowledgement: false,
        },
      ]);
    }
    setLoading(false);
  };

  const acknowledgePolicy = async () => {
    if (!selectedPolicy || !acknowledgeName.trim()) return;

    const timestamp = new Date().toISOString();

    if (window.electronAPI) {
      await window.electronAPI.db.run(
        'acknowledgements',
        `INSERT INTO acknowledgements (policy_id, trainee_name, acknowledged_at)
         VALUES (?, ?, ?)`,
        [selectedPolicy.id, acknowledgeName.trim(), timestamp]
      );
    }

    // Update local state
    setPolicies(policies.map(p => 
      p.id === selectedPolicy.id 
        ? { ...p, acknowledgedAt: timestamp }
        : p
    ));
    setSelectedPolicy({ ...selectedPolicy, acknowledgedAt: timestamp });
    setShowAcknowledgeModal(false);
    setAcknowledgeName('');
  };

  const filteredPolicies = policies.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.summary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingCount = policies.filter(p => p.requiresAcknowledgement && !p.acknowledgedAt).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-calm-500">Loading policies...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-calm-900">Policies & Procedures</h1>
          <p className="text-calm-600 mt-1">Important documents for your training programme</p>
        </div>
        {pendingCount > 0 && (
          <div className="badge badge-warning text-sm py-2">
            <AlertTriangle size={16} className="mr-1" />
            {pendingCount} policy{pendingCount !== 1 ? 'ies' : 'y'} require{pendingCount === 1 ? 's' : ''} acknowledgement
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-calm-400" size={20} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search policies..."
          className="input-field pl-10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Policy List */}
        <div className="lg:col-span-1 space-y-3">
          {filteredPolicies.map((policy) => {
            const config = categoryConfig[policy.category];
            const Icon = config.icon;
            
            return (
              <button
                key={policy.id}
                onClick={() => setSelectedPolicy(policy)}
                className={`w-full text-left card hover:shadow-md transition-shadow ${
                  selectedPolicy?.id === policy.id ? 'ring-2 ring-primary-500' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${config.color}`}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-calm-800 truncate">{policy.title}</h3>
                      {policy.requiresAcknowledgement && (
                        policy.acknowledgedAt ? (
                          <CheckCircle size={16} className="text-success-500 shrink-0" />
                        ) : (
                          <AlertTriangle size={16} className="text-warning-500 shrink-0" />
                        )
                      )}
                    </div>
                    <p className="text-sm text-calm-500 truncate">{policy.summary}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-calm-400">
                      <span>v{policy.version}</span>
                      <span>•</span>
                      <span>{new Date(policy.lastUpdated).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <ChevronRight className="text-calm-400 shrink-0" size={20} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Policy Content */}
        <div className="lg:col-span-2">
          {selectedPolicy ? (
            <div className="card sticky top-4">
              {/* Policy Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  {(() => {
                    const config = categoryConfig[selectedPolicy.category];
                    const Icon = config.icon;
                    return (
                      <div className={`p-3 rounded-lg ${config.color}`}>
                        <Icon size={24} />
                      </div>
                    );
                  })()}
                  <div>
                    <h2 className="text-xl font-bold text-calm-900">{selectedPolicy.title}</h2>
                    <div className="flex items-center gap-3 mt-1 text-sm text-calm-500">
                      <span>Version {selectedPolicy.version}</span>
                      <span>•</span>
                      <span>Updated {new Date(selectedPolicy.lastUpdated).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Acknowledgement Status */}
              {selectedPolicy.requiresAcknowledgement && (
                <div className={`p-4 rounded-lg mb-6 ${
                  selectedPolicy.acknowledgedAt
                    ? 'bg-success-50 border border-success-200'
                    : 'bg-warning-50 border border-warning-200'
                }`}>
                  {selectedPolicy.acknowledgedAt ? (
                    <div className="flex items-center gap-2 text-success-700">
                      <CheckCircle size={20} />
                      <span>
                        Acknowledged on {new Date(selectedPolicy.acknowledgedAt).toLocaleDateString()}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-warning-700">
                        <AlertTriangle size={20} />
                        <span>This policy requires your acknowledgement</span>
                      </div>
                      <button
                        onClick={() => setShowAcknowledgeModal(true)}
                        className="btn btn-primary"
                      >
                        Acknowledge
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Policy Content */}
              <div className="prose prose-calm max-w-none">
                <ReactMarkdown>{selectedPolicy.content}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="card text-center py-12">
              <FileText size={48} className="mx-auto text-calm-300 mb-4" />
              <p className="text-calm-600">Select a policy to view its content</p>
            </div>
          )}
        </div>
      </div>

      {/* Acknowledgement Modal */}
      {showAcknowledgeModal && selectedPolicy && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-calm-900 mb-2">Acknowledge Policy</h3>
            <p className="text-calm-600 mb-4">
              By acknowledging this policy, you confirm that you have read and understood the {selectedPolicy.title}.
            </p>
            
            <div className="mb-4">
              <label className="label">Your Full Name</label>
              <input
                type="text"
                value={acknowledgeName}
                onChange={(e) => setAcknowledgeName(e.target.value)}
                placeholder="Enter your full name"
                className="input-field"
              />
            </div>

            <div className="bg-calm-50 rounded-lg p-3 mb-4 text-sm text-calm-600">
              <p className="font-medium mb-1">By clicking "I Acknowledge", I confirm:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>I have read this policy in full</li>
                <li>I understand its contents</li>
                <li>I agree to comply with it</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAcknowledgeModal(false);
                  setAcknowledgeName('');
                }}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={acknowledgePolicy}
                disabled={!acknowledgeName.trim()}
                className="btn btn-primary flex-1"
              >
                I Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
