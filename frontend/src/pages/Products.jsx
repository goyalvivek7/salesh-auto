import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  Upload,
  Users,
  Megaphone,
  Target,
  FileText,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  X,
  Tag,
  Filter,
} from 'lucide-react';
import { getProducts, createProduct, updateProduct, deleteProduct, uploadProductAsset } from '../services/api';
import { useToast } from '../components/Toast';
import { useNavigate } from 'react-router-dom';

export default function Products() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    short_description: '',
    long_description: '',
    industry_tags: [],
    default_filters: {},
  });
  const [tagInput, setTagInput] = useState('');
  const [filterKey, setFilterKey] = useState('');
  const [filterValue, setFilterValue] = useState('');

  // Fetch products
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', page, search],
    queryFn: () => getProducts({ page, page_size: 12, search: search || undefined }),
  });

  // Create product mutation
  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      showToast('Product created successfully', 'success');
      closeModal();
    },
    onError: (error) => {
      showToast(error.response?.data?.detail || 'Failed to create product', 'error');
    },
  });

  // Update product mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      showToast('Product updated successfully', 'success');
      closeModal();
    },
    onError: (error) => {
      showToast(error.response?.data?.detail || 'Failed to update product', 'error');
    },
  });

  // Delete product mutation
  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      showToast('Product deleted successfully', 'success');
    },
    onError: (error) => {
      showToast(error.response?.data?.detail || 'Failed to delete product', 'error');
    },
  });

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      short_description: '',
      long_description: '',
      industry_tags: [],
      default_filters: {},
    });
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      short_description: product.short_description || '',
      long_description: product.long_description || '',
      industry_tags: product.industry_tags || [],
      default_filters: product.default_filters || {},
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({
      name: '',
      short_description: '',
      long_description: '',
      industry_tags: [],
      default_filters: {},
    });
    setTagInput('');
    setFilterKey('');
    setFilterValue('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
    // Always close the modal after submitting to satisfy UX requirement
    closeModal();
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.industry_tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        industry_tags: [...formData.industry_tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag) => {
    setFormData({
      ...formData,
      industry_tags: formData.industry_tags.filter((t) => t !== tag),
    });
  };

  const handleAddFilter = () => {
    if (filterKey.trim() && filterValue.trim()) {
      setFormData({
        ...formData,
        default_filters: {
          ...formData.default_filters,
          [filterKey.trim()]: filterValue.trim(),
        },
      });
      setFilterKey('');
      setFilterValue('');
    }
  };

  const handleRemoveFilter = (key) => {
    const newFilters = { ...formData.default_filters };
    delete newFilters[key];
    setFormData({ ...formData, default_filters: newFilters });
  };

  const handleDelete = (product) => {
    if (window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
      deleteMutation.mutate(product.id);
    }
  };

  const products = productsData?.data?.items || [];
  const totalPages = productsData?.data?.total_pages || 1;
  const total = productsData?.data?.total || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="text-slate-500 mt-1">
            Manage your products and their sales campaigns
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-sky-500 text-white rounded-xl hover:shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-white/60 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
          />
        </div>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-12 text-center border border-white/60">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700">No products yet</h3>
          <p className="text-slate-500 mt-1">Create your first product to start targeted campaigns</p>
          <button
            onClick={openCreateModal}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-white/60 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-sky-500 rounded-xl flex items-center justify-center">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{product.name}</h3>
                    <p className="text-xs text-slate-500">{product.slug}</p>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    product.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {product.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {product.short_description && (
                <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                  {product.short_description}
                </p>
              )}

              {/* Tags */}
              {product.industry_tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {product.industry_tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                  {product.industry_tags.length > 3 && (
                    <span className="text-xs text-slate-400">
                      +{product.industry_tags.length - 3} more
                    </span>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center p-2 bg-slate-50 rounded-lg">
                  <Users className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                  <p className="text-xs text-slate-500">Companies</p>
                  <p className="font-semibold text-slate-700">
                    {product.companies_count || 0}
                  </p>
                </div>
                <div className="text-center p-2 bg-slate-50 rounded-lg">
                  <Megaphone className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                  <p className="text-xs text-slate-500">Campaigns</p>
                  <p className="font-semibold text-slate-700">
                    {product.campaigns_count || 0}
                  </p>
                </div>
                <div className="text-center p-2 bg-slate-50 rounded-lg">
                  <Target className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                  <p className="text-xs text-slate-500">Leads</p>
                  <p className="font-semibold text-slate-700">
                    {product.qualified_leads_count || 0}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/products/${product.id}`)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 text-sm"
                >
                  <Eye className="w-4 h-4" />
                  View
                </button>
                <button
                  onClick={() => navigate(`/products/${product.id}/analytics`)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-sky-50 text-sky-600 rounded-lg hover:bg-sky-100 text-sm"
                >
                  <BarChart3 className="w-4 h-4" />
                  Analytics
                </button>
                <button
                  onClick={() => openEditModal(product)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(product)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-white/60">
          <p className="text-sm text-slate-500">
            Showing {products.length} of {total} products
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-slate-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">
                {editingProduct ? 'Edit Product' : 'Create Product'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  placeholder="e.g., Visitor Management System"
                />
              </div>

              {/* Short Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Short Description
                </label>
                <input
                  type="text"
                  value={formData.short_description}
                  onChange={(e) =>
                    setFormData({ ...formData, short_description: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  placeholder="Brief description for quick reference"
                />
              </div>

              {/* Long Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Long Description
                </label>
                <textarea
                  value={formData.long_description}
                  onChange={(e) =>
                    setFormData({ ...formData, long_description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  placeholder="Detailed product description"
                />
              </div>

              {/* Industry Tags */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Tag className="w-4 h-4 inline mr-1" />
                  Industry Tags
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    placeholder="Add industry tag (e.g., education)"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-indigo-100 text-indigo-600 rounded-xl hover:bg-indigo-200"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.industry_tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-indigo-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Default Filters (ICP) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Filter className="w-4 h-4 inline mr-1" />
                  ICP Filters
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={filterKey}
                    onChange={(e) => setFilterKey(e.target.value)}
                    className="w-1/3 px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    placeholder="Key"
                  />
                  <input
                    type="text"
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    placeholder="Value"
                  />
                  <button
                    type="button"
                    onClick={handleAddFilter}
                    className="px-4 py-2 bg-indigo-100 text-indigo-600 rounded-xl hover:bg-indigo-200"
                  >
                    Add
                  </button>
                </div>
                <div className="space-y-1">
                  {Object.entries(formData.default_filters).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg"
                    >
                      <span className="text-sm">
                        <span className="font-medium text-slate-700">{key}:</span>{' '}
                        <span className="text-slate-600">{value}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFilter(key)}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-sky-500 text-white rounded-xl hover:shadow-lg disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : editingProduct
                    ? 'Update Product'
                    : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
