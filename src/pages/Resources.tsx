import { useState, useEffect } from 'react';
import {
  Search,
  FileText,
  Image,
  Video,
  Link as LinkIcon,
  Download,
  ExternalLink,
  FolderOpen,
  Filter,
  Grid,
  List,
} from 'lucide-react';

interface Resource {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'video' | 'link' | 'document' | 'other';
  category: string;
  description?: string;
  path: string;
  size?: string;
  week?: number;
  addedAt: string;
}

const typeIcons = {
  pdf: FileText,
  document: FileText,
  image: Image,
  video: Video,
  link: LinkIcon,
  other: FileText,
};

const typeColors = {
  pdf: 'text-red-500 bg-red-100',
  document: 'text-blue-500 bg-blue-100',
  image: 'text-green-500 bg-green-100',
  video: 'text-purple-500 bg-purple-100',
  link: 'text-orange-500 bg-orange-100',
  other: 'text-calm-500 bg-calm-100',
};

export default function Resources() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    if (window.electronAPI) {
      try {
        const data = await window.electronAPI.db.query(
          'resources',
          `SELECT * FROM resources ORDER BY added_at DESC`
        ) as Resource[];
        setResources(data);
      } catch (error) {
        console.error('Failed to load resources:', error);
      }
    } else {
      // Demo data
      setResources([
        { id: '1', name: 'Welcome Pack', type: 'pdf', category: 'Onboarding', description: 'Introduction to RemoteAbility programmes', path: '/resources/welcome.pdf', size: '2.4 MB', week: 1, addedAt: '2024-01-15' },
        { id: '2', name: 'Assessment Form Template', type: 'document', category: 'Assessment', description: 'Initial skills assessment template', path: '/resources/assessment.docx', size: '156 KB', week: 1, addedAt: '2024-01-15' },
        { id: '3', name: 'Sales Scripts Guide', type: 'pdf', category: 'Sales', description: 'Example sales scripts for common scenarios', path: '/resources/sales-scripts.pdf', size: '1.8 MB', week: 2, addedAt: '2024-01-20' },
        { id: '4', name: 'Communication Workshop Slides', type: 'pdf', category: 'Training', description: 'Week 2 communication training presentation', path: '/resources/comms.pdf', size: '5.2 MB', week: 2, addedAt: '2024-01-22' },
        { id: '5', name: 'SEO Basics Video', type: 'video', category: 'SEO', description: 'Introduction to Search Engine Optimization', path: 'https://youtube.com/watch?v=example', week: 3, addedAt: '2024-01-25' },
        { id: '6', name: 'Google Analytics Guide', type: 'link', category: 'SEO', description: 'Official Google Analytics documentation', path: 'https://analytics.google.com/guide', addedAt: '2024-01-26' },
        { id: '7', name: 'AI Tools Directory', type: 'document', category: 'AI', description: 'List of recommended AI tools for work', path: '/resources/ai-tools.pdf', size: '890 KB', week: 4, addedAt: '2024-02-01' },
        { id: '8', name: 'Infographic: Remote Work Tips', type: 'image', category: 'General', description: 'Best practices for remote working', path: '/resources/remote-tips.png', size: '420 KB', addedAt: '2024-02-05' },
        { id: '9', name: 'Programme Certificate Template', type: 'document', category: 'Graduation', description: 'Certificate of completion template', path: '/resources/certificate.docx', size: '98 KB', week: 6, addedAt: '2024-02-10' },
        { id: '10', name: 'Safeguarding Handbook', type: 'pdf', category: 'Policies', description: 'Comprehensive safeguarding procedures', path: '/resources/safeguarding.pdf', size: '3.1 MB', addedAt: '2024-01-10' },
      ]);
    }
    setLoading(false);
  };

  const openResource = (resource: Resource) => {
    if (resource.type === 'link') {
      window.open(resource.path, '_blank');
    } else if (window.electronAPI) {
      window.electronAPI.content.openResource(resource.path);
    } else {
      alert(`Opening: ${resource.path}`);
    }
  };

  const categories = ['all', ...new Set(resources.map(r => r.category))];
  const types = ['all', ...new Set(resources.map(r => r.type))];

  const filteredResources = resources.filter(r => {
    const matchesSearch = 
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.description?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = filterCategory === 'all' || r.category === filterCategory;
    const matchesType = filterType === 'all' || r.type === filterType;
    return matchesSearch && matchesCategory && matchesType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-calm-500">Loading resources...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-calm-900">Resource Vault</h1>
          <p className="text-calm-600 mt-1">Training materials, templates, and helpful links</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'bg-calm-100 text-calm-600'}`}
          >
            <Grid size={20} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-primary-100 text-primary-600' : 'bg-calm-100 text-calm-600'}`}
          >
            <List size={20} />
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-calm-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search resources..."
            className="input-field pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="input-field"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="input-field"
          >
            {types.map(type => (
              <option key={type} value={type}>
                {type === 'all' ? 'All Types' : type.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Resource Count */}
      <p className="text-sm text-calm-500">
        Showing {filteredResources.length} of {resources.length} resources
      </p>

      {/* Resources Grid/List */}
      {filteredResources.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredResources.map((resource) => {
              const Icon = typeIcons[resource.type] || FileText;
              const colorClass = typeColors[resource.type] || typeColors.other;
              
              return (
                <div
                  key={resource.id}
                  className="card hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => openResource(resource)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-3 rounded-lg ${colorClass}`}>
                      <Icon size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-calm-800 truncate group-hover:text-primary-600 transition-colors">
                        {resource.name}
                      </h3>
                      <p className="text-xs text-calm-500 uppercase mt-1">{resource.type}</p>
                    </div>
                  </div>
                  
                  {resource.description && (
                    <p className="text-sm text-calm-600 mt-3 line-clamp-2">{resource.description}</p>
                  )}
                  
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-calm-100">
                    <span className="badge bg-calm-100 text-calm-600">{resource.category}</span>
                    {resource.size && (
                      <span className="text-xs text-calm-400">{resource.size}</span>
                    )}
                  </div>
                  
                  {resource.week && (
                    <div className="mt-2 text-xs text-calm-400">
                      Week {resource.week}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredResources.map((resource) => {
              const Icon = typeIcons[resource.type] || FileText;
              const colorClass = typeColors[resource.type] || typeColors.other;
              
              return (
                <div
                  key={resource.id}
                  className="card hover:shadow-md transition-shadow cursor-pointer group py-3"
                  onClick={() => openResource(resource)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${colorClass}`}>
                      <Icon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-calm-800 group-hover:text-primary-600 transition-colors">
                          {resource.name}
                        </h3>
                        <span className="badge bg-calm-100 text-calm-600 text-xs">{resource.category}</span>
                        {resource.week && (
                          <span className="text-xs text-calm-400">Week {resource.week}</span>
                        )}
                      </div>
                      {resource.description && (
                        <p className="text-sm text-calm-500 truncate">{resource.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-calm-400">
                      {resource.size && (
                        <span className="text-sm">{resource.size}</span>
                      )}
                      {resource.type === 'link' ? (
                        <ExternalLink size={18} />
                      ) : (
                        <Download size={18} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="card text-center py-12">
          <FolderOpen size={48} className="mx-auto text-calm-300 mb-4" />
          <p className="text-calm-600">No resources found matching your search</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterCategory('all');
              setFilterType('all');
            }}
            className="text-primary-600 hover:underline mt-2"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Add Resource Tip */}
      <div className="card bg-calm-50 border-calm-200">
        <h3 className="font-semibold text-calm-700 mb-2">💡 Adding Resources</h3>
        <p className="text-sm text-calm-600">
          To add new resources, place files in the <code className="bg-calm-200 px-1 rounded">/content/resources/</code> folder. 
          They will automatically appear here after restarting the app.
        </p>
      </div>
    </div>
  );
}
