import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { User as UserType } from '../types';
import { Plus, Trash2, User, Shield, Search, X, Save, Key, Edit2 } from 'lucide-react';

export default function Users() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<UserType> | null>(null);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    full_name: '',
    role_id: 2 // Default to Vendedor
  });
  const { token } = useAuth();
  const { apiFetch } = useApi();

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const fetchUsers = () => {
    apiFetch('/api/users')
      .then(setUsers)
      .catch(err => {
        if (err.message !== 'Sesión expirada') {
          console.error('Error fetching users:', err);
          alert(err.message);
        }
      });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    try {
      await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
      fetchUsers();
    } catch (err: any) {
      if (err.message !== 'Sesión expirada') alert(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingUser?.id ? 'PUT' : 'POST';
      const url = editingUser?.id ? `/api/users/${editingUser.id}` : '/api/users';
      
      await apiFetch(url, {
        method,
        body: JSON.stringify(editingUser || newUser)
      });

      setIsModalOpen(false);
      setEditingUser(null);
      setNewUser({ username: '', password: '', full_name: '', role_id: 2 });
      fetchUsers();
    } catch (err: any) {
      if (err.message !== 'Sesión expirada') alert(err.message);
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(search.toLowerCase()) || 
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar usuarios..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-brand outline-none transition-all text-slate-900 dark:text-white"
          />
        </div>
        <button
          onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
          className="bg-brand hover:bg-brand-muted text-white px-4 py-2 rounded-xl flex items-center gap-2 font-semibold shadow-lg shadow-brand/20 dark:shadow-none transition-all"
        >
          <Plus className="w-5 h-5" />
          Nuevo Usuario
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((u) => (
          <div key={u.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all relative group">
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${u.role === 'Admin' ? 'bg-brand/10 dark:bg-brand/20 text-brand' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                {u.role === 'Admin' ? <Shield className="w-6 h-6" /> : <User className="w-6 h-6" />}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white">{u.full_name}</h4>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">@{u.username}</p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800">
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${u.role === 'Admin' ? 'bg-brand/10 dark:bg-brand/20 text-brand' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                {u.role}
              </span>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => { setEditingUser(u); setIsModalOpen(true); }}
                  className="p-2 text-slate-300 dark:text-slate-500 hover:text-brand dark:hover:text-brand hover:bg-brand/10 dark:hover:bg-brand/20 rounded-lg transition-all"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                {u.username !== 'admin' && (
                  <button 
                    onClick={() => handleDelete(u.id)}
                    className="p-2 text-slate-300 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md max-h-[90vh] shadow-2xl overflow-hidden border border-white/10 flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all">
                <X className="w-5 h-5 text-slate-400 dark:text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4" />
                  <input
                    type="text"
                    required
                    value={editingUser ? editingUser.full_name : newUser.full_name}
                    onChange={e => editingUser ? setEditingUser({ ...editingUser, full_name: e.target.value }) : setNewUser({ ...newUser, full_name: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all font-medium"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre de Usuario</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-bold text-sm">@</span>
                  <input
                    type="text"
                    required
                    value={editingUser ? editingUser.username : newUser.username}
                    onChange={e => editingUser ? setEditingUser({ ...editingUser, username: e.target.value }) : setNewUser({ ...newUser, username: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all font-medium"
                    placeholder="juanp"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contraseña {editingUser && '(dejar en blanco para no cambiar)'}</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4" />
                  <input
                    type="password"
                    required={!editingUser}
                    value={editingUser ? (editingUser.password || '') : newUser.password}
                    onChange={e => editingUser ? setEditingUser({ ...editingUser, password: e.target.value }) : setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all font-medium"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Rol</label>
                <select
                  value={editingUser ? editingUser.role_id : newUser.role_id}
                  onChange={e => editingUser ? setEditingUser({ ...editingUser, role_id: parseInt(e.target.value) }) : setNewUser({ ...newUser, role_id: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand outline-none appearance-none text-slate-900 dark:text-white"
                >
                  <option value={1}>Administrador</option>
                  <option value={2}>Vendedor</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3 sticky bottom-0 bg-white dark:bg-slate-900 pb-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all bg-white dark:bg-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-brand text-white font-bold rounded-xl hover:bg-brand-muted shadow-lg shadow-brand/20 dark:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {editingUser ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
