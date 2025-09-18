'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { Search, Building, Users, Phone, MapPin, TrendingUp, School } from 'lucide-react'

interface Academy {
  id: number
  name: string
  address: string
  phone: string
  branch: {
    id: number
    name: string
  }
  subject: {
    id: number
    name: string
  }
  userCount: number
  activeUsers: number
}

export default function BranchAcademiesPage() {
  const { user } = useAuth()
  const [academies, setAcademies] = useState<Academy[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchAcademies()
  }, [])

  const fetchAcademies = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/branch/academies', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setAcademies(data.academies)
      } else {
        toast.error('학원 목록을 불러오는데 실패했습니다.')
      }
    } catch (error) {
      toast.error('학원 목록을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 검색 필터링
  const filteredAcademies = academies.filter(academy =>
    academy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    academy.address.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // 통계 계산
  const stats = {
    totalAcademies: filteredAcademies.length,
    totalUsers: filteredAcademies.reduce((sum, a) => sum + a.userCount, 0),
    activeUsers: filteredAcademies.reduce((sum, a) => sum + a.activeUsers, 0),
    avgUsersPerAcademy: filteredAcademies.length > 0
      ? Math.round(filteredAcademies.reduce((sum, a) => sum + a.userCount, 0) / filteredAcademies.length)
      : 0
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold">학원 관리</h1>
        <p className="text-gray-600 mt-2">소속 학원들의 현황을 관리합니다.</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">전체 학원</p>
                <p className="text-2xl font-bold">{stats.totalAcademies}</p>
              </div>
              <Building className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">전체 사용자</p>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">활성 사용자</p>
                <p className="text-2xl font-bold">{stats.activeUsers}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">평균 사용자</p>
                <p className="text-2xl font-bold">{stats.avgUsersPerAcademy}</p>
              </div>
              <School className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 학원 목록 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>학원 목록</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
              <Input
                placeholder="학원명 또는 주소로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>학원 정보</TableHead>
                  <TableHead>과목/지사</TableHead>
                  <TableHead>연락처</TableHead>
                  <TableHead>사용자 현황</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      로딩 중...
                    </TableCell>
                  </TableRow>
                ) : filteredAcademies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      학원이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAcademies.map((academy) => (
                    <TableRow key={academy.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{academy.name}</div>
                          <div className="flex items-center text-sm text-gray-500">
                            <MapPin className="h-3 w-3 mr-1" />
                            {academy.address}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="outline">{academy.subject.name}</Badge>
                          <div className="text-sm text-gray-500">{academy.branch.name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Phone className="h-3 w-3 mr-1" />
                          {academy.phone}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">
                            전체: <span className="font-medium">{academy.userCount}명</span>
                          </div>
                          <div className="text-sm text-green-600">
                            활성: <span className="font-medium">{academy.activeUsers}명</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // TODO: 학원 상세 페이지로 이동
                            toast.info('학원 상세 페이지는 준비 중입니다.')
                          }}
                        >
                          상세보기
                        </Button>
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