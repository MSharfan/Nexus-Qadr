import React from 'react';
import { Plus, Edit, Trash2, Eye, Search } from 'lucide-react';

// Local ImageWithFallback to avoid missing module; uses a simple placeholder on error.
const ImageWithFallback: React.FC<{
  src?: string;
  alt?: string;
  className?: string;
}> = ({ src, alt, className }) => {
  const [imgSrc, setImgSrc] = React.useState<string | undefined>(src);

  React.useEffect(() => {
    setImgSrc(src);
  }, [src]);

  return (
    <img
      src={imgSrc ?? '/placeholder.png'}
      alt={alt ?? ''}
      className={className}
      onError={() => {
        if (imgSrc !== '/placeholder.png') setImgSrc('/placeholder.png');
      }}
    />
  );
};

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  image: string;
  status: 'active' | 'inactive';
}

interface MyProductsPageProps {
  products: Product[];
  onAddProduct: () => void;
  onEditProduct: (productId: string) => void;
  onDeleteProduct: (productId: string) => void;
}

export const MyProductsPage: React.FC<MyProductsPageProps> = ({
  products,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [viewMode, setViewMode] = React.useState<'grid' | 'table'>('grid');

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl mb-2">My Products</h1>
          <p className="text-muted-foreground">Manage your product listings</p>
        </div>
        <button
          onClick={onAddProduct}
          className="bg-gradient-to-r from-[#0D47A1] to-[#00B0FF] text-white px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-[#00B0FF]/30 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span>Add Product</span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 border border-border mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-border bg-secondary focus:outline-none focus:ring-2 focus:ring-[#00B0FF] focus:border-transparent transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-3 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[#0D47A1] text-white'
                  : 'bg-secondary hover:bg-[#00B0FF]/10'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-3 rounded-lg transition-colors ${
                viewMode === 'table'
                  ? 'bg-[#0D47A1] text-white'
                  : 'bg-secondary hover:bg-[#00B0FF]/10'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white dark:bg-[#1a1a1a] rounded-xl overflow-hidden border border-border hover:border-[#00B0FF] transition-all"
            >
              <div className="aspect-square overflow-hidden bg-gray-100 dark:bg-gray-800">
                <ImageWithFallback
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h3 className="mb-2 line-clamp-2 min-h-[3rem]">{product.name}</h3>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg text-[#0D47A1] dark:text-[#00B0FF]">
                    ${product.price.toFixed(2)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Stock: {product.stock}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onEditProduct(product.id)}
                    className="flex-1 bg-[#00B0FF]/10 text-[#00B0FF] py-2 rounded-lg hover:bg-[#00B0FF]/20 transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => onDeleteProduct(product.id)}
                    className="p-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Products Table */
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary">
                <tr>
                  <th className="text-left py-4 px-6">Product</th>
                  <th className="text-left py-4 px-6">Category</th>
                  <th className="text-left py-4 px-6">Price</th>
                  <th className="text-left py-4 px-6">Stock</th>
                  <th className="text-left py-4 px-6">Status</th>
                  <th className="text-left py-4 px-6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-border hover:bg-secondary transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                          <ImageWithFallback
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="line-clamp-1">{product.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-muted-foreground capitalize">
                      {product.category}
                    </td>
                    <td className="py-4 px-6 text-[#0D47A1] dark:text-[#00B0FF]">
                      ${product.price.toFixed(2)}
                    </td>
                    <td className="py-4 px-6">{product.stock}</td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-3 py-1 rounded-full text-xs ${
                          product.status === 'active'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                        }`}
                      >
                        {product.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2">
                        <button
                          onClick={() => onEditProduct(product.id)}
                          className="p-2 hover:bg-[#00B0FF]/10 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4 text-[#00B0FF]" />
                        </button>
                        <button
                          onClick={() => onDeleteProduct(product.id)}
                          className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredProducts.length === 0 && (
        <div className="text-center py-16">
          <Eye className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl mb-2">No products found</h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery ? 'Try a different search term' : 'Add your first product to get started'}
          </p>
          {!searchQuery && (
            <button
              onClick={onAddProduct}
              className="bg-gradient-to-r from-[#0D47A1] to-[#00B0FF] text-white px-8 py-3 rounded-xl hover:shadow-lg hover:shadow-[#00B0FF]/30 transition-all"
            >
              Add Product
            </button>
          )}
        </div>
      )}
    </div>
  );
};
