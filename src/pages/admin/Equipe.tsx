import { useState, useEffect } from 'react'
import { useAdminConference } from '@/components/layout/AdminLayout'
import { api } from '@/services/api'
import { useAuthStore } from '@/store/useAuthStore'
import { RoleBadge } from '@/components/ui'
import type { User } from '@/types'

export default function Equipe() {
  const { conference } = useAdminConference()
  const { user } = useAuthStore()
  const [members, setMembers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchEmail, setSearchEmail] = useState('')
  const [searchResult, setSearchResult] = useState<User | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  const loadMembers = async () => {
    if (!conference) return
    const allUsers = await api.users.listAll()
    const confMembers = allUsers.filter(
      (u) => u.id === conference.ownerId || conference.collaboratorIds.includes(u.id)
    )
    setMembers(confMembers)
    setLoading(false)
  }

  useEffect(() => {
    loadMembers()
  }, [conference])

  const handleSearch = async () => {
    if (!searchEmail.trim()) return
    setSearched(true)
    setSearchResult(null)
    setSearchError(null)
    const found = await api.users.getByEmail(searchEmail.trim())
    if (found) {
      setSearchResult(found)
    } else {
      setSearchError('Usuário não encontrado no sistema. Peça para ele fazer login primeiro.')
    }
  }

  const handleAdd = async () => {
    if (!conference || !searchResult) return
    await api.conferences.addCollaborator(conference.id, searchResult.id)
    setSearchEmail('')
    setSearchResult(null)
    setSearched(false)
    await loadMembers()
  }

  const handleRemove = async (userId: string) => {
    if (!conference) return
    await api.conferences.removeCollaborator(conference.id, userId)
    await loadMembers()
  }

  const isOwner = (u: User) => conference?.ownerId === u.id
  const canRemove = (u: User) => !isOwner(u) && u.role !== 'super_admin' && (user?.role === 'super_admin' || conference?.ownerId === user?.id || u.id !== user?.id)

  if (loading || !conference) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-[#037EF3] border-t-transparent rounded-full" /></div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1A1A2E]">Equipe</h1>
          <p className="text-sm text-gray-500 mt-1">{conference.name}</p>
        </div>
      </div>

      {/* Invite section */}
      <div className="bg-white rounded-xl shadow-card p-5 mb-6">
        <h2 className="font-semibold text-[#1A1A2E] mb-3">Convidar pessoa para a equipe</h2>
        <div className="flex items-center gap-3">
          <input
            type="email"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Digite o e-mail..."
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#037EF3]/20 focus:border-[#037EF3]"
          />
          <button onClick={handleSearch} className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#037EF3] text-white hover:bg-[#0256B0] transition-colors shrink-0">Buscar</button>
        </div>

        {searched && (
          <div className="mt-4">
            {searchResult ? (
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#037EF3] flex items-center justify-center text-white font-bold text-sm">{searchResult.name.charAt(0).toUpperCase()}</div>
                  <div>
                    <p className="text-sm font-medium text-[#1A1A2E]">{searchResult.name}</p>
                    <p className="text-xs text-gray-500">{searchResult.email}</p>
                    <RoleBadge role={searchResult.role} />
                  </div>
                </div>
                {conference.collaboratorIds.includes(searchResult.id) || conference.ownerId === searchResult.id ? (
                  <span className="text-xs text-gray-400">Já tem acesso</span>
                ) : (
                  <button onClick={handleAdd} className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#037EF3] text-white hover:bg-[#0256B0] transition-colors">Adicionar à equipe</button>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">{searchError}</p>
            )}
          </div>
        )}
      </div>

      {/* Members table */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-[#1A1A2E]">Membros ({members.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase">Nome</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase">E-mail</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase">Cargo</th>
                <th className="text-right px-5 py-3 font-semibold text-gray-500 text-xs uppercase">Ações</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#037EF3] flex items-center justify-center text-white font-bold text-xs">{m.name.charAt(0).toUpperCase()}</div>
                      <span className="font-medium text-[#1A1A2E]">{m.name}</span>
                      {isOwner(m) && <span className="text-[10px] font-semibold text-[#00A94F] bg-[#E6F7EE] rounded-full px-2 py-0.5">Dono</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{m.email}</td>
                  <td className="px-5 py-3"><RoleBadge role={m.role} /></td>
                  <td className="px-5 py-3 text-right">
                    {canRemove(m) && (
                      <button onClick={() => handleRemove(m.id)} className="text-xs font-medium text-[#E53E3E] hover:underline">Remover</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
