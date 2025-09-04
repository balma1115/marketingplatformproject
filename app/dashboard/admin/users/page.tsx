'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { 
  Search, 
  Filter, 
  UserPlus, 
  Edit, 
  Trash2, 
  Shield, 
  ChevronLeft, 
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'

interface User {
  id: number
  email: string
  name: string
  phone?: string
  role: string
  plan: string
  isApproved: boolean
  createdAt: string
  updatedAt: string
  academyName?: string
  userSubjects?: {
    id: number
    subject: { name: string }
    branch: { name: string }
    academy: { name: string }
  }[]
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterApproval, setFilterApproval] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        search: searchTerm,
        role: filterRole,
        approval: filterApproval
      })

      const response = await fetch(`/api/admin/users?${params}`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
        setTotalPages(data.totalPages || 1)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
      toast.error('사용자 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [currentPage, searchTerm, filterRole, filterApproval])

  // Approve user
  const handleApproveUser = async (userId: number) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/approve`, {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        toast.success('사용자가 승인되었습니다.')
        fetchUsers()
      } else {
        toast.error('승인 처리 실패')
      }
    } catch (error) {
      toast.error('승인 처리 중 오류가 발생했습니다.')
    }
  }

  // Update user
  const handleUpdateUser = async (userId: number, updates: Partial<User>) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        toast.success('사용자 정보가 수정되었습니다.')
        setIsEditDialogOpen(false)
        fetchUsers()
      } else {
        toast.error('수정 실패')
      }
    } catch (error) {
      toast.error('수정 중 오류가 발생했습니다.')
    }
  }

  // Delete user
  const handleDeleteUser = async (userId: number) => {
    if (!confirm('정말 이 사용자를 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (response.ok) {
        toast.success('사용자가 삭제되었습니다.')
        fetchUsers()
      } else {
        toast.error('삭제 실패')
      }
    } catch (error) {
      toast.error('삭제 중 오류가 발생했습니다.')
    }
  }

  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">사용자 관리</h1>
          <p className="text-gray-600 mt-2">시스템 사용자를 관리하고 권한을 설정합니다.</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>필터 및 검색</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="이름, 이메일로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger>
                  <SelectValue placeholder="역할 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 역할</SelectItem>
                  <SelectItem value="admin">관리자</SelectItem>
                  <SelectItem value="agency">대행사</SelectItem>
                  <SelectItem value="branch">지사</SelectItem>
                  <SelectItem value="academy">학원</SelectItem>
                  <SelectItem value="user">일반 사용자</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterApproval} onValueChange={setFilterApproval}>
                <SelectTrigger>
                  <SelectValue placeholder="승인 상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 상태</SelectItem>
                  <SelectItem value="approved">승인됨</SelectItem>
                  <SelectItem value="pending">대기중</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                onClick={fetchUsers}
                className="bg-accent-blue hover:bg-secondary-blue text-white"
              >
                <Filter className="w-4 h-4 mr-2" />
                필터 적용
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>사용자 목록</CardTitle>
                <CardDescription>총 {users.length}명의 사용자</CardDescription>
              </div>
              <Button 
                className="bg-accent-blue hover:bg-secondary-blue text-white"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                사용자 추가
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">이름</th>
                    <th className="text-left py-3 px-4">이메일</th>
                    <th className="text-left py-3 px-4">전화번호</th>
                    <th className="text-left py-3 px-4">역할</th>
                    <th className="text-left py-3 px-4">플랜</th>
                    <th className="text-left py-3 px-4">소속</th>
                    <th className="text-left py-3 px-4">상태</th>
                    <th className="text-left py-3 px-4">가입일</th>
                    <th className="text-left py-3 px-4">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{user.name}</td>
                      <td className="py-3 px-4">{user.email}</td>
                      <td className="py-3 px-4">{user.phone || '-'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                          user.role === 'agency' ? 'bg-blue-100 text-blue-700' :
                          user.role === 'branch' ? 'bg-green-100 text-green-700' :
                          user.role === 'academy' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {user.role === 'admin' ? '관리자' :
                           user.role === 'agency' ? '대행사' :
                           user.role === 'branch' ? '지사' :
                           user.role === 'academy' ? '학원' :
                           '사용자'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="capitalize">{user.plan}</span>
                      </td>
                      <td className="py-3 px-4">
                        {user.academyName || 
                         (user.userSubjects && user.userSubjects[0] 
                           ? `${user.userSubjects[0].academy.name}`
                           : '-')}
                      </td>
                      <td className="py-3 px-4">
                        {user.isApproved ? (
                          <span className="flex items-center text-green-600">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            승인됨
                          </span>
                        ) : (
                          <span className="flex items-center text-yellow-600">
                            <Clock className="w-4 h-4 mr-1" />
                            대기중
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {!user.isApproved && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApproveUser(user.id)}
                              className="text-green-600 hover:bg-green-50"
                            >
                              승인
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedUser(user)
                              setIsEditDialogOpen(true)
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-4">
              <p className="text-sm text-gray-600">
                페이지 {currentPage} / {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>사용자 정보 수정</DialogTitle>
              <DialogDescription>
                {selectedUser?.name}님의 정보를 수정합니다.
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div>
                  <Label>역할</Label>
                  <Select 
                    defaultValue={selectedUser.role}
                    onValueChange={(value) => {
                      setSelectedUser({...selectedUser, role: value})
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">관리자</SelectItem>
                      <SelectItem value="agency">대행사</SelectItem>
                      <SelectItem value="branch">지사</SelectItem>
                      <SelectItem value="academy">학원</SelectItem>
                      <SelectItem value="user">일반 사용자</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>플랜</Label>
                  <Select 
                    defaultValue={selectedUser.plan}
                    onValueChange={(value) => {
                      setSelectedUser({...selectedUser, plan: value})
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                취소
              </Button>
              <Button
                onClick={() => selectedUser && handleUpdateUser(selectedUser.id, {
                  role: selectedUser.role,
                  plan: selectedUser.plan
                })}
                className="bg-accent-blue hover:bg-secondary-blue text-white"
              >
                수정
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}