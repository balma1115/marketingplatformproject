export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">개인정보처리방침</h1>

        <div className="bg-white rounded-lg shadow p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">1. 개인정보의 수집 및 이용목적</h2>
            <p className="text-gray-600 leading-relaxed">
              미래애드는 수집한 개인정보를 다음의 목적을 위해 활용합니다.
            </p>
            <ul className="list-disc list-inside mt-2 text-gray-600 space-y-1">
              <li>서비스 제공 및 계약 이행</li>
              <li>회원 관리 및 본인 확인</li>
              <li>마케팅 및 광고 활용</li>
              <li>서비스 개선 및 신규 서비스 개발</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">2. 수집하는 개인정보 항목</h2>
            <p className="text-gray-600 leading-relaxed">
              회사는 회원가입, 상담, 서비스 신청 등을 위해 아래와 같은 개인정보를 수집하고 있습니다.
            </p>
            <ul className="list-disc list-inside mt-2 text-gray-600 space-y-1">
              <li>필수항목: 이름, 이메일, 비밀번호, 연락처</li>
              <li>선택항목: 학원명, 주소, 사업자등록번호</li>
              <li>자동수집항목: IP주소, 쿠키, 방문일시, 서비스 이용 기록</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">3. 개인정보의 보유 및 이용기간</h2>
            <p className="text-gray-600 leading-relaxed">
              회사는 개인정보 수집 및 이용목적이 달성된 후에는 예외 없이 해당 정보를 지체 없이 파기합니다.
              단, 관련 법령에 의거하여 보존할 필요가 있는 경우 회사는 아래와 같이 관련 법령에서 정한 일정한 기간 동안 회원정보를 보관합니다.
            </p>
            <ul className="list-disc list-inside mt-2 text-gray-600 space-y-1">
              <li>계약 또는 청약철회 등에 관한 기록: 5년</li>
              <li>대금결제 및 재화 등의 공급에 관한 기록: 5년</li>
              <li>소비자의 불만 또는 분쟁처리에 관한 기록: 3년</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">4. 개인정보의 파기</h2>
            <p className="text-gray-600 leading-relaxed">
              회사는 원칙적으로 개인정보 처리목적이 달성된 경우에는 지체없이 해당 개인정보를 파기합니다.
              파기의 절차, 기한 및 방법은 다음과 같습니다.
            </p>
            <ul className="list-disc list-inside mt-2 text-gray-600 space-y-1">
              <li>파기절차: 이용자가 입력한 정보는 목적 달성 후 별도의 DB에 옮겨져 내부 방침 및 기타 관련 법령에 따라 일정기간 저장된 후 혹은 즉시 파기됩니다.</li>
              <li>파기방법: 전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">5. 문의처</h2>
            <p className="text-gray-600 leading-relaxed">
              개인정보보호 관련 문의사항이 있으시면 아래로 연락주시기 바랍니다.
            </p>
            <div className="mt-2 text-gray-600">
              <p>• 이메일: privacy@miraenad.com</p>
              <p>• 전화: 02-1234-5678</p>
            </div>
          </section>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              시행일: 2025년 1월 1일
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}