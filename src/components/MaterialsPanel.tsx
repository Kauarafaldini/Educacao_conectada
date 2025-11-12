import { useState, useEffect } from 'react';
import { supabase, Material, Event } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Video, Link as LinkIcon, Upload, X, Download, Trash2 } from 'lucide-react';

interface MaterialsPanelProps {
  event: Event;
  onClose: () => void;
}

export function MaterialsPanel({ event, onClose }: MaterialsPanelProps) {
  const { profile } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    title: '',
    description: '',
    file_type: 'pdf' as 'pdf' | 'video' | 'link' | 'document' | 'image' | 'other',
    file_url: '',
  });

  useEffect(() => {
    loadMaterials();
  }, [event.id]);

  const loadMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*, uploader:profiles!materials_uploaded_by_fkey(*)')
        .eq('event_id', event.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      console.error('Error loading materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!newMaterial.title || !newMaterial.file_url) {
      alert('Preencha os campos obrigatórios');
      return;
    }

    setUploading(true);

    try {
      const { error } = await supabase.from('materials').insert({
        event_id: event.id,
        title: newMaterial.title,
        description: newMaterial.description,
        file_type: newMaterial.file_type,
        file_url: newMaterial.file_url,
        uploaded_by: profile!.id,
      });

      if (error) throw error;

      setNewMaterial({
        title: '',
        description: '',
        file_type: 'pdf',
        file_url: '',
      });
      setShowUploadForm(false);
      loadMaterials();
    } catch (error) {
      console.error('Error uploading material:', error);
      alert('Erro ao enviar material');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (materialId: string) => {
    if (!confirm('Tem certeza que deseja excluir este material?')) return;

    try {
      const { error } = await supabase
        .from('materials')
        .delete()
        .eq('id', materialId);

      if (error) throw error;
      loadMaterials();
    } catch (error) {
      console.error('Error deleting material:', error);
      alert('Erro ao excluir material');
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
      case 'document':
        return <FileText className="w-5 h-5" />;
      case 'video':
        return <Video className="w-5 h-5" />;
      case 'link':
        return <LinkIcon className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const typeColors = {
    pdf: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    video: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    link: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    document: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    image: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    other: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  };

  const isCreator = profile?.id === event.creator_id;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Materiais - {event.title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-all"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isCreator && (
            <div className="mb-6">
              {!showUploadForm ? (
                <button
                  onClick={() => setShowUploadForm(true)}
                  className="w-full flex items-center justify-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 py-3 rounded-lg border-2 border-dashed border-blue-300 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all"
                >
                  <Upload className="w-5 h-5" />
                  Adicionar Material
                </button>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Título *
                    </label>
                    <input
                      type="text"
                      value={newMaterial.title}
                      onChange={(e) => setNewMaterial({ ...newMaterial, title: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Nome do material"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Descrição
                    </label>
                    <textarea
                      value={newMaterial.description}
                      onChange={(e) => setNewMaterial({ ...newMaterial, description: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                      rows={2}
                      placeholder="Descrição do material"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Tipo
                    </label>
                    <select
                      value={newMaterial.file_type}
                      onChange={(e) => setNewMaterial({ ...newMaterial, file_type: e.target.value as any })}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="pdf">PDF</option>
                      <option value="video">Vídeo</option>
                      <option value="link">Link</option>
                      <option value="document">Documento</option>
                      <option value="image">Imagem</option>
                      <option value="other">Outro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      URL do Arquivo *
                    </label>
                    <input
                      type="url"
                      value={newMaterial.file_url}
                      onChange={(e) => setNewMaterial({ ...newMaterial, file_url: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="https://..."
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowUploadForm(false)}
                      className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleUpload}
                      disabled={uploading}
                      className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-all disabled:opacity-50"
                    >
                      {uploading ? 'Enviando...' : 'Adicionar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : materials.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">Nenhum material disponível</p>
            </div>
          ) : (
            <div className="space-y-3">
              {materials.map((material) => (
                <div
                  key={material.id}
                  className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-all"
                >
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${typeColors[material.file_type]}`}>
                    {getFileIcon(material.file_type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">
                      {material.title}
                    </h4>
                    {material.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                        {material.description}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-500">
                      Enviado por {material.uploader?.full_name}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <a
                      href={material.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg transition-all"
                      title="Abrir"
                    >
                      <Download className="w-5 h-5" />
                    </a>

                    {material.uploaded_by === profile?.id && (
                      <button
                        onClick={() => handleDelete(material.id)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-all"
                        title="Excluir"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
