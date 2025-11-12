import { Search, Filter, X } from 'lucide-react';

interface SearchBarProps {
  filters: {
    search: string;
    type: string;
    date: string;
  };
  onFiltersChange: (filters: any) => void;
}

export function SearchBar({ filters, onFiltersChange }: SearchBarProps) {
  const hasActiveFilters = filters.search || filters.type || filters.date;

  const clearFilters = () => {
    onFiltersChange({ search: '', type: '', date: '' });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            placeholder="Buscar por título, descrição ou professor..."
            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        <div className="flex gap-3">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <select
              value={filters.type}
              onChange={(e) => onFiltersChange({ ...filters, type: e.target.value })}
              className="pl-10 pr-8 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white cursor-pointer"
            >
              <option value="">Todos os tipos</option>
              <option value="aula">Aula</option>
              <option value="seminario">Seminário</option>
              <option value="reuniao">Reunião</option>
            </select>
          </div>

          <input
            type="date"
            value={filters.date}
            onChange={(e) => onFiltersChange({ ...filters, date: e.target.value })}
            className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all flex items-center gap-2"
              title="Limpar filtros"
            >
              <X className="w-5 h-5" />
              <span className="hidden sm:inline">Limpar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
