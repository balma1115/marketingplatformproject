'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Search, CheckCircle, XCircle, Clock, User, Building, School, Filter } from 'lucide-react'

interface UserData {
  id: number
  email: string
  name: string
  role: string
  isApproved: boolean
  createdAt: string
  userSubjects: {
    id: number
    subject: {
      id: number
      name: string
    }
    branch: {
      id: number
      name: string
    }
    academy?: {
      id: number
      name: string
    }
    isBranchManager: boolean
  }[]
}

export default function BranchUsersPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending'>('all')
  const [filterSubject, setFilterSubject] = useState<string>('all')
  const [filterBranch, setFilterBranch] = useState<string>('all')

  // 고유한 과목과 지사 목록 생성
  const subjects = Array.from(new Set(users.flatMap(u =>
    u.userSubjects.map(us => JSON.stringify({ id: us.subject.id, name: us.subject.name }))
  ))).map(s => JSON.parse(s))

  const branches = Array.from(new Set(users.flatMap(u =>
    u.userSubjects.map(us => JSON.stringify({ id: us.branch.id, name: us.branch.name }))
  ))).map(b => JSON.parse(b))

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/branch/users', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      } else {
        toast.error('사용자 목록을 불러오는데 실패했습니다.')
      }
    } catch (error) {
      toast.error('사용자 목록을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (userId: number) => {
    try {
      const response = await fetch(`/api/branch/users/${userId}/approve`, {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        toast.success('사용자가 승인되었습니다.')
        fetchUsers()
      } else {
        toast.error('사용자 승인에 실패했습니다.')
      }
    } catch (error) {
      toast.error('사용자 승인 중 오류가 발생했습니다.')
    }
  }

  const handleReject = async (userId: number) => {
    if (!confirm('정말 이 사용자를 거부하시겠습니까?')) return

    try {
      const response = await fetch(`/api/branch/users/${userId}/reject`, {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        toast.success('사용자가 거부되었습니다.')
        fetchUsers()
      } else {
        toast.error('사용자 거부에 실패했습니다.')
      }
    } catch (error) {
      toast.error('사용자 거부 중 오류가 발생했습니다.')
    }
  }

  // 필터링된 사용자 목록
  const filteredUsers = users.filter(user => {
    // 검색어 필터
    if (searchTerm && !user.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !user.email.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }

    // 승인 상태 필터
    if (filterStatus === 'approved' && !user.isApproved) return false
    if (filterStatus === 'pending' && user.isApproved) return false

    // 과목 필터
    if (filterSubject !== 'all') {
      const hasSubject = user.userSubjects.some(us =>
        us.subject.id === parseInt(filterSubject)
      )
      if (!hasSubject) return false
    }

    // 지사 필터
    if (filterBranch !== 'all') {
      const hasBranch = user.userSubjects.some(us =>
        us.branch.id === parseInt(filterBranch)
      )
      if (!hasBranch) return false
    }

    return true
  })

  const getStatusBadge = (isApproved: boolean) => {
    if (isApproved) {
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          승인됨
        </Badge>
      )
    }
    return (
      <Badge className="bg-yellow-100 text-yellow-800">
        <Clock className="h-3 w-3 mr-1" />
        대기중
      </Badge>
    )
  }

  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, { label: string; className: string }> = {
      'branch_manager': { label: '지사장', className: 'bg-purple-100 text-purple-800' },
      'user': { label: '일반', className: 'bg-gray-100 text-gray-800' },
      'admin': { label: '관리자', className: 'bg-red-100 text-red-800' }
    }

    const roleInfo = roleMap[role] || { label: role, className: 'bg-gray-100 text-gray-800' }

    return (
      <Badge className={roleInfo.className}>
        {roleInfo.label}
      </Badge>
    )
  }

  if (!user || (user.role !== 'branch_manager' && user.role !== 'branch' && user.role !== 'admin')) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-gray-500">접근 권한이 없습니다.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>소속 사용자 관리</CardTitle>
        </CardHeader>
        <CardContent>
          {/* 필터 섹션 */}
          <div className="mb-6 space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="이름 또는 이메일로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="상태 필터" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="approved">승인됨</SelectItem>
                  <SelectItem value="pending">대기중</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="과목 필터" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 과목</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id.toString()}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterBranch} onValueChange={setFilterBranch}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="지사 필터" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 지사</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 통계 */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{filteredUsers.length}</div>
                  <div className="text-sm text-gray-600">전체 사용자</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-600">
                    {filteredUsers.filter(u => u.isApproved).length}
                  </div>
                  <div className="text-sm text-gray-600">승인됨</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-yellow-600">
                    {filteredUsers.filter(u => !u.isApproved).length}
                  </div>
                  <div className="text-sm text-gray-600">승인 대기</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-purple-600">
                    {filteredUsers.filter(u => u.role === 'branch_manager').length}
                  </div>
                  <div className="text-sm text-gray-600">지사장</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 사용자 테이블 */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>사용자 정보</TableHead>
                  <TableHead>소속</TableHead>
                  <TableHead>역할</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>가입일</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      로딩 중...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      사용자가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((userData) => (
                    <TableRow key={userData.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{userData.name}</div>
                          <div className="text-sm text-gray-500">{userData.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {userData.userSubjects.map((us, index) => (
                            <div key={index} className="flex items-center gap-1 text-sm">
                              <Badge variant="outline" className="text-xs">
                                {us.subject.name}
                              </Badge>
                              <span className="text-gray-500">/</span>
                              <Badge variant="outline" className="text-xs">
                                {us.branch.name}
                              </Badge>
                              {us.academy && (
                                <>
                                  <span className="text-gray-500">/</span>
                                  <Badge variant="outline" className="text-xs">
                                    {us.academy.name}
                                  </Badge>
                                </>
                              )}
                              {us.isBranchManager && (
                                <Badge className="text-xs ml-1 bg-purple-100 text-purple-800">
                                  지사장
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getRoleBadge(userData.role)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(userData.isApproved)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-500">
                          {new Date(userData.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {!userData.isApproved && (
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 hover:text-green-700"
                              onClick={() => handleApprove(userData.id)}
                            >
                              승인
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleReject(userData.id)}
                            >
                              거부
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}