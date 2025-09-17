export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">이용약관</h1>

        <div className="bg-white rounded-lg shadow p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">제 1조 (목적)</h2>
            <p className="text-gray-600 leading-relaxed">
              이 약관은 미래애드(이하 "회사"라 합니다)가 제공하는 마케팅 플랫폼 서비스(이하 "서비스"라 합니다)의
              이용과 관련하여 회사와 회원과의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">제 2조 (정의)</h2>
            <p className="text-gray-600 leading-relaxed">이 약관에서 사용하는 용어의 정의는 다음과 같습니다.</p>
            <ul className="list-disc list-inside mt-2 text-gray-600 space-y-2">
              <li>"서비스"란 회사가 제공하는 모든 마케팅 관련 플랫폼 서비스를 의미합니다.</li>
              <li>"회원"이란 회사의 서비스에 접속하여 이 약관에 따라 회사와 이용계약을 체결하고 회사가 제공하는 서비스를 이용하는 고객을 말합니다.</li>
              <li>"아이디(ID)"란 회원의 식별과 서비스 이용을 위하여 회원이 정하고 회사가 승인하는 문자와 숫자의 조합을 의미합니다.</li>
              <li>"비밀번호"란 회원이 부여 받은 아이디와 일치되는 회원임을 확인하고 비밀보호를 위해 회원 자신이 정한 문자 또는 숫자의 조합을 의미합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">제 3조 (약관의 게시와 개정)</h2>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>회사는 이 약관의 내용을 회원이 쉽게 알 수 있도록 서비스 초기 화면에 게시합니다.</li>
              <li>회사는 전자상거래 등에서의 소비자보호에 관한 법률, 약관의 규제에 관한 법률 등 관련법을 위배하지 않는 범위에서 이 약관을 개정할 수 있습니다.</li>
              <li>회사가 약관을 개정할 경우에는 적용일자 및 개정사유를 명시하여 현행약관과 함께 제1항의 방식에 따라 그 개정약관의 적용일자 7일 전부터 적용일자 전일까지 공지합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">제 4조 (서비스의 제공 및 변경)</h2>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>회사는 다음과 같은 업무를 수행합니다:
                <ul className="list-circle list-inside mt-2 ml-6 space-y-1">
                  <li>스마트플레이스 순위 추적 서비스</li>
                  <li>블로그 순위 분석 서비스</li>
                  <li>네이버 광고 관리 서비스</li>
                  <li>키워드 분석 서비스</li>
                  <li>기타 회사가 정하는 서비스</li>
                </ul>
              </li>
              <li>회사는 서비스의 내용을 기술적 사양의 변경 등의 이유로 변경할 수 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">제 5조 (서비스의 중단)</h2>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>회사는 컴퓨터 등 정보통신설비의 보수점검, 교체 및 고장, 통신두절 또는 운영상 상당한 이유가 있는 경우 서비스의 제공을 일시적으로 중단할 수 있습니다.</li>
              <li>회사는 제1항의 사유로 서비스의 제공이 일시적으로 중단됨으로 인하여 이용자 또는 제3자가 입은 손해에 대하여 배상합니다. 단, 회사가 고의 또는 중대한 과실이 없음을 입증하는 경우에는 그러하지 아니합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">제 6조 (회원가입)</h2>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 이 약관에 동의한다는 의사표시를 함으로서 회원가입을 신청합니다.</li>
              <li>회사는 제1항과 같이 회원으로 가입할 것을 신청한 이용자 중 다음 각 호에 해당하지 않는 한 회원으로 등록합니다:
                <ul className="list-circle list-inside mt-2 ml-6 space-y-1">
                  <li>등록 내용에 허위, 기재누락, 오기가 있는 경우</li>
                  <li>기타 회원으로 등록하는 것이 회사의 기술상 현저히 지장이 있다고 판단되는 경우</li>
                </ul>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">제 7조 (회원 탈퇴 및 자격 상실 등)</h2>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>회원은 회사에 언제든지 탈퇴를 요청할 수 있으며 회사는 즉시 회원탈퇴를 처리합니다.</li>
              <li>회원이 다음 각 호의 사유에 해당하는 경우, 회사는 회원자격을 제한 및 정지시킬 수 있습니다:
                <ul className="list-circle list-inside mt-2 ml-6 space-y-1">
                  <li>가입 신청 시에 허위 내용을 등록한 경우</li>
                  <li>다른 사람의 서비스 이용을 방해하거나 그 정보를 도용하는 등 전자상거래 질서를 위협하는 경우</li>
                  <li>회사가 제공하는 서비스를 이용하여 법령 또는 이 약관이 금지하거나 공서양속에 반하는 행위를 하는 경우</li>
                </ul>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">제 8조 (개인정보보호)</h2>
            <p className="text-gray-600 leading-relaxed">
              회사는 이용자의 개인정보 수집시 서비스제공을 위하여 필요한 범위에서 최소한의 개인정보를 수집합니다.
              회사는 이용자의 개인정보를 수집·이용하는 때에는 당해 이용자에게 그 목적을 고지하고 동의를 받습니다.
              회사는 수집된 개인정보를 목적 외의 용도로 이용할 수 없으며, 새로운 이용목적이 발생한 경우 또는 제3자에게
              제공하는 경우에는 이용·제공단계에서 당해 이용자에게 그 목적을 고지하고 동의를 받습니다.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">제 9조 (회원의 ID 및 비밀번호에 대한 의무)</h2>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>ID와 비밀번호에 관한 관리책임은 회원에게 있습니다.</li>
              <li>회원은 자신의 ID 및 비밀번호를 제3자에게 이용하게 해서는 안됩니다.</li>
              <li>회원이 자신의 ID 및 비밀번호를 도용당하거나 제3자가 사용하고 있음을 인지한 경우에는 바로 회사에 통보하고 회사의 안내가 있는 경우에는 그에 따라야 합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">제 10조 (면책조항)</h2>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.</li>
              <li>회사는 회원의 귀책사유로 인한 서비스 이용의 장애에 대하여는 책임을 지지 않습니다.</li>
              <li>회사는 회원이 서비스를 이용하여 기대하는 수익을 상실한 것에 대하여 책임을 지지 않으며, 그 밖의 서비스를 통하여 얻은 자료로 인한 손해에 관하여 책임을 지지 않습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">제 11조 (분쟁해결)</h2>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>회사는 이용자가 제기하는 정당한 의견이나 불만을 반영하고 그 피해를 보상처리하기 위하여 피해보상처리기구를 설치·운영합니다.</li>
              <li>회사는 이용자로부터 제출되는 불만사항 및 의견은 우선적으로 그 사항을 처리합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">제 12조 (재판권 및 준거법)</h2>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>회사와 이용자 간에 발생한 전자상거래 분쟁에 관한 소송은 제소 당시 이용자의 주소에 의하고, 주소가 없는 경우에는 거소를 관할하는 지방법원의 전속관할로 합니다.</li>
              <li>회사와 이용자 간에 제기된 전자상거래 소송에는 한국법을 적용합니다.</li>
            </ul>
          </section>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              공고일자: 2025년 1월 1일<br/>
              시행일자: 2025년 1월 1일
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}