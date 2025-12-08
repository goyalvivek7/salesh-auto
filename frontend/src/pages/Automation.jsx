import { useState, useEffect } from "react";
import {
  Zap,
  Plus,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Settings,
  Building2,
  Globe,
  Clock,
  Calendar,
  Mail,
  MessageSquare,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  Target,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import Button from "../components/Button";
import {
  getAutomationConfigs,
  createAutomationConfig,
  updateAutomationConfig,
  deleteAutomationConfig,
  startAutomation,
  stopAutomation,
  resumeAutomation,
  runAutomationNow,
  getAutomationStats,
} from "../services/api";

const INDUSTRIES = [
  "Technology",
  "Healthcare",
  "Finance",
  "E-commerce",
  "Manufacturing",
  "Real Estate",
  "Education",
  "Hospitality",
  "Retail",
  "Logistics",
  "Consulting",
  "Marketing",
  "Legal",
  "Construction",
  "Food & Beverage",
  "Automotive",
  "Telecommunications",
  "Energy",
  "Agriculture",
  "Entertainment",
];

const COUNTRIES = [
  "India",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Singapore",
  "UAE",
  "Japan",
  "Brazil",
  "Mexico",
  "South Africa",
  "Netherlands",
  "Sweden",
];

const STATUS_CONFIG = {
  draft: {
    color: "bg-gray-100 text-gray-700",
    icon: Settings,
    label: "Draft",
  },
  scheduled: {
    color: "bg-blue-100 text-blue-700",
    icon: Clock,
    label: "Scheduled",
  },
  running: {
    color: "bg-emerald-100 text-emerald-700",
    icon: Play,
    label: "Running",
  },
  paused: {
    color: "bg-amber-100 text-amber-700",
    icon: Pause,
    label: "Paused",
  },
  completed: {
    color: "bg-violet-100 text-violet-700",
    icon: CheckCircle2,
    label: "Completed",
  },
};

export default function Automation() {
  const [automations, setAutomations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [editingAutomation, setEditingAutomation] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [automationsRes, statsRes] = await Promise.all([
        getAutomationConfigs(),
        getAutomationStats(),
      ]);
      setAutomations(automationsRes.data || []);
      setStats(statsRes.data);
    } catch (error) {
      console.error("Failed to load automations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id, data) => {
    try {
      await updateAutomationConfig(id, data);
      setShowCreateModal(false);
      setEditingAutomation(null);
      await loadData();
    } catch (error) {
      console.error("Failed to update automation:", error);
      alert("Failed to update automation");
    }
  };

  const handleStart = async (id) => {
    try {
      setActionLoading(id);
      await startAutomation(id);
      await loadData();
    } catch (error) {
      console.error("Failed to start automation:", error);
      alert("Failed to start automation");
    } finally {
      setActionLoading(null);
    }
  };

  const handleStop = async (id) => {
    try {
      setActionLoading(id);
      await stopAutomation(id);
      await loadData();
    } catch (error) {
      console.error("Failed to stop automation:", error);
      alert("Failed to stop automation");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async (id) => {
    try {
      setActionLoading(id);
      await resumeAutomation(id);
      await loadData();
    } catch (error) {
      console.error("Failed to resume automation:", error);
      alert("Failed to resume automation");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRunNow = async (id) => {
    if (!confirm("This will immediately fetch companies and create a campaign. Continue?")) {
      return;
    }
    try {
      setActionLoading(id);
      await runAutomationNow(id);
      alert("Automation triggered successfully! Companies are being fetched...");
      await loadData();
    } catch (error) {
      console.error("Failed to run automation:", error);
      alert("Failed to run automation: " + (error.response?.data?.detail || error.message));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this automation?")) {
      return;
    }
    try {
      setActionLoading(id);
      await deleteAutomationConfig(id);
      await loadData();
    } catch (error) {
      console.error("Failed to delete automation:", error);
      alert("Failed to delete automation");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreate = async (data) => {
    try {
      await createAutomationConfig(data);
      setShowCreateModal(false);
      setEditingAutomation(null);
      await loadData();
    } catch (error) {
      console.error("Failed to create automation:", error);
      alert("Failed to create automation");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-7 h-7 text-indigo-600" />
            Automations
          </h1>
          <p className="text-gray-500 mt-1">
            Create and manage automated outreach campaigns
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingAutomation(null);
            setShowCreateModal(true);
          }}
          icon={Plus}
          className="bg-gradient-to-r from-indigo-600 to-violet-600"
        >
          New Automation
        </Button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={Building2}
            label="Total Companies"
            value={stats.total_companies}
            color="indigo"
          />
          <StatCard
            icon={Mail}
            label="Messages Sent"
            value={stats.messages_sent}
            color="emerald"
          />
          <StatCard
            icon={MessageSquare}
            label="Total Replies"
            value={stats.total_replies || 0}
            color="violet"
          />
          <StatCard
            icon={Users}
            label="Qualified Leads"
            value={stats.total_qualified_leads || 0}
            color="amber"
          />
        </div>
      )}

      {/* Automations List */}
      <div className="space-y-4">
        {automations.length === 0 ? (
          <EmptyState onCreateClick={() => setShowCreateModal(true)} />
        ) : (
          automations.map((automation) => (
            <AutomationCard
              key={automation.id}
              automation={automation}
              onStart={handleStart}
              onStop={handleStop}
              onResume={handleResume}
              onRunNow={handleRunNow}
              onDelete={handleDelete}
              onEdit={(item) => {
                setEditingAutomation(item);
                setShowCreateModal(true);
              }}
              isLoading={actionLoading === automation.id}
            />
          ))
        )}
      </div>

      {/* Create / Edit Modal */}
      {(showCreateModal || editingAutomation) && (
        <CreateAutomationModal
          mode={editingAutomation ? "edit" : "create"}
          initialData={editingAutomation}
          onClose={() => {
            setShowCreateModal(false);
            setEditingAutomation(null);
          }}
          onSubmit={(data) => {
            if (editingAutomation) {
              return handleUpdate(editingAutomation.id, data);
            }
            return handleCreate(data);
          }}
        />
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const colorClasses = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onCreateClick }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
      <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Zap className="w-8 h-8 text-indigo-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        No Automations Yet
      </h3>
      <p className="text-gray-500 mb-6 max-w-md mx-auto">
        Create your first automation to automatically fetch companies, generate
        campaigns, send messages, and track replies.
      </p>
      <Button
        onClick={onCreateClick}
        icon={Plus}
        className="bg-gradient-to-r from-indigo-600 to-violet-600"
      >
        Create Automation
      </Button>
    </div>
  );
}

function AutomationCard({
  automation,
  onStart,
  onStop,
  onResume,
  onRunNow,
  onDelete,
  onEdit,
  isLoading,
}) {
  const status = STATUS_CONFIG[automation.status] || STATUS_CONFIG.draft;
  const StatusIcon = status.icon;

  const formatTime = (hour, minute = 0) => {
    const h = hour % 12 || 12;
    const ampm = hour >= 12 ? "PM" : "AM";
    const m = minute.toString().padStart(2, "0");
    return `${h}:${m} ${ampm}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Not started";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const progress = automation.run_duration_days
    ? Math.round(
        ((automation.days_completed || 0) / automation.run_duration_days) * 100
      )
    : 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          {/* Left side - Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {automation.name || `${automation.industry} - ${automation.country}`}
              </h3>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}
              >
                <StatusIcon className="w-3.5 h-3.5" />
                {status.label}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <Target className="w-4 h-4" />
                {automation.industry}
              </span>
              <span className="flex items-center gap-1.5">
                <Globe className="w-4 h-4" />
                {automation.country}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {formatTime(automation.send_time_hour, automation.send_time_minute)}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {automation.run_duration_days} days
              </span>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-500" />
                <span className="font-medium">{automation.total_companies_fetched || 0}</span>
                <span className="text-gray-400">companies</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-emerald-500" />
                <span className="font-medium">{automation.total_messages_sent || 0}</span>
                <span className="text-gray-400">messages</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-violet-500" />
                <span className="font-medium">{automation.total_replies || 0}</span>
                <span className="text-gray-400">replies</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-500" />
                <span className="font-medium">{automation.daily_limit}</span>
                <span className="text-gray-400">per day</span>
              </div>
            </div>

            {/* Progress bar for running automations */}
            {automation.status === "running" && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>
                    {automation.days_completed || 0} / {automation.run_duration_days} days
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Dates */}
            {automation.start_date && (
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                <span>Started: {formatDate(automation.start_date)}</span>
                {automation.end_date && (
                  <span>Ends: {formatDate(automation.end_date)}</span>
                )}
              </div>
            )}
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-2">
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            ) : (
              <>
                {automation.status === "draft" && (
                  <>
                    <button
                      onClick={() => onStart(automation.id)}
                      className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                      title="Start Automation"
                    >
                      <Play className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => onRunNow(automation.id)}
                      className="p-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                      title="Run Now (Test)"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  </>
                )}
                {automation.status === "running" && (
                  <>
                    <button
                      onClick={() => onStop(automation.id)}
                      className="p-2 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                      title="Pause Automation"
                    >
                      <Pause className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => onRunNow(automation.id)}
                      className="p-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                      title="Run Now"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  </>
                )}
                {automation.status === "paused" && (
                  <button
                    onClick={() => onResume(automation.id)}
                    className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                    title="Resume Automation"
                  >
                    <Play className="w-5 h-5" />
                  </button>
                )}
                {automation.status === "completed" && (
                  <button
                    onClick={() => onStart(automation.id)}
                    className="p-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                    title="Restart Automation"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                )}
                {onEdit && (
                  <button
                    onClick={() => onEdit(automation)}
                    className="p-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                    title="Edit Automation"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={() => onDelete(automation.id)}
                  className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                  title="Delete Automation"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateAutomationModal({ mode = "create", initialData, onClose, onSubmit }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(() => {
    if (initialData) {
      return {
        name: initialData.name || "",
        industry: initialData.industry || "",
        country: initialData.country || "",
        daily_limit: initialData.daily_limit ?? 10,
        send_time_hour: initialData.send_time_hour ?? 10,
        send_time_minute: initialData.send_time_minute ?? 0,
        followup_day_1: initialData.followup_day_1 ?? 3,
        followup_day_2: initialData.followup_day_2 ?? 7,
        run_duration_days: initialData.run_duration_days ?? 7,
      };
    }
    return {
      name: "",
      industry: "",
      country: "",
      daily_limit: 10,
      send_time_hour: 10,
      send_time_minute: 0,
      followup_day_1: 3,
      followup_day_2: 7,
      run_duration_days: 7,
    };
  });

  const handleSubmit = async () => {
    if (!formData.industry || !formData.country) {
      alert("Please select industry and country");
      return;
    }
    
    setLoading(true);
    try {
      await onSubmit(formData);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {mode === "edit" ? "Edit Automation" : "Create New Automation"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Step {step} of 3 - {step === 1 ? "Target" : step === 2 ? "Schedule" : "Review"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <XCircle className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          {/* Progress bar */}
          <div className="flex gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  s <= step ? "bg-indigo-600" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {step === 1 && (
            <StepTarget
              formData={formData}
              updateField={updateField}
            />
          )}
          {step === 2 && (
            <StepSchedule
              formData={formData}
              updateField={updateField}
            />
          )}
          {step === 3 && (
            <StepReview formData={formData} />
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={() => (step === 1 ? onClose() : setStep(step - 1))}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            {step === 1 ? "Cancel" : "Back"}
          </button>
          <div className="flex gap-3">
            {step < 3 ? (
              <Button
                onClick={() => setStep(step + 1)}
                icon={ChevronRight}
                className="bg-gradient-to-r from-indigo-600 to-violet-600"
              >
                Continue
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                loading={loading}
                icon={Zap}
                className="bg-gradient-to-r from-indigo-600 to-violet-600"
              >
                {mode === "edit" ? "Save Changes" : "Create Automation"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepTarget({ formData, updateField }) {
  const [showCustomIndustry, setShowCustomIndustry] = useState(false);
  const [showCustomCountry, setShowCustomCountry] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Automation Name (Optional)
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="e.g., Tech Companies India Campaign"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Target Industry *
        </label>
        {showCustomIndustry ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={formData.industry}
              onChange={(e) => updateField("industry", e.target.value)}
              placeholder="Enter custom industry..."
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
            <button
              type="button"
              onClick={() => {
                setShowCustomIndustry(false);
                updateField("industry", "");
              }}
              className="px-4 py-3 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <select
              value={formData.industry}
              onChange={(e) => {
                if (e.target.value === "__custom__") {
                  setShowCustomIndustry(true);
                  updateField("industry", "");
                } else {
                  updateField("industry", e.target.value);
                }
              }}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select an industry</option>
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
              <option value="__custom__">+ Enter custom industry...</option>
            </select>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Target Country *
        </label>
        {showCustomCountry ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={formData.country}
              onChange={(e) => updateField("country", e.target.value)}
              placeholder="Enter custom country..."
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
            <button
              type="button"
              onClick={() => {
                setShowCustomCountry(false);
                updateField("country", "");
              }}
              className="px-4 py-3 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <select
              value={formData.country}
              onChange={(e) => {
                if (e.target.value === "__custom__") {
                  setShowCustomCountry(true);
                  updateField("country", "");
                } else {
                  updateField("country", e.target.value);
                }
              }}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a country</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="__custom__">+ Enter custom country...</option>
            </select>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Companies Per Day
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="5"
            max="50"
            step="5"
            value={formData.daily_limit}
            onChange={(e) => updateField("daily_limit", parseInt(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <span className="text-lg font-semibold text-indigo-600 w-12 text-right">
            {formData.daily_limit}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Number of companies to fetch and contact each day
        </p>
      </div>
    </div>
  );
}

function StepSchedule({ formData, updateField }) {
  // Time picker state
  const formatDisplayTime = (hour, minute) => {
    const h = hour % 12 || 12;
    const m = minute.toString().padStart(2, "0");
    const ampm = hour >= 12 ? "PM" : "AM";
    return `${h}:${m} ${ampm}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Daily Send Time (IST)
        </label>
        
        {/* Visual Time Picker */}
        <div className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-2xl p-6">
          <div className="text-center mb-4">
            <span className="text-4xl font-bold text-indigo-700">
              {formatDisplayTime(formData.send_time_hour, formData.send_time_minute)}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Hour Selector */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2 text-center">Hour</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateField("send_time_hour", (formData.send_time_hour - 1 + 24) % 24)}
                  className="p-2 rounded-lg bg-white shadow-sm hover:bg-gray-50 text-gray-600"
                >
                  -
                </button>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={formData.send_time_hour}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    updateField("send_time_hour", Math.min(23, Math.max(0, val)));
                  }}
                  className="flex-1 text-center px-3 py-2 bg-white border-0 rounded-lg shadow-sm text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => updateField("send_time_hour", (formData.send_time_hour + 1) % 24)}
                  className="p-2 rounded-lg bg-white shadow-sm hover:bg-gray-50 text-gray-600"
                >
                  +
                </button>
              </div>
            </div>
            
            {/* Minute Selector */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2 text-center">Minute</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateField("send_time_minute", (formData.send_time_minute - 15 + 60) % 60)}
                  className="p-2 rounded-lg bg-white shadow-sm hover:bg-gray-50 text-gray-600"
                >
                  -
                </button>
                <select
                  value={formData.send_time_minute}
                  onChange={(e) => updateField("send_time_minute", parseInt(e.target.value))}
                  className="flex-1 text-center px-3 py-2 bg-white border-0 rounded-lg shadow-sm text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={0}>00</option>
                  <option value={15}>15</option>
                  <option value={30}>30</option>
                  <option value={45}>45</option>
                </select>
                <button
                  type="button"
                  onClick={() => updateField("send_time_minute", (formData.send_time_minute + 15) % 60)}
                  className="p-2 rounded-lg bg-white shadow-sm hover:bg-gray-50 text-gray-600"
                >
                  +
                </button>
              </div>
            </div>
          </div>
          
          {/* Quick Presets */}
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            {[
              { label: "9 AM", hour: 9, minute: 0 },
              { label: "10 AM", hour: 10, minute: 0 },
              { label: "11 AM", hour: 11, minute: 0 },
              { label: "2 PM", hour: 14, minute: 0 },
              { label: "4 PM", hour: 16, minute: 0 },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  updateField("send_time_hour", preset.hour);
                  updateField("send_time_minute", preset.minute);
                }}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  formData.send_time_hour === preset.hour && formData.send_time_minute === preset.minute
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-600 hover:bg-indigo-100"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Run Duration (Days)
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="1"
            max="30"
            value={formData.run_duration_days}
            onChange={(e) => updateField("run_duration_days", parseInt(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <span className="text-lg font-semibold text-indigo-600 w-16 text-right">
            {formData.run_duration_days} days
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          How many days to run this automation
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            First Follow-up After
          </label>
          <select
            value={formData.followup_day_1}
            onChange={(e) => updateField("followup_day_1", parseInt(e.target.value))}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {[1, 2, 3, 4, 5, 7, 10, 14].map((d) => (
              <option key={d} value={d}>
                {d} day{d > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Second Follow-up After
          </label>
          <select
            value={formData.followup_day_2}
            onChange={(e) => updateField("followup_day_2", parseInt(e.target.value))}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {[3, 5, 7, 10, 14, 21, 30].map((d) => (
              <option key={d} value={d}>
                {d} day{d > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-4 bg-indigo-50 rounded-xl">
        <h4 className="font-medium text-indigo-900 mb-2">What happens:</h4>
        <ul className="text-sm text-indigo-700 space-y-1">
          <li>• Initial email & WhatsApp sent at scheduled time</li>
          <li>• First follow-up after {formData.followup_day_1} days if no reply</li>
          <li>• Second follow-up after {formData.followup_day_2} days if no reply</li>
          <li>• Automatically stops when someone replies</li>
        </ul>
      </div>
    </div>
  );
}

function StepReview({ formData }) {
  const formatTime = (hour, minute = 0) => {
    const h = hour % 12 || 12;
    const ampm = hour >= 12 ? "PM" : "AM";
    const m = minute.toString().padStart(2, "0");
    return `${h}:${m} ${ampm}`;
  };

  const totalCompanies = formData.daily_limit * formData.run_duration_days;
  const totalMessages = totalCompanies * 6; // 3 emails + 3 whatsapp per company

  return (
    <div className="space-y-6">
      <div className="p-4 bg-gradient-to-r from-indigo-50 to-violet-50 rounded-xl">
        <h3 className="font-semibold text-gray-900 text-lg">
          {formData.name || `${formData.industry} - ${formData.country} Automation`}
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ReviewItem icon={Target} label="Industry" value={formData.industry} />
        <ReviewItem icon={Globe} label="Country" value={formData.country} />
        <ReviewItem
          icon={Building2}
          label="Companies/Day"
          value={formData.daily_limit}
        />
        <ReviewItem
          icon={Clock}
          label="Send Time"
          value={formatTime(formData.send_time_hour, formData.send_time_minute)}
        />
        <ReviewItem
          icon={Calendar}
          label="Duration"
          value={`${formData.run_duration_days} days`}
        />
        <ReviewItem
          icon={Mail}
          label="Follow-ups"
          value={`Day ${formData.followup_day_1} & ${formData.followup_day_2}`}
        />
      </div>

      <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
        <h4 className="font-medium text-emerald-900 mb-3">Estimated Output:</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-emerald-600">Total Companies</p>
            <p className="text-2xl font-bold text-emerald-900">{totalCompanies}</p>
          </div>
          <div>
            <p className="text-emerald-600">Total Messages</p>
            <p className="text-2xl font-bold text-emerald-900">~{totalMessages}</p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-700">
            <p className="font-medium mb-1">After creating:</p>
            <p>
              Click "Start" to begin the automation. The system will fetch companies
              and send messages daily at the scheduled time. Replies are automatically
              tracked and negative replies will stop further messages to that company.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
      <Icon className="w-5 h-5 text-gray-400" />
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-medium text-gray-900">{value || "-"}</p>
      </div>
    </div>
  );
}
