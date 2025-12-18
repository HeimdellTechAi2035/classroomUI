import { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Shield,
  AlertTriangle,
  CheckCircle,
  X,
  Eye,
  EyeOff,
  Calendar,
  FileText,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';

interface Trainee {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  cohortId: string;
  cohortName?: string;
  enrolledAt: string;
  status: 'active' | 'completed' | 'withdrawn' | 'paused';
  accessibilityNeeds?: string;
  emergencyContact?: string;
  notes?: string;
  hasFlag?: boolean;
  flagType?: string;
}

interface Cohort {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
  traineeCount: number;
}

interface Trainer {
  id: string;
  name: string;
  email: string;
  role: 'lead' | 'assistant' | 'observer';
  createdAt: string;
}

type TabType = 'trainees' | 'cohorts' | 'trainers';

export default function People() {
  const [activeTab, setActiveTab] = useState<TabType>('trainees');
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCohort, setFilterCohort] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'trainee' | 'cohort' | 'trainer'>('trainee');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showSensitive, setShowSensitive] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (window.electronAPI) {
      try {
        const [traineeData, cohortData, trainerData] = await Promise.all([
          window.electronAPI.db.query('trainees', 'SELECT t.*, c.name as cohortName FROM trainees t LEFT JOIN cohorts c ON t.cohort_id = c.id'),
          window.electronAPI.db.query('cohorts', 'SELECT c.*, COUNT(t.id) as traineeCount FROM cohorts c LEFT JOIN trainees t ON c.id = t.cohort_id GROUP BY c.id'),
          window.electronAPI.db.query('users', 'SELECT * FROM users WHERE role != "admin"'),
        ]);
        setTrainees(traineeData as Trainee[]);
        setCohorts(cohortData as Cohort[]);
        setTrainers(trainerData as Trainer[]);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    } else {
      // Demo data
      setTrainees([
        { id: '1', name: 'Alex Thompson', email: 'alex@example.com', phone: '07700 900001', cohortId: '1', cohortName: 'January 2024', enrolledAt: '2024-01-08', status: 'active', accessibilityNeeds: 'Screen reader support', hasFlag: true, flagType: 'support' },
        { id: '2', name: 'Jordan Smith', email: 'jordan@example.com', cohortId: '1', cohortName: 'January 2024', enrolledAt: '2024-01-08', status: 'active' },
        { id: '3', name: 'Taylor Williams', email: 'taylor@example.com', cohortId: '1', cohortName: 'January 2024', enrolledAt: '2024-01-08', status: 'active', accessibilityNeeds: 'Larger text, frequent breaks' },
        { id: '4', name: 'Morgan Davis', email: 'morgan@example.com', cohortId: '2', cohortName: 'March 2024', enrolledAt: '2024-03-04', status: 'active' },
        { id: '5', name: 'Casey Brown', email: 'casey@example.com', cohortId: '1', cohortName: 'January 2024', enrolledAt: '2024-01-08', status: 'withdrawn', notes: 'Personal circumstances' },
      ]);
      setCohorts([
        { id: '1', name: 'January 2024', startDate: '2024-01-08', endDate: '2024-02-19', traineeCount: 4 },
        { id: '2', name: 'March 2024', startDate: '2024-03-04', traineeCount: 1 },
      ]);
      setTrainers([
        { id: '1', name: 'Sarah Johnson', email: 'sarah@remoteability.org', role: 'lead', createdAt: '2023-12-01' },
        { id: '2', name: 'Mike Chen', email: 'mike@remoteability.org', role: 'assistant', createdAt: '2024-01-01' },
      ]);
    }
    setLoading(false);
  };

  const filteredTrainees = trainees.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCohort = filterCohort === 'all' || t.cohortId === filterCohort;
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchesSearch && matchesCohort && matchesStatus;
  });

  const openAddModal = (type: 'trainee' | 'cohort' | 'trainer') => {
    setModalType(type);
    setEditingItem(null);
    setShowModal(true);
  };

  const openEditModal = (type: 'trainee' | 'cohort' | 'trainer', item: any) => {
    setModalType(type);
    setEditingItem(item);
    setShowModal(true);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'badge-success',
      completed: 'badge-primary',
      withdrawn: 'bg-calm-200 text-calm-600',
      paused: 'badge-warning',
    };
    return styles[status as keyof typeof styles] || 'bg-calm-100 text-calm-600';
  };

  const getRoleBadge = (role: string) => {
    const styles = {
      lead: 'badge-primary',
      assistant: 'badge-success',
      observer: 'bg-calm-100 text-calm-600',
    };
    return styles[role as keyof typeof styles] || 'bg-calm-100 text-calm-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-calm-500">Loading people data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-calm-900">People</h1>
          <p className="text-calm-600 mt-1">Manage trainees, cohorts, and trainers</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-calm-200">
        <div className="flex gap-1">
          {[
            { id: 'trainees' as const, label: 'Trainees', count: trainees.length },
            { id: 'cohorts' as const, label: 'Cohorts', count: cohorts.length },
            { id: 'trainers' as const, label: 'Trainers', count: trainers.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-calm-600 hover:text-calm-800'
              }`}
            >
              {tab.label}
              <span className="badge bg-calm-100 text-calm-600">{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Trainees Tab */}
      {activeTab === 'trainees' && (
        <>
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-calm-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search trainees..."
                className="input-field pl-10"
              />
            </div>
            <select
              value={filterCohort}
              onChange={(e) => setFilterCohort(e.target.value)}
              className="input-field"
            >
              <option value="all">All Cohorts</option>
              {cohorts.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-field"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="withdrawn">Withdrawn</option>
              <option value="paused">Paused</option>
            </select>
            <button onClick={() => openAddModal('trainee')} className="btn btn-primary">
              <UserPlus size={18} className="mr-1" />
              Add Trainee
            </button>
          </div>

          {/* Sensitive Data Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSensitive(!showSensitive)}
              className={`flex items-center gap-2 text-sm ${showSensitive ? 'text-warning-600' : 'text-calm-500'}`}
            >
              {showSensitive ? <Eye size={16} /> : <EyeOff size={16} />}
              {showSensitive ? 'Sensitive data visible' : 'Show sensitive data'}
            </button>
          </div>

          {/* Trainees List */}
          <div className="space-y-3">
            {filteredTrainees.map((trainee) => (
              <div key={trainee.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-semibold text-lg shrink-0">
                    {trainee.name.charAt(0)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-calm-800">{trainee.name}</h3>
                      <span className={`badge ${getStatusBadge(trainee.status)}`}>{trainee.status}</span>
                      {trainee.hasFlag && (
                        <span className="badge badge-warning">
                          <AlertTriangle size={12} className="mr-1" />
                          Needs support
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-calm-500">
                      {trainee.email && (
                        <span className="flex items-center gap-1">
                          <Mail size={14} />
                          {showSensitive ? trainee.email : '••••@••••.com'}
                        </span>
                      )}
                      {trainee.phone && showSensitive && (
                        <span className="flex items-center gap-1">
                          <Phone size={14} />
                          {trainee.phone}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users size={14} />
                        {trainee.cohortName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        Enrolled {new Date(trainee.enrolledAt).toLocaleDateString()}
                      </span>
                    </div>

                    {trainee.accessibilityNeeds && (
                      <div className="mt-2 text-sm bg-primary-50 text-primary-700 px-2 py-1 rounded inline-block">
                        <Shield size={12} className="inline mr-1" />
                        {trainee.accessibilityNeeds}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal('trainee', trainee)}
                      className="p-2 hover:bg-calm-100 rounded-lg text-calm-500"
                    >
                      <Edit2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredTrainees.length === 0 && (
              <div className="card text-center py-12">
                <Users size={48} className="mx-auto text-calm-300 mb-4" />
                <p className="text-calm-600">No trainees found</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Cohorts Tab */}
      {activeTab === 'cohorts' && (
        <>
          <div className="flex justify-end">
            <button onClick={() => openAddModal('cohort')} className="btn btn-primary">
              <UserPlus size={18} className="mr-1" />
              Add Cohort
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cohorts.map((cohort) => (
              <div key={cohort.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-calm-800 text-lg">{cohort.name}</h3>
                    <p className="text-sm text-calm-500 mt-1">
                      Started {new Date(cohort.startDate).toLocaleDateString()}
                    </p>
                    {cohort.endDate && (
                      <p className="text-sm text-calm-500">
                        Ends {new Date(cohort.endDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => openEditModal('cohort', cohort)}
                    className="p-2 hover:bg-calm-100 rounded-lg text-calm-500"
                  >
                    <Edit2 size={18} />
                  </button>
                </div>
                
                <div className="mt-4 pt-4 border-t border-calm-100 flex items-center justify-between">
                  <span className="text-calm-600">
                    <Users size={16} className="inline mr-1" />
                    {cohort.traineeCount} trainee{cohort.traineeCount !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={() => {
                      setActiveTab('trainees');
                      setFilterCohort(cohort.id);
                    }}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    View →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Trainers Tab */}
      {activeTab === 'trainers' && (
        <>
          <div className="flex justify-end">
            <button onClick={() => openAddModal('trainer')} className="btn btn-primary">
              <UserPlus size={18} className="mr-1" />
              Add Trainer
            </button>
          </div>

          <div className="space-y-3">
            {trainers.map((trainer) => (
              <div key={trainer.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-success-100 text-success-600 flex items-center justify-center font-semibold text-lg shrink-0">
                    {trainer.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-calm-800">{trainer.name}</h3>
                      <span className={`badge ${getRoleBadge(trainer.role)}`}>{trainer.role}</span>
                    </div>
                    <p className="text-sm text-calm-500">{trainer.email}</p>
                  </div>
                  <button
                    onClick={() => openEditModal('trainer', trainer)}
                    className="p-2 hover:bg-calm-100 rounded-lg text-calm-500"
                  >
                    <Edit2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add/Edit Modal (placeholder) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-calm-900">
                {editingItem ? 'Edit' : 'Add'} {modalType.charAt(0).toUpperCase() + modalType.slice(1)}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-calm-400 hover:text-calm-600">
                <X size={24} />
              </button>
            </div>
            
            <p className="text-calm-600 mb-4">
              Form fields for {modalType} would go here...
            </p>

            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">
                Cancel
              </button>
              <button onClick={() => setShowModal(false)} className="btn btn-primary flex-1">
                {editingItem ? 'Save' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
